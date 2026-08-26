"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import BrandAuthHeader from "@/components/BrandAuthHeader";
import { readJson } from "@/lib/http";

type SessionResponse = { user?: { name: string; email: string } };

export default function ResetPasswordForm() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => { fetch("/api/auth/session").then(async r => setSession(r.ok ? await readJson<SessionResponse>(r) : {})).catch(() => setSession({})); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(event.currentTarget);
    const currentPassword = String(fd.get("currentPassword") || "");
    const newPassword = String(fd.get("newPassword") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak sama."); setBusy(false); return; }
    const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: session?.user?.name, currentPassword, newPassword, confirmPassword }) });
    const data = await readJson<{ error?: string }>(response);
    if (!response.ok) { setError(data.error || "Password gagal diubah."); setBusy(false); return; }
    setSuccess(true); setBusy(false);
  }

  if (session === null) return <main className="auth-shell"><div className="eyebrow">Memuat Arva Tracker...</div></main>;
  return (
    <main className="auth-shell branded-auth-page">
      <section className="auth-card compact-auth-card">
        <BrandAuthHeader />
        <div className="auth-intro"><ShieldCheck size={26} /><div className="eyebrow">Keamanan akun</div><h1>Ubah password</h1><p className="muted">Verifikasi password saat ini sebelum membuat password baru.</p></div>
        {!session.user ? (
          <div className="auth-form auth-guard"><p>Demi keamanan, masuk ke akun terlebih dahulu.</p><Link className="primary full auth-link-button" href="/login?next=/reset-password">Masuk untuk melanjutkan</Link></div>
        ) : success ? (
          <div className="auth-form"><p className="notice success">Password berhasil diperbarui.</p><Link className="primary full auth-link-button" href="/dashboard">Kembali ke dashboard</Link></div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="field"><label htmlFor="currentPassword">Password saat ini</label><input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div>
            <div className="field"><label htmlFor="newPassword">Password baru</label><input id="newPassword" name="newPassword" type="password" minLength={10} autoComplete="new-password" required /></div>
            <div className="field"><label htmlFor="confirmPassword">Konfirmasi password baru</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></div>
            {error && <p className="error">{error}</p>}
            <button className="primary full auth-submit" disabled={busy}><span>{busy ? "Menyimpan..." : "Perbarui password"}</span><ArrowRight size={19} /></button>
          </form>
        )}
      </section>
    </main>
  );
}
