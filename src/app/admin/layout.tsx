import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin check - redirects non-admins to /dashboard
  const { user } = await requireAdmin();

  return (
    <AdminShell userEmail={user.email || "admin"} userId={user.id}>
      {children}
    </AdminShell>
  );
}
