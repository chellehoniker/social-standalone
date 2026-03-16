import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api/errors";
import { z } from "zod/v4";

const UpdateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  admin_notes: z.string().max(5000).optional(),
});

/**
 * GET /api/admin/tickets/[id]
 * Get a single ticket by ID (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return notFound("Ticket");
    }

    return NextResponse.json({ ticket: data });
  } catch (err) {
    return serverError(err, { action: "adminGetTicket", ticketId: id });
  }
}

/**
 * PATCH /api/admin/tickets/[id]
 * Update ticket status or admin notes (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return notFound("Ticket");
    }

    return NextResponse.json({ ticket: data });
  } catch (err) {
    return serverError(err, { action: "adminUpdateTicket", ticketId: id });
  }
}
