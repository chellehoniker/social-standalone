import { Suspense } from "react";
import { AccountsContent } from "./_components/accounts-content";

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  );
}
