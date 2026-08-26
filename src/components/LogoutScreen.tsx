"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandAuthHeader from "@/components/BrandAuthHeader";

export default function LogoutScreen() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .finally(() => setDone(true));
  }, []);
  return (
    <main className="auth-shell branded-auth-page">
      <section className="auth-card compact-auth-card">
        <BrandAuthHeader />
        <div className="auth-intro">
          <div className="eyebrow">Sesi berakhir aman</div>
          <h1>{done ? "Anda sudah logout" : "Mengakhiri sesi..."}</h1>
          <p className="muted">{done ? "Session telah dicabut dari server dan perangkat ini." : "Mohon tunggu sebentar."}</p>
        </div>
        {done && <Link className="primary full auth-link-button" href="/login">Masuk kembali</Link>}
      </section>
    </main>
  );
}
