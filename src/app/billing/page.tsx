import Billing from "@/components/Billing";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<main className="auth-shell"><div className="eyebrow">Memuat billing...</div></main>}>
      <Billing />
    </Suspense>
  );
}
