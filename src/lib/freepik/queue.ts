/**
 * FreePik Generation Queue
 *
 * Rate-limit-aware batch processor for image/video/music generation.
 * Processes tasks with configurable concurrency and exponential backoff
 * on rate limit errors.
 */

import {
  generateImage,
  generateVideo,
  generateMusic,
  FreePikRateLimitError,
} from "./client";

export interface GenerationTask {
  id: string;
  type: "image" | "video" | "music";
  prompt: string;
  width?: number;
  height?: number;
  imageUrl?: string; // for video (image-to-video)
  durationSeconds?: number; // for music
  model: string;
  deduplicationKey?: string; // shared key for same-size images
}

export interface GenerationResult {
  taskId: string;
  type: "image" | "video" | "music";
  status: "completed" | "failed";
  resultUrl?: string;
  error?: string;
}

export type ProgressCallback = (progress: {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  currentTask?: string;
}) => void;

const DEFAULT_CONCURRENCY = 2;
const INITIAL_BACKOFF_MS = 5000;
const MAX_BACKOFF_MS = 60000;
const MAX_RETRIES = 3;

/**
 * Process a batch of generation tasks with rate limiting and deduplication.
 */
export async function processGenerationQueue(
  apiKey: string,
  tasks: GenerationTask[],
  onProgress?: ProgressCallback,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<Map<string, GenerationResult>> {
  const results = new Map<string, GenerationResult>();
  const deduplicationCache = new Map<string, GenerationResult>();

  let completed = 0;
  let failed = 0;
  let inProgress = 0;

  const reportProgress = (currentTask?: string) => {
    onProgress?.({
      total: tasks.length,
      completed,
      failed,
      inProgress,
      currentTask,
    });
  };

  // Process tasks with concurrency limit
  const queue = [...tasks];
  const activePromises = new Set<Promise<void>>();

  const processNext = async (): Promise<void> => {
    while (queue.length > 0) {
      const task = queue.shift()!;

      // Check deduplication cache
      if (task.deduplicationKey && deduplicationCache.has(task.deduplicationKey)) {
        const cached = deduplicationCache.get(task.deduplicationKey)!;
        results.set(task.id, { ...cached, taskId: task.id });
        completed++;
        reportProgress();
        continue;
      }

      inProgress++;
      reportProgress(task.id);

      const result = await executeWithRetry(apiKey, task);

      // Cache for deduplication
      if (task.deduplicationKey && result.status === "completed") {
        deduplicationCache.set(task.deduplicationKey, result);
      }

      results.set(task.id, result);

      if (result.status === "completed") {
        completed++;
      } else {
        failed++;
      }
      inProgress--;
      reportProgress();
    }
  };

  // Launch concurrent workers
  for (let i = 0; i < concurrency; i++) {
    const promise = processNext();
    activePromises.add(promise);
    promise.finally(() => activePromises.delete(promise));
  }

  await Promise.all(activePromises);
  return results;
}

/**
 * Execute a single task with retry and backoff on rate limits.
 */
async function executeWithRetry(
  apiKey: string,
  task: GenerationTask,
  retries: number = MAX_RETRIES
): Promise<GenerationResult> {
  let backoff = INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let result;

      switch (task.type) {
        case "image":
          result = await generateImage(
            apiKey,
            task.model,
            task.prompt,
            task.width || 1080,
            task.height || 1080
          );
          break;

        case "video":
          if (!task.imageUrl) throw new Error("Video task requires imageUrl");
          result = await generateVideo(apiKey, task.model, task.prompt, task.imageUrl);
          break;

        case "music":
          result = await generateMusic(apiKey, task.prompt, task.durationSeconds || 30);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      return {
        taskId: task.id,
        type: task.type,
        status: result.status === "completed" ? "completed" : "failed",
        resultUrl: result.resultUrl,
        error: result.error,
      };
    } catch (error) {
      if (error instanceof FreePikRateLimitError && attempt < retries) {
        console.warn(
          `[FreePik Queue] Rate limited on task ${task.id}, backing off ${backoff}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        continue;
      }

      return {
        taskId: task.id,
        type: task.type,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    taskId: task.id,
    type: task.type,
    status: "failed",
    error: "Max retries exceeded",
  };
}
