/**
 * FFmpeg Video+Audio Compositing
 *
 * Downloads video and audio files, combines them with FFmpeg,
 * then uploads the result to Late's media storage.
 */

import { execFile } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const TMP_DIR = process.env.NODE_ENV === "production" ? "/app/tmp" : "/tmp";

/**
 * Download a URL to a local temp file.
 */
async function downloadToFile(url: string, ext: string): Promise<string> {
  const filePath = join(TMP_DIR, `${randomUUID()}${ext}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
  return filePath;
}

/**
 * Run FFmpeg to combine video and audio into a single file.
 */
function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`FFmpeg error: ${error.message}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Combine a video URL and audio URL into a single MP4 file.
 * Returns the raw file buffer of the combined video.
 *
 * FFmpeg command: overlay audio onto video, use shortest stream duration,
 * re-encode audio to AAC for maximum compatibility.
 */
export async function compositeVideoWithAudio(
  videoUrl: string,
  audioUrl: string
): Promise<Buffer> {
  let videoPath: string | null = null;
  let audioPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Download both files
    videoPath = await downloadToFile(videoUrl, ".mp4");
    audioPath = await downloadToFile(audioUrl, ".wav");
    outputPath = join(TMP_DIR, `${randomUUID()}_composite.mp4`);

    // Combine with FFmpeg
    // -y: overwrite output, -shortest: stop at shortest stream
    // -c:v copy: don't re-encode video (fast), -c:a aac: encode audio to AAC
    await runFFmpeg([
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      outputPath,
    ]);

    // Read the output file
    const result = await readFile(outputPath);
    return result;
  } finally {
    // Clean up temp files
    const cleanup = async (path: string | null) => {
      if (path) try { await unlink(path); } catch { /* ignore */ }
    };
    await Promise.all([cleanup(videoPath), cleanup(audioPath), cleanup(outputPath)]);
  }
}

/**
 * Concatenate multiple video URLs into a single MP4 using FFmpeg.
 * Downloads each clip, writes a concat list, and merges them.
 * Returns the raw file buffer of the concatenated video.
 */
export async function concatenateVideos(
  videoUrls: string[]
): Promise<Buffer> {
  if (videoUrls.length === 0) throw new Error("No videos to concatenate");
  if (videoUrls.length === 1) {
    // Single video — just download and return
    const response = await fetch(videoUrls[0]);
    return Buffer.from(await response.arrayBuffer());
  }

  const clipPaths: string[] = [];
  let concatListPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Download all clips
    for (let i = 0; i < videoUrls.length; i++) {
      const path = await downloadToFile(videoUrls[i], `.mp4`);
      clipPaths.push(path);
    }

    // Write FFmpeg concat list file
    concatListPath = join(TMP_DIR, `${randomUUID()}_concat.txt`);
    const concatContent = clipPaths.map((p) => `file '${p}'`).join("\n");
    await writeFile(concatListPath, concatContent);

    // Concatenate
    outputPath = join(TMP_DIR, `${randomUUID()}_concat_output.mp4`);
    await runFFmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    const cleanup = async (path: string | null) => {
      if (path) try { await unlink(path); } catch { /* ignore */ }
    };
    await Promise.all([
      ...clipPaths.map((p) => cleanup(p)),
      cleanup(concatListPath),
      cleanup(outputPath),
    ]);
  }
}

/**
 * Composite video+audio and upload the result to Late's media storage.
 * Returns the public URL of the combined video.
 */
export async function compositeAndUpload(
  videoUrl: string,
  audioUrl: string,
  lateApiKey: string,
  lateBaseUrl: string = "https://authorautomations.social/api/v1"
): Promise<string> {
  // Composite
  const compositeBuffer = await compositeVideoWithAudio(videoUrl, audioUrl);

  // Get presigned upload URL from our API
  const presignResponse = await fetch(`${lateBaseUrl}/media/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lateApiKey}`,
    },
    body: JSON.stringify({
      filename: `campaign_video_${Date.now()}.mp4`,
      contentType: "video/mp4",
      size: compositeBuffer.length,
    }),
  });

  if (!presignResponse.ok) {
    throw new Error(`Failed to get presigned URL: ${presignResponse.status}`);
  }

  const { uploadUrl, publicUrl } = await presignResponse.json();

  // Upload the composite video
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: new Uint8Array(compositeBuffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload composite video: ${uploadResponse.status}`);
  }

  return publicUrl;
}
