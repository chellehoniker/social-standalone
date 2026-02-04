/**
 * Standardized API Error Responses
 *
 * Provides consistent error formatting across all API routes.
 */

import { NextResponse } from "next/server";

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Error codes enum for consistency
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_GATEWAY: "BAD_GATEWAY",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log error with context
 */
function logError(
  level: "warn" | "error",
  code: string,
  message: string,
  context?: Record<string, unknown>
): string {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  const logData = {
    timestamp,
    requestId,
    code,
    message,
    ...context,
  };

  if (level === "error") {
    console.error(`[API Error] ${JSON.stringify(logData)}`);
  } else {
    console.warn(`[API Warning] ${JSON.stringify(logData)}`);
  }

  return requestId;
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  status: number,
  code: string,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    context?: Record<string, unknown>;
    logLevel?: "warn" | "error";
  }
): NextResponse<ApiErrorResponse> {
  const logLevel = options?.logLevel ?? (status >= 500 ? "error" : "warn");
  const requestId = logError(logLevel, code, message, options?.context);

  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: options?.details,
        requestId,
      },
    },
    { status }
  );
}

/**
 * 400 Bad Request - validation errors, missing parameters
 */
export function badRequest(
  message: string = "Invalid request",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(400, ErrorCode.VALIDATION_ERROR, message, {
    details,
    logLevel: "warn",
  });
}

/**
 * 401 Unauthorized - missing or invalid authentication
 */
export function unauthorized(
  message: string = "Authentication required"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(401, ErrorCode.UNAUTHORIZED, message, {
    logLevel: "warn",
  });
}

/**
 * 403 Forbidden - authenticated but not allowed
 */
export function forbidden(
  message: string = "Access denied"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(403, ErrorCode.FORBIDDEN, message, {
    logLevel: "warn",
  });
}

/**
 * 404 Not Found - resource doesn't exist
 */
export function notFound(
  resource: string = "Resource"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    404,
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    { logLevel: "warn" }
  );
}

/**
 * 409 Conflict - resource already exists or state conflict
 */
export function conflict(
  message: string = "Resource conflict"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(409, ErrorCode.CONFLICT, message, {
    logLevel: "warn",
  });
}

/**
 * 429 Rate Limited
 */
export function rateLimited(
  message: string = "Too many requests"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(429, ErrorCode.RATE_LIMITED, message, {
    logLevel: "warn",
  });
}

/**
 * 500 Internal Server Error - unexpected errors
 */
export function serverError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return createErrorResponse(
    500,
    ErrorCode.INTERNAL_ERROR,
    "Internal server error",
    {
      context: {
        ...context,
        originalError: errorMessage,
      },
      logLevel: "error",
    }
  );
}

/**
 * 502 Bad Gateway - upstream service error
 */
export function badGateway(
  service: string,
  error?: unknown
): NextResponse<ApiErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return createErrorResponse(
    502,
    ErrorCode.BAD_GATEWAY,
    `Failed to connect to ${service}`,
    {
      context: { service, error: errorMessage },
      logLevel: "error",
    }
  );
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailable(
  message: string = "Service temporarily unavailable"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(503, ErrorCode.SERVICE_UNAVAILABLE, message, {
    logLevel: "error",
  });
}
