/**
 * FreePik API Client
 *
 * Handles image generation, video generation, and music generation
 * with async polling pattern (POST → task_id → poll → result).
 */

const FREEPIK_BASE = "https://api.freepik.com";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max per task

export interface FreePikTaskResult {
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
  "nano-banana-pro": "/v1/ai/text-to-image/nano-banana-pro",
  "flux-2-pro": "/v1/ai/text-to-image/flux-2-pro",
  "flux-2-turbo": "/v1/ai/text-to-image/flux-2-turbo",
  "flux-pro-v1-1": "/v1/ai/text-to-image/flux-pro-v1-1",
  "seedream-v4-5": "/v1/ai/text-to-image/seedream-v4-5",
};

/**
 * Models that use the Mystic-style API (aspect_ratio + resolution)
 * vs standard API (width + height).
 */
const MYSTIC_STYLE_MODELS = new Set(["mystic"]);

/**
 * Map aspect ratios to Mystic's named aspect ratio values.
 */
const MYSTIC_ASPECT_RATIOS: Record<string, string> = {
  "4:5": "social_post_4_5",
  "5:4": "social_5_4",
  "9:16": "social_story_9_16",
  "16:9": "widescreen_16_9",
  "1:1": "square_1_1",
  "2:3": "portrait_2_3",
  "3:2": "standard_3_2",
  "3:4": "traditional_3_4",
  "4:3": "classic_4_3",
};

/**
 * Video generation model endpoint mapping.
 * POST goes to the -pro/-std path, but GET polling uses the base model path.
 * E.g., POST to /kling-o1-pro, poll at /kling-o1/{task-id}
 */
const VIDEO_MODEL_POST_ENDPOINTS: Record<string, string> = {
  "kling-o1-pro": "/v1/ai/image-to-video/kling-o1-pro",
  "kling-o1-std": "/v1/ai/image-to-video/kling-o1-std",
  "kling-elements-pro": "/v1/ai/image-to-video/kling-elements-pro",
  "kling-elements-std": "/v1/ai/image-to-video/kling-elements-std",
};

const VIDEO_MODEL_POLL_ENDPOINTS: Record<string, string> = {
  "kling-o1-pro": "/v1/ai/image-to-video/kling-o1",
  "kling-o1-std": "/v1/ai/image-to-video/kling-o1",
  "kling-elements-pro": "/v1/ai/image-to-video/kling-elements",
  "kling-elements-std": "/v1/ai/image-to-video/kling-elements",
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
 * Compute the aspect ratio string from width and height.
 */
function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
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
        // Mystic format: data.generated[0]
        (Array.isArray(data.data?.generated) && data.data.generated[0]) ||
        // Standard format: data.result[0].url or data.data.result[0].url
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
  const isMysticStyle = MYSTIC_STYLE_MODELS.has(model);

  let body: Record<string, unknown>;

  if (isMysticStyle) {
    // Mystic uses named aspect ratios + resolution quality level
    const ratio = getAspectRatio(width, height);
    const mysticRatio = MYSTIC_ASPECT_RATIOS[ratio] || "square_1_1";

    body = {
      prompt,
      resolution: "2k",
      aspect_ratio: mysticRatio,
      num_images: 1,
    };
  } else {
    // Standard models use width/height directly
    body = {
      prompt,
      width,
      height,
      num_images: 1,
    };
  }

  const response = await freepikFetch(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // Some models return results immediately (e.g., in data.data.images or data.data[0])
  const immediateUrl =
    (Array.isArray(data.data?.generated) && data.data.generated[0]) ||
    data.data?.result?.[0]?.url ||
    data.data?.[0]?.url ||
    data.result?.[0]?.url;

  if (immediateUrl) {
    return { taskId: data.data?.task_id || "immediate", status: "completed", resultUrl: immediateUrl };
  }

  // Async models return a task_id to poll
  const taskId = data.data?.task_id || data.task_id || data.id;
  if (!taskId) {
    throw new Error(`No task ID or immediate result from FreePik (model: ${model})`);
  }

  return pollTask(apiKey, endpoint, taskId);
}

/**
 * Generate a video from an image using the specified model.
 * Uses `first_frame` (not `image_url`) per FreePik's verified API format.
 */
export async function generateVideo(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl: string
): Promise<FreePikTaskResult> {
  const postEndpoint = VIDEO_MODEL_POST_ENDPOINTS[model] || VIDEO_MODEL_POST_ENDPOINTS["kling-o1-pro"];
  const pollEndpoint = VIDEO_MODEL_POLL_ENDPOINTS[model] || VIDEO_MODEL_POLL_ENDPOINTS["kling-o1-pro"];

  const response = await freepikFetch(apiKey, postEndpoint, {
    method: "POST",
    body: JSON.stringify({
      prompt,
      first_frame: imageUrl,
    }),
  });

  const data = await response.json();
  const taskId = data.data?.task_id || data.task_id || data.id;

  if (!taskId) {
    throw new Error(`No task ID from FreePik video generation (model: ${model})`);
  }

  return pollTask(apiKey, pollEndpoint, taskId);
}

/**
 * Generate AI music from a text prompt.
 * Uses `music_length_seconds` (not `duration`) per FreePik's verified API format.
 */
export async function generateMusic(
  apiKey: string,
  prompt: string,
  durationSeconds: number = 15
): Promise<FreePikTaskResult> {
  const endpoint = "/v1/ai/music-generation";

  const response = await freepikFetch(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify({
      prompt,
      music_length_seconds: durationSeconds,
    }),
  });

  const data = await response.json();
  const taskId = data.data?.task_id || data.task_id || data.id;

  if (!taskId) {
    const immediateUrl = data.data?.audio?.url || data.audio?.url;
    if (immediateUrl) {
      return { taskId: "immediate", status: "completed", resultUrl: immediateUrl };
    }
    throw new Error("No task ID from FreePik music generation");
  }

  return pollTask(apiKey, endpoint, taskId);
}
