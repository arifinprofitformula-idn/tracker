"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readJson } from "@/lib/http";

type TransactionStatus = {
  id: string;
  planName: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED";
  amountCents: number;
  currency: string;
  updatedAt: string;
};

function rupiah(cents: number, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.round(cents / 100));
}

export default function BillingMockCheckout({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/billing/payment-status?transactionId=${encodeURIComponent(transactionId)}`);
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const data = await readJson<{ transaction?: TransactionStatus; error?: string }>(res);
    if (!res.ok || !data.transaction) {
      setError(data.error || "Transaksi tidak ditemukan");
      return;
    }
    setError("");
    setTransaction(data.transaction);
  }, [router, transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="auth-shell mock-checkout-page">
      <section className="auth-card mock-checkout-card">
        <div className="auth-intro">
          <span className="auth-brand-mark">
            <Clock3 size={28} />
          </span>
          <div className="eyebrow">Mock checkout</div>
          <h1>{transaction ? transaction.planName : "Menunggu transaksi"}</h1>
          <p className="muted">
            {transaction
              ? `${transaction.status} · ${rupiah(transaction.amountCents, transaction.currency)}`
              : "Memuat status pembayaran dari backend."}
          </p>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary icon-button full" type="button" onClick={load}>
          <RefreshCw size={17} />
          Refresh status
        </button>
        <Link className="secondary icon-button full" href={`/billing?transactionId=${encodeURIComponent(transactionId)}`}>
          <ArrowLeft size={17} />
          Kembali ke Billing
        </Link>
      </section>
    </main>
  );
}
