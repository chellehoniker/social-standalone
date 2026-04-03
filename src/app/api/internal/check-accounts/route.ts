import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { sendUserAndAdminEmail } from "@/lib/email/send";
import {
  accountDisconnectUserEmail,
  accountDisconnectAdminEmail,
  type DisconnectedAccount,
} from "@/lib/email/templates";

/**
 * POST /api/internal/check-accounts
 * Checks account health across all users and sends disconnect notifications.
 * Secured by INTERNAL_API_SECRET header — called by n8n on a schedule.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const late = await getLateClient();

    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, email, getlate_profile_id")
      .not("getlate_profile_id", "is", null);

    if (!profiles?.length) {
      return NextResponse.json({ checked: 0, notified: 0 });
    }

    let totalNotified = 0;

    for (const profile of profiles) {
      try {
        const { data: healthData } = await late.accounts.getAllAccountsHealth({
          query: { profileId: profile.getlate_profile_id },
        });

        const accounts = healthData?.accounts || [];
        const disconnected = accounts.filter(
          (a: any) => a.status === "needs_reconnect"
        );

        if (disconnected.length === 0) {
          // Mark any existing notifications as resolved
          await (supabase as any)
            .from("account_health_notifications")
            .update({ resolved_at: new Date().toISOString() })
            .eq("user_id", profile.id)
            .is("resolved_at", null);
          continue;
        }

        // Check which disconnections we haven't notified about yet
        const newDisconnects: DisconnectedAccount[] = [];

        for (const account of disconnected) {
          const { data: existing } = await (supabase as any)
            .from("account_health_notifications")
            .select("id")
            .eq("late_account_id", account._id || account.accountId)
            .eq("user_id", profile.id)
            .is("resolved_at", null)
            .maybeSingle();

          if (existing) continue;

          newDisconnects.push({
            accountId: account._id || account.accountId,
            platform: account.platform,
            displayName: account.displayName || account.username || account.platform,
          });

          await (supabase as any).from("account_health_notifications").insert({
            user_id: profile.id,
            late_account_id: account._id || account.accountId,
            platform: account.platform,
          });
        }

        if (newDisconnects.length === 0) continue;

        await sendUserAndAdminEmail({
          userEmail: profile.email,
          subject: `Action needed: ${newDisconnects.length} social account(s) disconnected`,
          userHtml: accountDisconnectUserEmail(newDisconnects),
          adminHtml: accountDisconnectAdminEmail(profile.email, newDisconnects),
        });

        totalNotified++;
        console.log(
          `[CheckAccounts] Notified ${profile.email}: ${newDisconnects.length} disconnected account(s)`
        );
      } catch (err) {
        console.error(
          `[CheckAccounts] Error processing profile ${profile.email}:`,
          err
        );
      }
    }

    return NextResponse.json({
      checked: profiles.length,
      notified: totalNotified,
    });
  } catch (err) {
    console.error("[CheckAccounts] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
