"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { readJson } from "@/lib/http";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CreditCard,
  History,
  Hourglass,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PlanCode = "FREE" | "PERSONAL_PRO" | "COACH_PRO" | "COMMUNITY" | "BUSINESS";
type Entitlements = {
  plan: PlanCode;
  maxActivePrograms: number;
  historyDays: number;
  advancedAnalytics: boolean;
  aiWeeklyInsights: boolean;
  maxAccountabilityPartners: number;
  maxClients: number;
  maxCommunityMembers: number;
  exportEnabled: boolean;
  customBranding: boolean;
};
type BillingPlan = {
  code: PlanCode;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  checkoutable: boolean;
  entitlements: Entitlements;
};
type BillingTransaction = {
  id: string;
  planCode: PlanCode;
  planName: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED";
  amountCents: number;
  currency: string;
  provider: string;
  checkoutUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
type BillingSummary = {
  workspace: { id: string; name: string; type: string };
  currentPlan: { code: PlanCode; name: string; billingCycle: "monthly" | "yearly" | "free" | "custom" };
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string | null;
  } | null;
  entitlements: Entitlements;
  usage: {
    activePrograms: { current: number; limit: number };
    aiWeeklyInsights: { current: number; limit: number };
    historyDays: { current: number | null; limit: number };
  };
  plans: BillingPlan[];
  transactions: BillingTransaction[];
};
type User = { name: string; email: string; role: string };

const headers = { "Content-Type": "application/json" };

function rupiah(cents: number, currency = "IDR") {
  if (cents === 0) return "Rp0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.round(cents / 100));
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function limitLabel(limit: number) {
  return limit === -1 ? "Unlimited" : String(limit);
}

function statusCopy(status?: string | null) {
  const labels: Record<string, string> = {
    TRIALING: "Trial",
    ACTIVE: "Active",
    PAST_DUE: "Past due",
    GRACE: "Grace period",
    CANCELED: "Canceled",
    EXPIRED: "Expired",
    PENDING: "Pending",
    PAID: "Success",
    FAILED: "Failed",
  };
  return status ? labels[status] ?? status : "Free";
}

function transactionTone(status: BillingTransaction["status"]) {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "pending";
  return "danger";
}

function featureRows(plan: BillingPlan) {
  const e = plan.entitlements;
  return [
    ["Programs", limitLabel(e.maxActivePrograms)],
    ["History", e.historyDays === -1 ? "Unlimited" : `${e.historyDays} hari`],
    ["Analytics", e.advancedAnalytics ? "Advanced" : "Basic"],
    ["AI Insights", e.aiWeeklyInsights ? "30 / minggu" : "-"],
    ["Export", e.exportEnabled ? "CSV" : "-"],
  ];
}

export default function Billing({ returnState }: { returnState?: "success" | "cancel" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<PlanCode | null>(null);
  const transactionId = searchParams.get("transactionId");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const session = await fetch("/api/auth/session");
    if (session.status === 401) {
      router.replace("/login");
      return;
    }
    const sessionData = await session.json();
    setUser(sessionData.user);
    const res = await fetch("/api/billing");
    const data = await readJson<BillingSummary & { error?: string }>(res);
    if (!res.ok) {
      setError(data.error || "Gagal memuat billing");
      setSummary(null);
    } else {
      setSummary(data);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (returnState === "success") setNotice("Pembayaran diterima. Aktivasi menunggu webhook provider jika status belum berubah.");
    if (returnState === "cancel") setNotice("Checkout dibatalkan. Paket Anda tidak berubah.");
  }, [returnState]);

  const currentTransaction = useMemo(() => {
    if (!summary) return null;
    if (transactionId) return summary.transactions.find((transaction) => transaction.id === transactionId) ?? null;
    return summary.transactions[0] ?? null;
  }, [summary, transactionId]);

  async function logout() {
    router.push("/logout");
  }

  async function startCheckout(planCode: PlanCode) {
    setCheckoutPlan(planCode);
    setError("");
    setNotice("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ planCode, interval }),
    });
    const data = await readJson<{ checkoutUrl?: string; transactionId?: string; error?: string }>(res);
    setCheckoutPlan(null);
    if (!res.ok || !data.checkoutUrl) {
      setError(data.error || "Checkout belum bisa dimulai");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  if (loading || !user) {
    return (
      <main className="auth-shell">
        <div className="eyebrow">Memuat billing...</div>
      </main>
    );
  }

  const paidPlans = summary?.plans.filter((plan) => plan.code !== "FREE") ?? [];
  const freePlan = summary?.plans.find((plan) => plan.code === "FREE");
  const usage = summary?.usage;
  const current = summary?.currentPlan;
  const sub = summary?.subscription;

  return (
    <div className="shell dashboard-shell billing-shell">
      <AppHeader user={user} active="billing" onLogout={logout} />
      <main className="content dashboard-content billing-content">
        <section className="hero dashboard-hero billing-hero">
          <div>
            <div className="eyebrow">Billing</div>
            <h1>Plan, limit, dan upgrade</h1>
            <p className="muted">Semua status subscription dibaca dari server, bukan dari redirect pembayaran.</p>
          </div>
          <div className="hero-actions">
            <Link className="secondary icon-button" href="/dashboard">
              <ArrowLeft size={17} />
              Dashboard
            </Link>
            <button className="secondary icon-button" type="button" onClick={load}>
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </section>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice success">{notice}</p>}

        {summary ? (
          <>
            {currentTransaction && (
              <section className={`payment-state ${transactionTone(currentTransaction.status)}`}>
                <span>{currentTransaction.status === "PAID" ? <BadgeCheck size={20} /> : currentTransaction.status === "PENDING" ? <Hourglass size={20} /> : <XCircle size={20} />}</span>
                <div>
                  <b>Payment {statusCopy(currentTransaction.status)}</b>
                  <p>{currentTransaction.planName} · {rupiah(currentTransaction.amountCents, currentTransaction.currency)} · {dateLabel(currentTransaction.updatedAt)}</p>
                </div>
              </section>
            )}

            <section className="billing-overview">
              <article className="card glass-card current-plan-card">
                <div className="section-title-row">
                  <span className="section-icon"><CreditCard size={19} /></span>
                  <div>
                    <b>Current Plan</b>
                    <p className="muted">{summary.workspace.name}</p>
                  </div>
                </div>
                <div className="current-plan-name">
                  <strong>{current?.name}</strong>
                  <span>{current?.billingCycle === "free" ? "Rp0" : current?.billingCycle === "custom" ? "Custom" : current?.billingCycle === "yearly" ? "Tahunan" : "Bulanan"}</span>
                </div>
                <dl className="billing-meta">
                  <div><dt>Status</dt><dd>{statusCopy(sub?.status)}</dd></div>
                  <div><dt>Next billing</dt><dd>{sub?.cancelAtPeriodEnd ? `Berakhir ${dateLabel(sub.currentPeriodEnd)}` : dateLabel(sub?.currentPeriodEnd)}</dd></div>
                  <div><dt>Provider</dt><dd>{sub?.provider ?? "Manual / Free"}</dd></div>
                </dl>
              </article>

              <article className="card glass-card usage-card">
                <div className="section-title-row">
                  <span className="section-icon"><TrendingUp size={19} /></span>
                  <div>
                    <b>Usage</b>
                    <p className="muted">Limit aktif dari entitlement server-side.</p>
                  </div>
                </div>
                <div className="usage-list">
                  <div><span>Programs</span><b>{usage?.activePrograms.current} / {limitLabel(usage?.activePrograms.limit ?? 0)}</b></div>
                  <div><span>AI Insights</span><b>{usage?.aiWeeklyInsights.current} / {limitLabel(usage?.aiWeeklyInsights.limit ?? 0)}</b></div>
                  <div><span>History</span><b>{limitLabel(usage?.historyDays.limit ?? 0)}</b></div>
                </div>
              </article>
            </section>

            <section className="billing-section">
              <div className="billing-section-head">
                <div className="section-title-row">
                  <span className="section-icon"><Sparkles size={19} /></span>
                  <div>
                    <b>Pricing</b>
                    <p className="muted">Pilih paket yang membuka growth path berikutnya.</p>
                  </div>
                </div>
                <div className="segmented-control" role="group" aria-label="Billing cycle">
                  <button className={interval === "monthly" ? "active" : ""} type="button" onClick={() => setInterval("monthly")}>Bulanan</button>
                  <button className={interval === "yearly" ? "active" : ""} type="button" onClick={() => setInterval("yearly")}>Tahunan</button>
                </div>
              </div>

              <div className="pricing-grid">
                {[freePlan, ...paidPlans].filter(Boolean).map((plan) => {
                  const typedPlan = plan as BillingPlan;
                  const price = interval === "yearly" ? typedPlan.yearlyPriceCents : typedPlan.monthlyPriceCents;
                  const isCurrent = typedPlan.code === current?.code;
                  return (
                    <article className={`card glass-card pricing-card ${isCurrent ? "current" : ""}`} key={typedPlan.code}>
                      <div className="pricing-card-head">
                        <div>
                          <b>{typedPlan.name}</b>
                          {isCurrent && <span className="current-badge">Current</span>}
                        </div>
                        <strong>{typedPlan.code === "BUSINESS" ? "Custom" : rupiah(price, typedPlan.currency)}</strong>
                        <small>{typedPlan.code === "BUSINESS" ? "Hubungi tim" : interval === "yearly" ? "/ tahun" : "/ bulan"}</small>
                      </div>
                      <ul className="feature-list">
                        {featureRows(typedPlan).map(([label, value]) => (
                          <li key={label}>
                            <Check size={15} />
                            <span>{label}</span>
                            <b>{value}</b>
                          </li>
                        ))}
                      </ul>
                      {typedPlan.checkoutable ? (
                        <button className="primary icon-button full" type="button" disabled={checkoutPlan === typedPlan.code || isCurrent} onClick={() => startCheckout(typedPlan.code)}>
                          <CreditCard size={17} />
                          {isCurrent ? "Plan aktif" : checkoutPlan === typedPlan.code ? "Membuka checkout..." : "Upgrade"}
                        </button>
                      ) : (
                        <Link className="secondary icon-button full" href={typedPlan.code === "BUSINESS" ? "mailto:support@arvadigitalmedia.com" : "/dashboard"}>
                          {typedPlan.code === "BUSINESS" ? <Users size={17} /> : <LockKeyhole size={17} />}
                          {typedPlan.code === "BUSINESS" ? "Kontak sales" : "Mulai Free"}
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="billing-section billing-history">
              <div className="section-title-row">
                <span className="section-icon"><History size={19} /></span>
                <div>
                  <b>Billing History</b>
                  <p className="muted">Transaksi terbaru dari server.</p>
                </div>
              </div>
              {summary.transactions.length === 0 ? (
                <div className="empty-state">Belum ada transaksi billing.</div>
              ) : (
                <div className="transaction-list">
                  {summary.transactions.map((transaction) => (
                    <div className="transaction-row" key={transaction.id}>
                      <span className={`transaction-status ${transactionTone(transaction.status)}`}>{statusCopy(transaction.status)}</span>
                      <div>
                        <b>{transaction.planName}</b>
                        <small>{transaction.provider} · {dateLabel(transaction.createdAt)}</small>
                      </div>
                      <strong>{rupiah(transaction.amountCents, transaction.currency)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state">Billing belum tersedia untuk workspace ini.</div>
        )}
      </main>
      <MobileBottomNav active="billing" onPrimary={() => router.push("/dashboard")} primaryLabel="Dashboard" />
    </div>
  );
}
