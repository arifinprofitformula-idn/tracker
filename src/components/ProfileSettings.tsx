"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Save, UserRound, X, XCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: string; status: string };

export default function ProfileSettings({ onClose, onSaved }: { onClose?: () => void; onSaved?: (user: User) => void }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!r.ok) throw new Error("Gagal memuat profil");
        return r.json();
      })
      .then((data) => {
        if (active && data?.user) setUser(data.user);
      })
      .catch(() => active && setNotice({ type: "error", text: "Gagal memuat data profil." }));
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      name: String(fd.get("name") || "").trim(),
      currentPassword: String(fd.get("currentPassword") || ""),
      newPassword: String(fd.get("newPassword") || ""),
      confirmPassword: String(fd.get("confirmPassword") || ""),
    };

    try {
      const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal menyimpan perubahan");
      setUser(data.user);
      onSaved?.(data.user);
      form.currentPassword.value = "";
      form.newPassword.value = "";
      form.confirmPassword.value = "";
      setNotice({ type: "success", text: "Profile settings berhasil disimpan." });
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Gagal menyimpan perubahan." });
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    if (onClose) {
      return (
        <section className="profile-card">
          <div className="eyebrow">Memuat profile settings...</div>
        </section>
      );
    }
    return (
      <main className="auth-shell">
        <div className="eyebrow">Memuat profile settings...</div>
      </main>
    );
  }

  const card = (
    <section className="profile-card">
      <div className="profile-card-actions">
        {onClose ? (
          <button className="profile-close" type="button" onClick={onClose} aria-label="Tutup profile settings">
            <X size={18} />
          </button>
        ) : (
        <Link className="back-link" href="/dashboard">
          <ArrowLeft size={18} />
          Dashboard
        </Link>
        )}
      </div>

        <div className="profile-heading">
          <div className="auth-brand-mark">
            <UserRound size={32} />
          </div>
          <div>
            <div className="eyebrow">Akun pengguna</div>
            <h1>Profile Settings</h1>
            <p className="muted">Kelola nama tampilan dan password akun Anda dengan aman.</p>
          </div>
        </div>

        {notice && (
          <div className={`notice ${notice.type}`}>
            {notice.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notice.text}
          </div>
        )}

        <form className="profile-form" onSubmit={submit}>
          <div className="profile-form-fields">
          <div className="field icon-field">
            <label htmlFor="email">
              <Mail size={14} />
              Email
            </label>
            <input id="email" name="email" type="email" value={user.email} readOnly aria-readonly="true" />
            <small className="date-hint">Email hanya sebagai identitas login dan tidak dapat diubah.</small>
          </div>

          <div className="field icon-field">
            <label htmlFor="name">
              <UserRound size={14} />
              Nama
            </label>
            <input id="name" name="name" required minLength={2} maxLength={80} defaultValue={user.name} autoComplete="name" />
          </div>

          <div className="password-panel">
            <div className="section-title-row">
              <span className="section-icon">
                <KeyRound size={19} />
              </span>
              <div>
                <b>Ubah password</b>
                <p className="muted">Kosongkan bagian ini jika tidak ingin mengganti password.</p>
              </div>
            </div>

            <div className="profile-password-grid">
              <div className="field">
                <label htmlFor="currentPassword">Password saat ini</label>
                <input id="currentPassword" name="currentPassword" type="password" maxLength={128} autoComplete="current-password" />
              </div>
              <div className="field">
                <label htmlFor="newPassword">Password baru</label>
                <input id="newPassword" name="newPassword" type="password" minLength={10} maxLength={128} autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Konfirmasi password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" maxLength={128} autoComplete="new-password" />
              </div>
            </div>
          </div>
          </div>

          <button className="primary full icon-button profile-save" disabled={busy}>
            <Save size={18} />
            {busy ? "Menyimpan..." : "Save Changes"}
          </button>
        </form>
      </section>
  );

  if (onClose) return card;

  return (
    <main className="profile-shell">
      {card}
    </main>
  );
}
