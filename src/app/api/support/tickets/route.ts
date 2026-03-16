import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRequestBody, CreateTicketSchema } from "@/lib/validations";
import { serverError } from "@/lib/api/errors";
import type { SupportTicket } from "@/lib/supabase/types";
import nodemailer from "nodemailer";

const ADMIN_EMAILS = [
  "grace@indieauthormagazine.com",
  "chelle@indieauthormagazine.com",
];
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://authorautomations.social";

/**
 * Send email notification to admins when a new ticket is created.
 * Uses Amazon SES via SMTP.
 */
async function notifyAdminOfTicket(ticket: SupportTicket) {
  const smtpUser = process.env.SES_SMTP_USER;
  const smtpPass = process.env.SES_SMTP_PASS;
  const smtpRegion = process.env.SES_SMTP_REGION || "us-east-1";

  if (!smtpUser || !smtpPass) {
    console.log(
      `[Support] New ticket from ${ticket.email}: [${ticket.category}] ${ticket.subject} — email skipped (SES credentials not set)`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: `email-smtp.${smtpRegion}.amazonaws.com`,
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: "Author Automations <notifications@authorautomations.com>",
    to: ADMIN_EMAILS.join(", "),
    subject: `[Support] ${ticket.category.toUpperCase()}: ${ticket.subject}`,
    html: `
      <h2>New Support Ticket</h2>
      <p><strong>From:</strong> ${ticket.email}</p>
      <p><strong>Category:</strong> ${ticket.category}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <hr />
      <p>${ticket.description.replace(/\n/g, "<br />")}</p>
      <hr />
      <p><a href="${APP_URL}/admin/tickets">View in Admin Panel</a></p>
    `,
  });
}

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

    // Send email notification to admin (fire-and-forget)
    notifyAdminOfTicket(ticket).catch((err) =>
      console.error("[Support] Failed to send admin notification:", err)
    );

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return serverError(err, { action: "createTicket" });
  }
}
