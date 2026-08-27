"use client";

import Link from "next/link";
import { BarChart3, CalendarClock, CreditCard, Home, Plus, Settings } from "lucide-react";

type MobileBottomNavProps = {
  active: "dashboard" | "daily-plan" | "admin" | "billing";
  onPrimary: () => void;
  onSettings?: () => void;
  primaryLabel?: string;
};

export default function MobileBottomNav({ active, onPrimary, onSettings, primaryLabel = "Tambah" }: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi utama mobile">
      <Link className={active === "dashboard" ? "active" : ""} href="/dashboard" aria-label="Dashboard">
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link className={active === "daily-plan" ? "active" : ""} href="/daily-plan" aria-label="Daily Plan">
        <CalendarClock size={20} />
        <span>Plan</span>
      </Link>
      <button className="mobile-primary-action" type="button" onClick={onPrimary} aria-label={primaryLabel}>
        <Plus size={26} />
      </button>
      <Link href="/dashboard#tracker" aria-label="Tracker">
        <BarChart3 size={20} />
        <span>Tracker</span>
      </Link>
      {onSettings ? (
        <button type="button" onClick={onSettings} aria-label="Settings">
          <Settings size={20} />
          <span>Set</span>
        </button>
      ) : (
        <Link className={active === "billing" ? "active" : ""} href="/billing" aria-label="Billing">
          <CreditCard size={20} />
          <span>Bill</span>
        </Link>
      )}
    </nav>
  );
}
