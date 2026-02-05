import { requireSubscription } from "@/lib/auth/protected";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - runs before ANY rendering
  // Redirects to /login if not authenticated, /pricing if no active subscription
  const { user, profile } = await requireSubscription();

  return (
    <DashboardShell
      userId={user.id}
      userEmail={user.email || "user"}
      subscriptionStatus={profile.subscription_status}
      getlateProfileId={profile.getlate_profile_id}
      priceId={profile.price_id}
      currentPeriodEnd={profile.current_period_end}
    >
      {children}
    </DashboardShell>
  );
}
