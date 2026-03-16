/**
 * FreePik API Client
 *
 * Handles image generation, video generation, and music generation
 * with async polling pattern (POST → task_id → poll → result).
 */

const FREEPIK_BASE = "https://api.freepik.com";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max per task

interface FreePikTaskResult {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: string;
}

/**
 * Image generation model endpoint mapping.
 */
const IMAGE_MODEL_ENDPOINTS: Record<string, string> = {
  mystic: "/v1/ai/mystic",
  "flux-2-pro": "/v1/ai/text-to-image/flux-2-pro",
  "flux-kontext-pro": "/v1/ai/text-to-image/flux-kontext-pro",
  "seedream-4": "/v1/ai/text-to-image/seedream-4",
  ideogram: "/v1/ai/text-to-image/ideogram",
};

/**
 * Video generation model endpoint mapping.
 */
const VIDEO_MODEL_ENDPOINTS: Record<string, string> = {
  "kling-o1-pro": "/v1/ai/image-to-video/kling-o1-pro",
  "kling-o1-std": "/v1/ai/image-to-video/kling-o1-std",
  "kling-elements-pro": "/v1/ai/image-to-video/kling-elements-pro",
  "kling-elements-std": "/v1/ai/image-to-video/kling-elements-std",
};

async function freepikFetch(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`${FREEPIK_BASE}${path}`, {
    ...options,
    headers: {
      "x-freepik-api-key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 429) {
    throw new FreePikRateLimitError("Rate limited by FreePik API");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`FreePik API error ${response.status}: ${text}`);
  }

  return response;
}

export class FreePikRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreePikRateLimitError";
  }
}

/**
 * Poll a FreePik task until completion or timeout.
 */
async function pollTask(
  apiKey: string,
  endpoint: string,
  taskId: string
): Promise<FreePikTaskResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const response = await freepikFetch(apiKey, `${endpoint}/${taskId}`, {
      method: "GET",
    });
    const data = await response.json();

    const status = data.status || data.data?.status;

    if (status === "completed" || status === "COMPLETED") {
      // Extract result URL from various response formats
      const resultUrl =
        data.data?.result?.[0]?.url ||
        data.data?.result?.url ||
        data.data?.video?.url ||
        data.data?.audio?.url ||
        data.result?.[0]?.url ||
        data.result?.url ||
        data.url;

      return { taskId, status: "completed", resultUrl };
    }

    if (status === "failed" || status === "FAILED" || status === "error") {
      return {
        taskId,
        status: "failed",
        error: data.error || data.message || "Task failed",
      };
    }

    // Still processing — continue polling
  }

  return { taskId, status: "failed", error: "Task timed out" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate an image using the specified model.
 */
export async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  width: number,
  height: number
): Promise<FreePikTaskResult> {
  const endpoint = IMAGE_MODEL_ENDPOINTS[model] || IMAGE_MODEL_ENDPOINTS.mystic;

  const body: Record<string, unknown> = {
    prompt,
    width,
    height,
    num_images: 1,
  };

  // Mystic uses a different body format
  if (model === "mystic") {
    body.resolution = `${width}x${height}`;
    delete body.width;
    delete body.height;
  }

  const response = await freepikFetch(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // Some models return results immediately
  const immediateUrl =
    data.data?.result?.[0]?.url ||
    data.data?.[0]?.url ||
    data.result?.[0]?.url;

  if (immediateUrl) {
    return { taskId: data.task_id || "immediate", status: "completed", resultUrl: immediateUrl };
  }

  // Async models return a task_id to poll
  const taskId = data.task_id || data.data?.task_id || data.id;
  if (!taskId) {
    throw new Error("No task ID or immediate result from FreePik");
  }

  return pollTask(apiKey, endpoint, taskId);
}

/**
 * Generate a video from an image using the specified model.
 */
export async function generateVideo(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl: string
): Promise<FreePikTaskResult> {
  const endpoint = VIDEO_MODEL_ENDPOINTS[model] || VIDEO_MODEL_ENDPOINTS["kling-o1-pro"];

  const response = await freepikFetch(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
    }),
  });

  const data = await response.json();
  const taskId = data.task_id || data.data?.task_id || data.id;

  if (!taskId) {
    throw new Error("No task ID from FreePik video generation");
  }

  return pollTask(apiKey, endpoint, taskId);
}

/**
 * Generate AI music from a text prompt.
 */
export async function generateMusic(
  apiKey: string,
  prompt: string,
  durationSeconds: number = 30
): Promise<FreePikTaskResult> {
  const endpoint = "/v1/ai/music-generation";

  const response = await freepikFetch(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify({
      prompt,
      duration: durationSeconds,
    }),
  });

  const data = await response.json();
  const taskId = data.task_id || data.data?.task_id || data.id;

  if (!taskId) {
    // Some responses return result immediately
    const immediateUrl = data.data?.audio?.url || data.audio?.url;
    if (immediateUrl) {
      return { taskId: "immediate", status: "completed", resultUrl: immediateUrl };
    }
    throw new Error("No task ID from FreePik music generation");
  }

  return pollTask(apiKey, endpoint, taskId);
}
