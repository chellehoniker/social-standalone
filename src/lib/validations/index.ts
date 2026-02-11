/**
 * Validation Schemas
 *
 * Centralized Zod schemas for API request validation.
 */

export * from "./post";
export * from "./queue";
export * from "./media";
export * from "./stripe";
export * from "./support";

import { z } from "zod/v4";
import { badRequest } from "@/lib/api/errors";
import { NextResponse } from "next/server";

/**
 * Parse and validate request body with Zod schema
 * Returns either the validated data or an error response
 */
export async function parseRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return {
        success: false,
        response: badRequest("Validation failed", { errors }),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: badRequest("Invalid JSON body"),
    };
  }
}
