"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProfileSettings from "@/components/ProfileSettings";
import { readJson } from "@/lib/http";
import { Archive, ArchiveRestore, ArrowLeft, CalendarDays, CheckCircle2, ListPlus, LoaderCircle, Lock, Save, Settings2, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type User = { id: string; name: string; email: string; role: string };
type Tracker = {
  id: string;
  ownerId: string;
  title: string;
  subtitle?: string;
  days: number;
  activities: string[];
  startDate?: string;
  endDate?: string;
  locksActivities: boolean;
  status: "ACTIVE" | "ARCHIVED";
};

const headers = { "Content-Type": "application/json" };

function localIsoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function formatDate(dateIso?: string) {
  if (!dateIso) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`));
}

export default function TrackerManager() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [active, setActive] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const session = await fetch("/api/auth/session");
    if (session.status === 401) {
      router.replace("/login");
      return;
    }
    if (!session.ok) {
      setNotice({ type: "error", text: "Gagal memuat sesi pengguna." });
      return;
    }
    const sessionData = await session.json();
    const currentUser = sessionData.user as User;
    setUser(currentUser);

    const response = await fetch("/api/modules");
    if (!response.ok) {
      setNotice({ type: "error", text: "Gagal memuat daftar tracker." });
      return;
    }
    const modules = (await response.json() as Tracker[]).filter((tracker) => tracker.ownerId === currentUser.id);
    setTrackers(modules);
    setActive((current) => modules.some((tracker) => tracker.id === current) ? current : modules[0]?.id || "");
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const tracker = trackers.find((item) => item.id === active) ?? trackers[0];
  const activityCount = tracker?.activities.filter(Boolean).length ?? 0;
  const activitiesLocked = useMemo(() => {
    if (!tracker) return false;
    return tracker.locksActivities && !!tracker.startDate && localIsoDate() > tracker.startDate.slice(0, 10);
  }, [tracker]);

  async function updateTitle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tracker) return;
    const title = String(new FormData(event.currentTarget).get("title") || "").trim();
    setBusy("title");
    setNotice(null);
    try {
      const response = await fetch("/api/modules", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ moduleId: tracker.id, title }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan judul tracker.");
      await load();
      setNotice({ type: "success", text: "Judul tracker berhasil diperbarui." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Gagal menyimpan judul tracker." });
    } finally {
      setBusy("");
    }
  }

  async function activityAction(body: unknown, success: string) {
    setBusy("activity");
    setNotice(null);
    try {
      const response = await fetch("/api/modules/activities", { method: "POST", headers, body: JSON.stringify(body) });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan aktivitas.");
      await load();
      setNotice({ type: "success", text: success });
      return true;
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Gagal menyimpan aktivitas." });
      return false;
    } finally {
      setBusy("");
    }
  }

  async function addActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tracker) return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim();
    if (await activityAction({ action: "add", moduleId: tracker.id, name }, "Aktivitas berhasil ditambahkan.")) form.reset();
  }

  async function updateActivity(event: React.FormEvent<HTMLFormElement>, activityIdx: number) {
    event.preventDefault();
    if (!tracker) return;
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    await activityAction({ action: "update", moduleId: tracker.id, activityIdx, name }, "Aktivitas berhasil diperbarui.");
  }

  async function deleteActivity(activityIdx: number, activity: string) {
    if (!tracker || !window.confirm(`Hapus aktivitas “${activity}”?`)) return;
    await activityAction({ action: "delete", moduleId: tracker.id, activityIdx }, "Aktivitas berhasil dihapus.");
  }

  async function startLegacyTracker() {
    if (!tracker) return;
    setBusy("period");
    setNotice(null);
    try {
      const response = await fetch("/api/modules/start-date", {
        method: "POST",
        headers,
        body: JSON.stringify({ moduleId: tracker.id, startDate: localIsoDate() }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Gagal mengaktifkan periode tracker.");
      await load();
      setNotice({ type: "success", text: "Periode tracker berhasil diaktifkan dan dikunci." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Gagal mengaktifkan periode tracker." });
    } finally {
      setBusy("");
    }
  }

  async function archiveTracker(archived: boolean) {
    if (!tracker) return;
    if (archived && !window.confirm(`Arsipkan tracker "${tracker.title}"? Tracker akan disembunyikan dari dashboard, tapi riwayat progres tidak dihapus.`)) return;
    setBusy("archive");
    setNotice(null);
    try {
      const response = await fetch("/api/modules/archive", {
        method: "POST",
        headers,
        body: JSON.stringify({ moduleId: tracker.id, archived }),
      });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui status tracker.");
      await load();
      setNotice({ type: "success", text: archived ? "Tracker berhasil diarsipkan dan disembunyikan dari dashboard." : "Tracker berhasil diaktifkan kembali." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Gagal memperbarui status tracker." });
    } finally {
      setBusy("");
    }
  }

  if (!user) {
    return <main className="auth-shell"><div className="eyebrow">Memuat pengaturan tracker...</div></main>;
  }

  return (
    <div className="shell tracker-manager-shell">
      <AppHeader user={user} active="tracker" onProfile={() => setProfileModal(true)} onLogout={() => router.push("/logout")} />

      <main className="content tracker-manager-content">
        <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />Dashboard</Link>

        <section className="tracker-manager-hero">
          <div>
            <div className="eyebrow">Area pengelolaan</div>
            <h1>Kelola Tracker</h1>
            <p className="muted">Ubah identitas dan aktivitas tracker tanpa memenuhi dashboard utama.</p>
          </div>
          {trackers.length > 1 && (
            <label className="tracker-manager-selector">
              <span>Tracker aktif</span>
              <select value={active} onChange={(event) => { setActive(event.target.value); setNotice(null); }}>
                {trackers.map((item) => (
                  <option value={item.id} key={item.id}>{item.title}{item.status === "ARCHIVED" ? " (Diarsipkan)" : ""}</option>
                ))}
              </select>
            </label>
          )}
        </section>

        {notice && (
          <div className={`notice ${notice.type}`} role="status">
            {notice.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notice.text}
          </div>
        )}

        {!tracker ? (
          <section className="card glass-card empty-state">Belum ada tracker milik Anda yang dapat dikelola.</section>
        ) : (
          <div className="tracker-manager-grid">
            <section className="card glass-card tracker-manager-card">
              <div className="section-title-row">
                <span className="section-icon"><Settings2 size={19} /></span>
                <div><b>Identitas tracker</b><p className="muted">Judul yang tampil pada dashboard motivasi Anda.</p></div>
              </div>
              <form className="tracker-title-settings" key={`title-${tracker.id}-${tracker.title}`} onSubmit={updateTitle}>
                <div className="field">
                  <label htmlFor="tracker-settings-title">Judul tracker</label>
                  <input id="tracker-settings-title" name="title" defaultValue={tracker.title} minLength={1} maxLength={50} required />
                  {tracker.subtitle && <small className="date-hint">Tagline dashboard: {tracker.subtitle}</small>}
                </div>
                <button className="primary icon-button" disabled={busy !== ""}>
                  {busy === "title" ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                  {busy === "title" ? "Menyimpan..." : "Simpan judul"}
                </button>
              </form>
            </section>

            <section className="card glass-card tracker-manager-card">
              <div className="section-title-row">
                <span className="section-icon"><CalendarDays size={19} /></span>
                <div><b>Periode accountability</b><p className="muted">Tanggal dikunci setelah tracker dimulai.</p></div>
              </div>
              {tracker.startDate && tracker.endDate ? (
                <div className="locked-period"><Lock size={16} /><span><b>{formatDate(tracker.startDate)}</b> sampai <b>{formatDate(tracker.endDate)}</b></span></div>
              ) : (
                <button className="primary" type="button" disabled={busy !== ""} onClick={startLegacyTracker}>
                  {busy === "period" ? "Mengaktifkan..." : "Aktifkan periode tracker lama"}
                </button>
              )}
            </section>

            <section className="card glass-card tracker-manager-card tracker-manager-activities">
              <div className="section-title-row">
                <span className="section-icon"><ListPlus size={19} /></span>
                <div>
                  <b>Kelola aktivitas</b>
                  <p className="muted">{activitiesLocked ? "Aktivitas terkunci karena tracker telah berjalan melewati hari pertama." : "Tambahkan, edit, atau hapus maksimal 10 aktivitas."}</p>
                </div>
              </div>
              {activitiesLocked ? (
                <p className="notice success activity-locked-notice"><Lock size={14} />Aktivitas tracker ini tetap ({activityCount} aktivitas) selama perjalanan berjalan.</p>
              ) : (
                <>
                  <div className="activity-count">{activityCount}/10 aktivitas digunakan</div>
                  <div className="activity-progress" aria-hidden="true"><span style={{ width: `${activityCount * 10}%` }} /></div>
                  <div className="activity-list">
                    {tracker.activities.length === 0 && <div className="empty-state">Belum ada aktivitas. Tambahkan aktivitas pertama.</div>}
                    {tracker.activities.map((activity, index) => (
                      <form className="activity-row" key={`${tracker.id}-${index}-${activity}`} onSubmit={(event) => updateActivity(event, index)}>
                        <input name="name" defaultValue={activity} maxLength={60} required aria-label={`Edit aktivitas ${activity}`} />
                        <button className="secondary icon-only" disabled={busy !== ""} aria-label={`Simpan aktivitas ${activity}`}><Save size={16} /></button>
                        <button className="danger icon-only" type="button" disabled={busy !== ""} onClick={() => deleteActivity(index, activity)} aria-label={`Hapus aktivitas ${activity}`}><Trash2 size={16} /></button>
                      </form>
                    ))}
                  </div>
                  <form className="activity-add" onSubmit={addActivity}>
                    <input name="name" placeholder={activityCount >= 10 ? "Batas maksimal tercapai" : "Tambah aktivitas baru"} maxLength={60} disabled={activityCount >= 10 || busy !== ""} required />
                    <button className="primary icon-button" disabled={activityCount >= 10 || busy !== ""}>{busy === "activity" ? <LoaderCircle className="spin" size={18} /> : <ListPlus size={18} />}Tambah</button>
                  </form>
                </>
              )}
            </section>

            <section className="card glass-card tracker-manager-card tracker-manager-archive-card">
              <div className="section-title-row">
                <span className="section-icon">{tracker.status === "ARCHIVED" ? <ArchiveRestore size={19} /> : <Archive size={19} />}</span>
                <div>
                  <b>Status tracker</b>
                  <p className="muted">
                    {tracker.status === "ARCHIVED"
                      ? "Tracker ini diarsipkan dan tidak muncul di dashboard utama."
                      : "Sembunyikan tracker dari dashboard tanpa menghapus riwayat progresnya."}
                  </p>
                </div>
              </div>
              {tracker.status === "ARCHIVED" ? (
                <button className="secondary icon-button" type="button" disabled={busy !== ""} onClick={() => archiveTracker(false)}>
                  {busy === "archive" ? <LoaderCircle className="spin" size={18} /> : <ArchiveRestore size={18} />}
                  {busy === "archive" ? "Mengaktifkan..." : "Aktifkan kembali"}
                </button>
              ) : (
                <button className="danger icon-button" type="button" disabled={busy !== ""} onClick={() => archiveTracker(true)}>
                  {busy === "archive" ? <LoaderCircle className="spin" size={18} /> : <Archive size={18} />}
                  {busy === "archive" ? "Mengarsipkan..." : "Arsipkan tracker"}
                </button>
              )}
            </section>
          </div>
        )}
      </main>

      <MobileBottomNav active="tracker" onPrimary={() => router.push("/dashboard")} onSettings={() => setProfileModal(true)} primaryLabel="Buka dashboard" />

      {profileModal && (
        <div className="modal profile-modal" onClick={() => setProfileModal(false)}>
          <div className="profile-modal-panel" onClick={(event) => event.stopPropagation()}>
            <ProfileSettings onClose={() => setProfileModal(false)} onSaved={(updated) => setUser(updated)} />
          </div>
        </div>
      )}
    </div>
  );
}
