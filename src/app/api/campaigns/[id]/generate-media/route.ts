import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { generateImage, generateVideo, generateMusic } from "@/lib/freepik/client";
import { compositeVideoWithAudio, concatenateVideos } from "@/lib/freepik/composite";
import { PLATFORM_IMAGE_SIZES, getDefaultSizeKey } from "@/lib/ai/platform-sizes";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email/send";
import { mediaGenerationCompleteEmail } from "@/lib/email/templates";

/**
 * In-memory tracking of active generation jobs.
 * Maps campaignId → true while generation is running.
 */
const activeJobs = new Map<string, boolean>();

/**
 * POST /api/campaigns/[id]/generate-media
 * Kicks off media generation in the background and returns immediately.
 * Poll GET /api/campaigns/[id]/generate-media for progress.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id: campaignId } = await params;
  const userId = validation.user.id;

  if (activeJobs.get(campaignId)) {
    return NextResponse.json({ status: "already_running" });
  }

  try {
    const supabase = createServiceClient();

    const [campaignResult, settingsResult, postsResult] = await Promise.all([
      (supabase as any).from("campaigns").select("*").eq("id", campaignId).eq("user_id", userId).single(),
      (supabase as any).from("user_ai_settings").select("*").eq("id", userId).single(),
      (supabase as any).from("campaign_posts").select("*").eq("campaign_id", campaignId).order("day_number"),
    ]);

    if (!campaignResult.data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!settingsResult.data?.freepik_key_encrypted) return badRequest("FreePik API key not configured");

    const campaign = campaignResult.data;
    const settings = settingsResult.data;
    const posts = postsResult.data || [];
    const plan = campaign.post_plan || [];

    // Only process posts that need media (draft or failed — skip ready/scheduled)
    const postsToProcess = posts.filter((p: any) => p.status === "draft" || p.status === "failed" || p.status === "generating");
    for (const post of postsToProcess) {
      await (supabase as any)
        .from("campaign_posts")
        .update({ status: "generating", updated_at: new Date().toISOString() })
        .eq("id", post.id);
    }

    // Fire-and-forget: start processing in the background
    activeJobs.set(campaignId, true);
    processMediaInBackground(
      campaignId,
      userId,
      campaign,
      settings,
      postsToProcess,
      plan
    ).finally(() => activeJobs.delete(campaignId));

    return NextResponse.json({
      status: "started",
      total: posts.length,
    });
  } catch (err) {
    return serverError(err, { action: "generateMedia", campaignId });
  }
}

/**
 * Background processor — generates media for each post sequentially,
 * updating the DB after each one so the UI can poll for progress.
 */
async function processMediaInBackground(
  campaignId: string,
  userId: string,
  campaign: any,
  settings: any,
  posts: any[],
  plan: any[]
) {
  const supabase = createServiceClient();
  const freepikKey = decrypt(settings.freepik_key_encrypted);
  const imageModel = settings.freepik_image_model || "nano-banana-pro";
  const videoModel = settings.freepik_video_model || "kling-o1-pro";
  const stylePrompt = settings.image_style_prompt || "";

  const platforms = (campaign.platforms || []).map((p: any) =>
    typeof p === "string" ? p : p.platform
  );

  // Compute unique sizes needed
  const uniqueSizes = new Map<string, { width: number; height: number }>();
  for (const platform of platforms) {
    const sizeKey = getDefaultSizeKey(platform);
    const size = PLATFORM_IMAGE_SIZES[sizeKey];
    if (size) {
      const groupKey = `${size.width}x${size.height}`;
      if (!uniqueSizes.has(groupKey)) {
        uniqueSizes.set(groupKey, { width: size.width, height: size.height });
      }
    }
  }
  const defaultSize = uniqueSizes.values().next().value || { width: 1080, height: 1350 };

  const appendStyle = (prompt: string) =>
    stylePrompt ? `${prompt}. Style: ${stylePrompt}` : prompt;

  // Process posts one at a time (sequential to avoid rate limits)
  for (const post of posts) {
    const dayPlan = plan.find((d: any) => d.day === post.day_number);
    if (!dayPlan?.imagePrompt) {
      await updatePost(supabase, post.id, { status: "failed" });
      continue;
    }

    const mediaUrls: Record<string, string> = {};
    let musicUrl: string | null = null;

    try {
      if (dayPlan.contentType === "carousel") {
        // ── CAROUSEL ──
        const slidePrompts = dayPlan.imagePrompts?.length
          ? dayPlan.imagePrompts
          : [dayPlan.imagePrompt];

        for (let i = 0; i < slidePrompts.length; i++) {
          try {
            const result = await generateImage(
              freepikKey, imageModel,
              appendStyle(slidePrompts[i]),
              defaultSize.width, defaultSize.height
            );
            if (result.status === "completed" && result.resultUrl) {
              // Re-upload to Late CDN so the URL doesn't expire
              const permanentUrl = await reuploadToLateCdn(result.resultUrl, `campaign_day${post.day_number}_slide${i}_${Date.now()}.png`, "image/png");
              mediaUrls[`slide_${i}`] = permanentUrl || result.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Carousel slide ${i} day ${post.day_number}:`, err);
          }
        }

      } else if (dayPlan.contentType === "video") {
        // ── VIDEO ──
        // Step 1: Still image
        try {
          const stillResult = await generateImage(
            freepikKey, imageModel,
            appendStyle(dayPlan.imagePrompt),
            defaultSize.width, defaultSize.height
          );
          if (stillResult.status === "completed" && stillResult.resultUrl) {
            // Re-upload still to Late CDN so the URL doesn't expire
            const permanentStillUrl = await reuploadToLateCdn(stillResult.resultUrl, `campaign_day${post.day_number}_still_${Date.now()}.png`, "image/png");
            mediaUrls["video_still"] = permanentStillUrl || stillResult.resultUrl;

            // Step 2: Generate video clip(s)
            // For >10s, chain multiple 10s clips
            const totalDuration = dayPlan.videoDuration || 5;
            const clipDuration: 5 | 10 = totalDuration >= 10 ? 10 : 5;
            const clipCount = Math.max(1, Math.ceil(totalDuration / clipDuration));
            const videoPrompt = dayPlan.videoPrompt || `Gentle camera movement, ${dayPlan.theme}`;

            try {
              if (clipCount === 1) {
                // Single clip
                const videoResult = await generateVideo(
                  freepikKey, videoModel, videoPrompt, stillResult.resultUrl, clipDuration
                );
                if (videoResult.status === "completed" && videoResult.resultUrl) {
                  const permanentVideoUrl = await reuploadToLateCdn(videoResult.resultUrl, `campaign_day${post.day_number}_video_${Date.now()}.mp4`, "video/mp4");
                  mediaUrls["video"] = permanentVideoUrl || videoResult.resultUrl;
                }
              } else {
                // Multi-clip: generate each, then concatenate with FFmpeg
                const clipUrls: string[] = [];
                for (let c = 0; c < clipCount; c++) {
                  const clipPrompt = c === 0 ? videoPrompt : `${videoPrompt} (continuation, scene ${c + 1})`;
                  const clipResult = await generateVideo(
                    freepikKey, videoModel, clipPrompt, stillResult.resultUrl, clipDuration
                  );
                  if (clipResult.status === "completed" && clipResult.resultUrl) {
                    clipUrls.push(clipResult.resultUrl);
                  }
                }

                if (clipUrls.length > 1) {
                  // Concatenate clips with FFmpeg
                  console.log(`[Media] Concatenating ${clipUrls.length} clips for day ${post.day_number}...`);
                  const concatBuffer = await concatenateVideos(clipUrls);
                  const late = await getLateClient();
                  const { data: presignData } = await late.media.getMediaPresignedUrl({
                    body: { filename: `campaign_concat_day${post.day_number}_${Date.now()}.mp4`, contentType: "video/mp4", size: concatBuffer.length },
                  });
                  if (presignData?.uploadUrl && presignData?.publicUrl) {
                    const uploadRes = await fetch(presignData.uploadUrl, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: new Uint8Array(concatBuffer) });
                    if (uploadRes.ok) {
                      mediaUrls["video"] = presignData.publicUrl;
                    } else if (clipUrls[0]) {
                      const fallbackUrl = await reuploadToLateCdn(clipUrls[0], `campaign_day${post.day_number}_video_${Date.now()}.mp4`, "video/mp4");
                      mediaUrls["video"] = fallbackUrl || clipUrls[0];
                    }
                  }
                } else if (clipUrls.length === 1) {
                  const permanentClipUrl = await reuploadToLateCdn(clipUrls[0], `campaign_day${post.day_number}_video_${Date.now()}.mp4`, "video/mp4");
                  mediaUrls["video"] = permanentClipUrl || clipUrls[0];
                }
              }
            } catch (err) {
              console.error(`[Media] Video gen day ${post.day_number}:`, err);
            }
          }
        } catch (err) {
          console.error(`[Media] Video still day ${post.day_number}:`, err);
        }

        // Step 3: Music (if enabled — default true)
        const includeMusic = dayPlan.includeMusic !== false;
        if (includeMusic && dayPlan.musicPrompt) {
          try {
            const musicDuration = Math.max(15, dayPlan.videoDuration || 15);
            const musicResult = await generateMusic(freepikKey, dayPlan.musicPrompt, musicDuration);
            if (musicResult.status === "completed" && musicResult.resultUrl) {
              const permanentMusicUrl = await reuploadToLateCdn(musicResult.resultUrl, `campaign_day${post.day_number}_music_${Date.now()}.mp3`, "audio/mpeg");
              musicUrl = permanentMusicUrl || musicResult.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Music day ${post.day_number}:`, err);
          }
        }

        // Step 4: Composite video + music into single file
        if (mediaUrls["video"] && musicUrl) {
          try {
            console.log(`[Media] Compositing video+audio for day ${post.day_number}...`);
            const compositeBuffer = await compositeVideoWithAudio(mediaUrls["video"], musicUrl);

            // Upload composite via Late media presign
            const late = await getLateClient();
            const { data: presignData } = await late.media.getMediaPresignedUrl({
              body: {
                filename: `campaign_day${post.day_number}_${Date.now()}.mp4`,
                contentType: "video/mp4",
                size: compositeBuffer.length,
              },
            });

            if (presignData?.uploadUrl && presignData?.publicUrl) {
              const uploadRes = await fetch(presignData.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "video/mp4" },
                body: new Uint8Array(compositeBuffer),
              });

              if (uploadRes.ok) {
                mediaUrls["video"] = presignData.publicUrl;
                musicUrl = null; // Music is now embedded in the video
                console.log(`[Media] Composite uploaded for day ${post.day_number}`);
              }
            }
          } catch (err) {
            console.error(`[Media] Composite failed day ${post.day_number}:`, err);
            // Non-fatal: video and music remain as separate files
          }
        }

      } else {
        // ── SINGLE IMAGE ──
        const seenGroups = new Set<string>();
        for (const [groupKey, size] of uniqueSizes) {
          if (seenGroups.has(groupKey)) continue;
          seenGroups.add(groupKey);

          try {
            const result = await generateImage(
              freepikKey, imageModel,
              appendStyle(dayPlan.imagePrompt),
              size.width, size.height
            );
            if (result.status === "completed" && result.resultUrl) {
              // Re-upload to Late CDN so the URL doesn't expire
              const permanentUrl = await reuploadToLateCdn(result.resultUrl, `campaign_day${post.day_number}_${groupKey}_${Date.now()}.png`, "image/png");
              mediaUrls[groupKey] = permanentUrl || result.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Image ${groupKey} day ${post.day_number}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`[Media] Unexpected error day ${post.day_number}:`, err);
    }

    // Update this post immediately so the UI sees progress
    const hasMedia = Object.keys(mediaUrls).length > 0 || musicUrl;
    await updatePost(supabase, post.id, {
      media_urls: mediaUrls,
      music_url: musicUrl,
      status: hasMedia ? "ready" : "failed",
    });
  }

  // Send completion email to user
  try {
    const supabaseForEmail = createServiceClient();
    const { data: profile } = await (supabaseForEmail as any)
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profile?.email) {
      // Count final results
      let completed = 0;
      let failed = 0;
      const { data: finalPosts } = await (supabaseForEmail as any)
        .from("campaign_posts")
        .select("status")
        .eq("campaign_id", campaignId);

      for (const p of finalPosts || []) {
        if (p.status === "ready" || p.status === "scheduled") completed++;
        else if (p.status === "failed") failed++;
      }

      await sendEmail({
        to: profile.email,
        subject: `Your campaign media is ready: ${campaign.name}`,
        html: mediaGenerationCompleteEmail(campaign.name, campaignId, completed, failed),
      });
    }
  } catch (emailErr) {
    console.error(`[Media] Failed to send completion email for ${campaignId}:`, emailErr);
  }
}

/**
 * Re-upload a temporary URL (e.g. Freepik CDN) to Late's permanent CDN.
 * Returns the permanent URL, or null if upload fails (caller should fall back to original).
 */
async function reuploadToLateCdn(
  sourceUrl: string,
  filename: string,
  contentType: string
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());

    const late = await getLateClient();
    const { data: presignData } = await late.media.getMediaPresignedUrl({
      body: { filename, contentType, size: buffer.length },
    });

    if (!presignData?.uploadUrl || !presignData?.publicUrl) return null;

    const uploadRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(buffer),
    });

    return uploadRes.ok ? presignData.publicUrl : null;
  } catch (err) {
    console.error(`[Media] Re-upload to CDN failed for ${filename}:`, err);
    return null;
  }
}

async function updatePost(supabase: any, postId: string, data: Record<string, unknown>) {
  await supabase
    .from("campaign_posts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", postId);
}

/**
 * GET /api/campaigns/[id]/generate-media
 * Poll for media generation progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id: campaignId } = await params;

  try {
    const supabase = createServiceClient();
    const { data: posts } = await (supabase as any)
      .from("campaign_posts")
      .select("id, day_number, status, media_urls, music_url, updated_at")
      .eq("campaign_id", campaignId)
      .eq("user_id", validation.user.id)
      .order("day_number");

    const allPosts = posts || [];
    const isRunning = activeJobs.has(campaignId);

    // Auto-reset stale "generating" posts if no background job is running
    // This recovers from container restarts that killed in-flight jobs
    if (!isRunning) {
      const staleThreshold = Date.now() - 10 * 60 * 1000; // 10 minutes
      for (const post of allPosts) {
        if (post.status === "generating") {
          const updatedAt = new Date(post.updated_at || 0).getTime();
          if (updatedAt < staleThreshold || !post.updated_at) {
            await (supabase as any)
              .from("campaign_posts")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("id", post.id);
            post.status = "failed";
          }
        }
      }
    }

    const completed = allPosts.filter((p: any) => p.status === "ready" || p.status === "scheduled").length;
    const failed = allPosts.filter((p: any) => p.status === "failed").length;
    const generating = allPosts.filter((p: any) => p.status === "generating").length;

    return NextResponse.json({
      total: allPosts.length,
      completed,
      failed,
      inProgress: generating,
      isRunning,
      posts: allPosts,
    });
  } catch (err) {
    return serverError(err, { action: "getMediaStatus", campaignId });
  }
}
