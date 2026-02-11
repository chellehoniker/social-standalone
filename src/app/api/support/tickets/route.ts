import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRequestBody, CreateTicketSchema } from "@/lib/validations";
import { serverError } from "@/lib/api/errors";
import type { SupportTicket } from "@/lib/supabase/types";

/**
 * GET /api/support/tickets
 * List the current user's support tickets (RLS enforced).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    const tickets = data as SupportTicket[];
    return NextResponse.json({ tickets });
  } catch (err) {
    return serverError(err, { action: "listTickets" });
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseRequestBody(request, CreateTicketSchema);
    if (!parsed.success) return parsed.response;

    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .insert({
        user_id: user.id,
        email: user.email!,
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 }
      );
    }

    const ticket = data as SupportTicket;
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return serverError(err, { action: "createTicket" });
  }
}
