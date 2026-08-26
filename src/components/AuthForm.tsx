"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3 } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    const r = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "Terjadi kesalahan");
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-intro">
          <div className="auth-brand-mark" aria-hidden="true">
            <BarChart3 size={32} strokeWidth={2.2} />
          </div>
          <div className="eyebrow">Coach Arifin</div>
          <h1 id="auth-title">{isLogin ? "Selamat datang" : "Mulai perjalanan"}</h1>
          <p className="muted">Satu sistem ringan untuk menjaga konsistensi harian.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {!isLogin && (
            <div className="field">
              <label htmlFor="name">Nama</label>
              <input id="name" name="name" required minLength={2} autoComplete="name" placeholder="Nama lengkap" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={isLogin ? 1 : 10}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="primary full auth-submit" disabled={busy}>
            <span>{busy ? "Memproses..." : isLogin ? "Masuk" : "Buat akun"}</span>
            <ArrowRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch muted">
          {isLogin ? (
            <>
              Belum punya akun?{" "}
              <Link className="link" href="/register">
                Daftar
              </Link>
            </>
          ) : (
            <>
              Sudah punya akun?{" "}
              <Link className="link" href="/login">
                Masuk
              </Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
