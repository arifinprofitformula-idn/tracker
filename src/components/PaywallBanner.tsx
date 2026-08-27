"use client";

import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";

type PaywallBannerProps = {
  title?: string;
  message: string;
  compact?: boolean;
};

export default function PaywallBanner({ title = "Upgrade tersedia", message, compact = false }: PaywallBannerProps) {
  return (
    <div className={`paywall-banner ${compact ? "compact" : ""}`} role="status">
      <span className="paywall-icon">
        <LockKeyhole size={18} />
      </span>
      <div>
        <b>{title}</b>
        <p>{message}</p>
      </div>
      <Link className="primary icon-button" href="/billing">
        <Sparkles size={17} />
        Upgrade
      </Link>
    </div>
  );
}
