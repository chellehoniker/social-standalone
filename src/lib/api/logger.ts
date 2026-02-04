/**
 * Structured Logger
 *
 * Provides consistent logging across all API routes with context.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitize sensitive data from log entries
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "apiKey",
    "api_key",
    "token",
    "password",
    "secret",
    "authorization",
    "cookie",
    "stripe_customer_id",
    "stripeSecretKey",
    "supabaseServiceRoleKey",
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}

/**
 * Format and output a log entry
 */
function log(entry: LogEntry): void {
  const sanitizedEntry = entry.meta
    ? { ...entry, meta: sanitize(entry.meta) }
    : entry;

  const logString = JSON.stringify(sanitizedEntry);

  switch (entry.level) {
    case "error":
      console.error(`[API Error] ${logString}`);
      break;
    case "warn":
      console.warn(`[API Warning] ${logString}`);
      break;
    case "info":
      console.info(`[API Info] ${logString}`);
      break;
  }
}

/**
 * Log an info message
 */
export function logInfo(
  context: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  log({
    timestamp: new Date().toISOString(),
    level: "info",
    context,
    message,
    meta,
  });
}

/**
 * Log a warning message
 */
export function logWarning(
  context: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  log({
    timestamp: new Date().toISOString(),
    level: "warn",
    context,
    message,
    meta,
  });
}

/**
 * Log an error with details
 */
export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): string {
  const requestId = generateRequestId();
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack =
    error instanceof Error ? error.stack : undefined;

  log({
    timestamp: new Date().toISOString(),
    level: "error",
    context,
    message: errorMessage,
    requestId,
    meta: {
      ...meta,
      stack: errorStack,
    },
  });

  return requestId;
}

/**
 * Create a logger instance with a fixed context
 */
export function createLogger(context: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      logInfo(context, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logWarning(context, message, meta),
    error: (error: unknown, meta?: Record<string, unknown>) =>
      logError(context, error, meta),
  };
}
