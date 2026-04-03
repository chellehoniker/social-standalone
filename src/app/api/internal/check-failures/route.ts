import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { sendUserAndAdminEmail } from "@/lib/email/send";
import {
  postFailureUserEmail,
  postFailureAdminEmail,
  type FailedPost,
} from "@/lib/email/templates";

/**
 * POST /api/internal/check-failures
 * Polls Late API for failed posts across all users and sends notifications.
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

    // Get all profiles with a Late profile ID
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
        // Fetch failed posts from Late for this profile
        const { data: postsData } = await late.posts.listPosts({
          query: {
            profileId: profile.getlate_profile_id,
            status: "failed",
            limit: 50,
          },
        });

        const failedPosts = postsData?.posts || [];
        if (failedPosts.length === 0) continue;

        // Collect failures we haven't notified about yet
        const newFailures: FailedPost[] = [];

        for (const post of failedPosts) {
          const platforms = post.platforms || [];
          for (const plat of platforms) {
            if (plat.status !== "failed") continue;

            // Check if we've already notified about this specific failure
            const { data: existing } = await (supabase as any)
              .from("failure_notifications")
              .select("id")
              .eq("late_post_id", post._id)
              .eq("platform", plat.platform)
              .maybeSingle();

            if (existing) continue;

            newFailures.push({
              postId: post._id,
              content: post.content || "",
              platform: plat.platform,
              accountName: plat.accountId?.displayName || plat.platform,
              errorMessage: plat.errorMessage || "Unknown error",
              scheduledFor: post.scheduledFor
                ? new Date(post.scheduledFor).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "N/A",
            });

            // Record notification
            await (supabase as any).from("failure_notifications").insert({
              user_id: profile.id,
              late_post_id: post._id,
              platform: plat.platform,
              error_message: plat.errorMessage || "Unknown error",
            });
          }
        }

        if (newFailures.length === 0) continue;

        // Send notification to user and admins
        await sendUserAndAdminEmail({
          userEmail: profile.email,
          subject: `Post failed to publish on ${newFailures.map((f) => f.platform).join(", ")}`,
          userHtml: postFailureUserEmail(newFailures),
          adminHtml: postFailureAdminEmail(profile.email, newFailures),
        });

        totalNotified++;
        console.log(
          `[CheckFailures] Notified ${profile.email}: ${newFailures.length} new failure(s)`
        );
      } catch (err) {
        console.error(
          `[CheckFailures] Error processing profile ${profile.email}:`,
          err
        );
      }
    }

    return NextResponse.json({
      checked: profiles.length,
      notified: totalNotified,
    });
  } catch (err) {
    console.error("[CheckFailures] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
