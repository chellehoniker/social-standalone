import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

const MAX_FILE_SIZE = 100 * 1024; // 100KB
const ALLOWED_TYPES = [
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * POST /api/campaigns/upload-reference
 * Upload a TXT, MD, or DOCX file and return extracted text.
 * Body: multipart/form-data with a "file" field.
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return badRequest("No file uploaded");
    if (file.size > MAX_FILE_SIZE) return badRequest("File too large (max 100KB)");

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (file.name.endsWith(".docx") || file.type === ALLOWED_TYPES[2]) {
      // Parse DOCX
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.type === "text/plain" ||
      file.type === "text/markdown"
    ) {
      text = buffer.toString("utf-8");
    } else {
      return badRequest("Unsupported file type. Upload a .txt, .md, or .docx file.");
    }

    // Trim to reasonable size (roughly 25K words max)
    const trimmed = text.slice(0, 100000);

    return NextResponse.json({
      text: trimmed,
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      fileName: file.name,
    });
  } catch (err) {
    return serverError(err, { action: "uploadReference" });
  }
}
