import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return badRequest("API key is required");
    }

    if (!apiKey.startsWith("sk_")) {
      return badRequest("Invalid API key format");
    }

    const { default: Late } = await import("@getlatedev/node");
    const late = new Late({ apiKey });
    const { data, error } = await late.usage.getUsageStats();

    if (error || !data) {
      return unauthorized("Invalid API key");
    }

    return NextResponse.json({ data });
  } catch (err) {
    return serverError(err, { action: "validateApiKey" });
  }
}
