"use client";

import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProfileSettings from "@/components/ProfileSettings";
import StartDatePicker from "@/components/StartDatePicker";
import { readJson } from "@/lib/http";
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Flame,
  Gauge,
  ListPlus,
  Lock,
  Mountain,
  NotebookPen,
  PencilLine,
  Plus,
  Rocket,
  Save,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { calculatePhaseStats } from "@/lib/tracker";

type Check = { day: number; activityIdx: number };
type Note = { phaseKey: string; content: string };
type Phase = { label: string; startDay: number; endDay: number; description: string; targetPercent: number };
type Mod = {
  id: string;
  title: string;
  subtitle?: string;
  days: number;
  activities: string[];
  startDate?: string;
  locksActivities: boolean;
  checks: Check[];
  notes: Note[];
  phases: Phase[];
};
type User = { name: string; email: string; role: string };

const headers = { "Content-Type": "application/json" };
const PHASE_ICONS = [Rocket, Flame, Mountain, Trophy];
const TRACKER_PHASE_DEFAULTS = [
  { label: "Fase 1 — Pemanasan", description: "Fondasi kebiasaan dasar. Fokus membangun ritme awal.", targetPercent: 70 },
  { label: "Fase 2 — Pembentukan", description: "Konsistensi mulai terbentuk. Jaga agar tidak putus di tengah jalan.", targetPercent: 70 },
  { label: "Fase 3 — Penguatan", description: "Perkuat kebiasaan, evaluasi aktivitas yang paling berdampak.", targetPercent: 70 },
  { label: "Fase 4 — Puncak", description: "Pertahankan performa terbaik sampai program selesai.", targetPercent: 70 },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mods, setMods] = useState<Mod[]>([]);
  const [active, setActive] = useState("");
  const [modal, setModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [weekIndex, setWeekIndex] = useState(0);
  const [showAllDays, setShowAllDays] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const s = await fetch("/api/auth/session");
    if (s.status === 401) {
      router.replace("/login");
      return;
    }
    const sj = await s.json();
    setUser(sj.user);
    const r = await fetch("/api/modules");
    if (r.ok) {
      const m = await r.json();
      setMods(m);
      setActive((x) => x || m[0]?.id || "");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const mod = mods.find((m) => m.id === active) || mods[0];
  const stats = useMemo(() => {
    if (!mod) return { pct: 0, perfect: 0, streak: 0, today: null as number | null };
    const filled = mod.activities.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    const set = new Set(mod.checks.map((c) => `${c.day}-${c.activityIdx}`));
    let perfect = 0;
    let last = 0;
    for (let d = 1; d <= mod.days; d++) {
      if (filled.length && filled.every((i) => set.has(`${d}-${i}`))) {
        perfect++;
        last = d;
      }
    }
    let streak = 0;
    for (let d = last; d >= 1 && filled.every((i) => set.has(`${d}-${i}`)); d--) streak++;
    const total = mod.days * filled.length;
    const pct = total ? Math.round((set.size / total) * 100) : 0;
    let today: number | null = null;
    if (mod.startDate) {
      const start = new Date(`${mod.startDate.slice(0, 10)}T00:00:00`);
      const d = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
      if (d >= 1 && d <= mod.days) today = d;
    }
    return { pct, perfect, streak, today };
  }, [mod]);
  const activityCount = mod?.activities.filter(Boolean).length ?? 0;
  const phaseStatsList = useMemo(() => {
    if (!mod) return [];
    const checksByIndex = mod.checks.map((c) => ({ day: c.day, activityIndex: c.activityIdx }));
    return mod.phases.map((p) => calculatePhaseStats(p.startDay, p.endDay, stats.today, mod.activities, checksByIndex, p.targetPercent));
  }, [mod, stats.today]);

  useEffect(() => {
    setWeekIndex(stats.today ? Math.floor((stats.today - 1) / 7) : 0);
    setShowAllDays(false);
  }, [mod, stats.today]);

  useEffect(() => {
    if (!mod || stats.today === null) return;
    const currentPhaseIdx = mod.phases.findIndex((p) => stats.today! >= p.startDay && stats.today! <= p.endDay);
    if (currentPhaseIdx === -1) return;
    const storageKey = `phase-seen-${mod.id}`;
    const lastSeen = localStorage.getItem(storageKey);
    if (lastSeen !== null && lastSeen !== String(currentPhaseIdx)) {
      const label = mod.phases[currentPhaseIdx].label.replace(/^Fase\s*\d+\s*[—-]\s*/i, "");
      setNotice(`Selamat, Anda masuk ke Fase ${currentPhaseIdx + 1}: ${label}`);
    }
    localStorage.setItem(storageKey, String(currentPhaseIdx));
  }, [mod, stats.today]);

  async function post(path: string, body: unknown) {
    const r = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
    if (!r.ok) {
      const data = await readJson<{ error?: string }>(r);
      setNotice("");
      setError(data.error || "Gagal");
      return false;
    }
    setError("");
    await load();
    return true;
  }

  async function patchModule(body: unknown, success: string) {
    const r = await fetch("/api/modules", { method: "PATCH", headers, body: JSON.stringify(body) });
    const data = await readJson<{ error?: string }>(r);
    if (!r.ok) {
      setNotice("");
      setError(data.error || "Gagal menyimpan tracker");
      return false;
    }
    setError("");
    setNotice(success);
    await load();
    return true;
  }

  async function activityAction(body: unknown, success: string) {
    const r = await fetch("/api/modules/activities", { method: "POST", headers, body: JSON.stringify(body) });
    const data = await readJson<{ error?: string }>(r);
    if (!r.ok) {
      setNotice("");
      setError(data.error || "Gagal menyimpan aktivitas");
      return false;
    }
    setError("");
    setNotice(success);
    await load();
    return true;
  }

  async function toggle(day: number, activityIdx: number) {
    if (mod) await post("/api/modules/checks", { moduleId: mod.id, day, activityIdx });
  }

  async function logout() {
    await post("/api/auth/logout", {});
    router.replace("/login");
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const days = Number(f.get("days"));
    const tagline = String(f.get("tagline") || "").trim() || "Fondasi Ketenangan";
    const phases = TRACKER_PHASE_DEFAULTS.map((phase, idx) => ({
      label: String(f.get(`phaseLabel-${idx}`) || phase.label).trim(),
      description: String(f.get(`phaseDescription-${idx}`) || phase.description).trim(),
      targetPercent: Number(f.get(`phaseTarget-${idx}`) || phase.targetPercent),
    }));
    const r = await fetch("/api/modules", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: f.get("title"), subtitle: `${days} Hari — ${tagline}`, days, activities: [], phases }),
    });
    const data = await readJson<{ error?: string; id?: string }>(r);
    if (!r.ok) {
      setNotice("");
      setError(data.error || "Gagal membuat tracker");
      return;
    }
    setError("");
    setNotice("Tracker baru berhasil dibuat, silakan tambahkan aktivitas.");
    setModal(false);
    e.currentTarget.reset();
    await load();
    if (data.id) setActive(data.id);
  }

  async function updateTrackerTitle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mod) return;
    const title = titleDraft.trim();
    if (!title) {
      setNotice("");
      setError("Judul tracker tidak boleh kosong");
      return;
    }
    if (title.length > 50) {
      setNotice("");
      setError("Judul tracker maksimal 50 karakter");
      return;
    }
    if (await patchModule({ moduleId: mod.id, title }, "Judul tracker berhasil diperbarui.")) setTitleEditing(false);
  }

  async function addActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mod) return;
    if (activityCount >= 10) {
      setError("Maksimal 10 aktivitas per tracker");
      setNotice("");
      return;
    }
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim();
    if (await activityAction({ action: "add", moduleId: mod.id, name }, "Aktivitas berhasil ditambahkan.")) form.reset();
  }

  async function updateActivity(e: React.FormEvent<HTMLFormElement>, activityIdx: number) {
    e.preventDefault();
    if (!mod) return;
    const name = String(new FormData(e.currentTarget).get("name") || "").trim();
    await activityAction({ action: "update", moduleId: mod.id, activityIdx, name }, "Aktivitas berhasil diperbarui.");
  }

  async function deleteActivity(activityIdx: number) {
    if (!mod) return;
    await activityAction({ action: "delete", moduleId: mod.id, activityIdx }, "Aktivitas berhasil dihapus.");
  }

  async function updateStartDate(startDate: string | null) {
    if (!mod) return;
    if (await post("/api/modules/start-date", { moduleId: mod.id, startDate })) {
      setNotice(startDate ? "Tanggal mulai berhasil diperbarui." : "Tanggal mulai dikosongkan.");
    }
  }

  if (!user || !mod) {
    return (
      <main className="auth-shell">
        <div className="eyebrow">Memuat tracker...</div>
      </main>
    );
  }

  const checkSet = new Set(mod.checks.map((c) => `${c.day}-${c.activityIdx}`));
  const filledActivities = mod.activities.filter(Boolean);
  const trackerTitle = mod.title?.trim() || "Judul Tracker Anda";
  const needsSetup = filledActivities.length === 0 || !mod.startDate;
  const activitiesLocked = mod.locksActivities && !!mod.startDate;
  const totalWeeks = Math.ceil(mod.days / 7);
  const safeWeekIndex = Math.min(weekIndex, totalWeeks - 1);
  const pageStart = showAllDays ? 1 : safeWeekIndex * 7 + 1;
  const pageEnd = showAllDays ? mod.days : Math.min(pageStart + 6, mod.days);
  const visibleDays = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
  const todayDone = stats.today ? mod.activities.filter((a, i) => a && checkSet.has(`${stats.today}-${i}`)).length : 0;
  const statCards = [
    { label: "Progres Total", value: `${stats.pct}%`, icon: Gauge },
    { label: "Hari Sempurna", value: `${stats.perfect}/${mod.days}`, icon: Trophy },
    { label: "Streak Hari", value: stats.streak, icon: Flame },
    { label: "Hari Ke-", value: stats.today || "-", icon: Target },
  ];

  return (
    <div className="shell dashboard-shell">
      <AppHeader user={user} active="dashboard" onProfile={() => setProfileModal(true)} onLogout={logout} />

      <main className="content dashboard-content" id="overview">
        <section className="hero dashboard-hero">
          <div>
            <div className="eyebrow">Halo, {user.name}</div>
            {titleEditing ? (
              <form className="title-edit-form" onSubmit={updateTrackerTitle}>
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  maxLength={50}
                  required
                  autoFocus
                  aria-label="Judul tracker"
                />
                <button className="primary icon-only" type="submit" aria-label="Simpan judul tracker">
                  <Save size={16} />
                </button>
              </form>
            ) : (
              <h1>
                <button
                  className="title-inline"
                  type="button"
                  onClick={() => {
                    setTitleDraft(trackerTitle);
                    setTitleEditing(true);
                  }}
                  aria-label="Edit judul tracker"
                >
                  <span>{trackerTitle}</span>
                  <PencilLine size={18} />
                </button>
              </h1>
            )}
            <div className="muted">{mod.subtitle}</div>
          </div>
          <div className="hero-actions">
            {mods.length > 1 && (
              <div className="tracker-chip">
                <Sparkles size={15} />
                {trackerTitle}
              </div>
            )}
            <button className="primary icon-button hero-add-tracker" onClick={() => setModal(true)}>
              <Plus size={18} />
              Tracker
            </button>
          </div>
        </section>

        {mods.length > 1 && (
          <div className="tabs tracker-tabs">
            {mods.map((m) => (
              <button
                key={m.id}
                className={`pill ${m.id === mod.id ? "active" : ""}`}
                onClick={() => {
                  setActive(m.id);
                  setTitleEditing(false);
                }}
              >
                <CheckCircle2 size={15} />
                {m.title?.trim() || "Judul Tracker Anda"}
              </button>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice success">{notice}</p>}

        <section className="grid-stats">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div className="card stat glass-card" key={label}>
              <span className="stat-icon">
                <Icon size={22} />
              </span>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </section>

        {stats.today && filledActivities.length > 0 && (
          <section className="card glass-card today">
            <div className="row between">
              <div className="section-title-row">
                <span className="section-icon">
                  <CheckCircle2 size={19} />
                </span>
                <div>
                  <b>Hari Ini</b>
                  <small className="date-hint">Selesaikan checklist kecil hari ini.</small>
                </div>
              </div>
              <span className="progress-badge">
                {todayDone}/{filledActivities.length}
              </span>
            </div>
            <div className="today-list">
              {mod.activities.map(
                (a, i) =>
                  a && (
                    <button key={i} className={checkSet.has(`${stats.today}-${i}`) ? "on" : ""} onClick={() => toggle(stats.today!, i)}>
                      <span className="tick">{checkSet.has(`${stats.today}-${i}`) ? <Check size={16} /> : <Circle size={14} />}</span>
                      <span>{a}</span>
                    </button>
                  ),
              )}
            </div>
          </section>
        )}

        <section className="card glass-card tracker-card" id="tracker">
          <div className="section-title-row">
            <span className="section-icon">
              <ClipboardList size={19} />
            </span>
            <div>
              <b>Tracker {mod.days} Hari</b>
              <p className="muted">Geser tabel ke samping untuk semua aktivitas.</p>
            </div>
          </div>
          {filledActivities.length === 0 ? (
            <div className="empty-state">Tambahkan aktivitas lebih dulu agar tabel tracking bisa digunakan.</div>
          ) : (
            <>
              {!showAllDays && totalWeeks > 1 && (
                <div className="tracker-pager row between">
                  <button
                    type="button"
                    className="secondary icon-only"
                    onClick={() => setWeekIndex((w) => Math.max(w - 1, 0))}
                    disabled={safeWeekIndex === 0}
                    aria-label="Minggu sebelumnya"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="tracker-pager-label">
                    Hari {pageStart}-{pageEnd} dari {mod.days}
                  </span>
                  <button
                    type="button"
                    className="secondary icon-only"
                    onClick={() => setWeekIndex((w) => Math.min(w + 1, totalWeeks - 1))}
                    disabled={safeWeekIndex >= totalWeeks - 1}
                    aria-label="Minggu berikutnya"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              <div className="table-wrap">
                <table className="tracker-grid">
                  <thead>
                    <tr>
                      <th>Hari</th>
                      {mod.activities.map((a, i) => (
                        <th key={i}>{a || `Akt. ${i + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDays.map((d) => (
                      <tr key={d}>
                        <td>{d}</td>
                        {mod.activities.map((a, i) => (
                          <td key={i}>
                            <span className="cell-label">{a || `Akt. ${i + 1}`}</span>
                            <button
                              disabled={!a}
                              aria-label={`Hari ${d} ${a}`}
                              onClick={() => toggle(d, i)}
                              className={`cell ${checkSet.has(`${d}-${i}`) ? "on" : ""}`}
                            >
                              {checkSet.has(`${d}-${i}`) ? <Check size={15} /> : ""}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalWeeks > 1 && (
                <button type="button" className="secondary tracker-toggle-all" onClick={() => setShowAllDays((v) => !v)}>
                  {showAllDays ? "Tampilkan per minggu" : `Lihat semua ${mod.days} hari`}
                </button>
              )}
            </>
          )}
        </section>

        <details className="settings-disclosure card glass-card" open={needsSetup}>
          <summary className="section-title-row">
            <span className="section-icon">
              <Settings2 size={19} />
            </span>
            <div>
              <b>Pengaturan tracker</b>
              <p className="muted">Tanggal mulai dan daftar aktivitas yang ditrack.</p>
            </div>
          </summary>

          <div className="settings-disclosure-body">
            <div className="settings-block">
              <div className="section-title-row">
                <span className="section-icon">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <b>Tanggal mulai</b>
                  <small className="date-hint">Pilih tanggal mulai dari kalender.</small>
                </div>
              </div>
              <StartDatePicker value={mod.startDate ? mod.startDate.slice(0, 10) : null} onChange={updateStartDate} />
            </div>

            <div className="settings-block">
              <div className="section-title-row">
                <span className="section-icon">
                  <ListPlus size={19} />
                </span>
                <div>
                  <b>Kelola aktivitas</b>
                  <p className="muted">
                    {activitiesLocked
                      ? "Aktivitas terkunci karena project sudah dimulai. Aktivitas bersifat tetap sepanjang perjalanan habit ini."
                      : "Tambahkan, edit, atau hapus aktivitas yang ingin Anda track. Maksimal 10 aktivitas per tracker. Aktivitas terkunci begitu tanggal mulai diatur."}
                  </p>
                </div>
              </div>
              {activitiesLocked ? (
                <p className="notice success activity-locked-notice">
                  <Lock size={14} />
                  Aktivitas tracker ini tetap ({filledActivities.length} aktivitas) selama project berjalan.
                </p>
              ) : (
                <>
                  <div className="activity-count">
                    {activityCount}/10 aktivitas digunakan
                  </div>
                  <div className="activity-progress" aria-hidden="true">
                    <span style={{ width: `${activityCount * 10}%` }} />
                  </div>
                  <div className="activity-list">
                    {mod.activities.length === 0 && (
                      <div className="empty-state">Belum ada aktivitas. Tambahkan aktivitas pertama untuk mulai tracking.</div>
                    )}
                    {mod.activities.map((activity, idx) => (
                      <form className="activity-row" key={`${mod.id}-${idx}-${activity}`} onSubmit={(e) => updateActivity(e, idx)}>
                        <input name="name" defaultValue={activity} maxLength={60} required aria-label={`Edit aktivitas ${activity}`} />
                        <button className="secondary icon-only" type="submit" aria-label="Simpan perubahan aktivitas">
                          <Save size={16} />
                        </button>
                        <button className="danger icon-only" type="button" onClick={() => deleteActivity(idx)} aria-label={`Hapus aktivitas ${activity}`}>
                          <Trash2 size={16} />
                        </button>
                      </form>
                    ))}
                  </div>
                  <form className="activity-add" onSubmit={addActivity}>
                    <input name="name" placeholder={activityCount >= 10 ? "Batas maksimal 10 aktivitas tercapai" : "Tambah aktivitas baru"} maxLength={60} disabled={activityCount >= 10} required />
                    <button className="primary icon-button" disabled={activityCount >= 10}>
                      <Plus size={18} />
                      Tambah
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </details>

        {mod.phases.length > 0 && (
          <section id="phases">
            <div className="section-title-row phase-section-heading">
              <span className="section-icon">
                <BookOpenText size={19} />
              </span>
              <div>
                <b>Perjalanan Fase</b>
                <p className="muted">{mod.phases.length} fase menuju {mod.days} hari.</p>
              </div>
            </div>

            <div className="phase-timeline" role="img" aria-label={`Progres ${mod.phases.length} fase tracker`}>
              {mod.phases.map((p, i) => {
                const s = phaseStatsList[i];
                const statusClass = s.status === "completed" ? (s.targetMet ? "met" : "missed") : s.status;
                return (
                  <span
                    key={p.label}
                    className={`phase-timeline-segment status-${statusClass}`}
                    style={{ flexGrow: p.endDay - p.startDay + 1 }}
                    title={`${p.label}: hari ${p.startDay}-${p.endDay}`}
                  />
                );
              })}
            </div>

            <div className="phase-stack">
              {mod.phases.map((p, i) => {
                const s = phaseStatsList[i];
                const Icon = PHASE_ICONS[i % PHASE_ICONS.length];
                const statusLabel =
                  s.status === "upcoming" ? "Akan datang" : s.status === "active" ? "Sedang berjalan" : s.targetMet ? "Selesai · Target tercapai" : "Selesai · Target belum tercapai";
                const StatusIcon = s.status === "upcoming" ? Lock : s.status === "active" ? Flame : s.targetMet ? Trophy : AlertTriangle;
                return (
                  <article
                    className={`card glass-card phase-card phase-accent-${i % 4} ${s.status === "active" ? "phase-card-active" : ""}`}
                    key={p.label}
                  >
                    <div className="section-title-row phase-card-heading">
                      <span className="section-icon phase-icon">
                        <Icon size={19} />
                      </span>
                      <div>
                        <b>
                          {p.label} <span>· Hari {p.startDay}-{p.endDay}</span>
                        </b>
                        <p className="muted">{p.description}</p>
                      </div>
                      <span className={`phase-status-badge status-${s.status === "completed" ? (s.targetMet ? "met" : "missed") : s.status}`}>
                        <StatusIcon size={13} />
                        {statusLabel}
                      </span>
                    </div>

                    {s.status === "upcoming" ? (
                      <p className="muted phase-upcoming-hint">Target: {p.targetPercent}% checklist selesai selama fase ini.</p>
                    ) : (
                      <div className="phase-progress">
                        <div className="phase-progress-bar">
                          <div className="phase-progress-fill" style={{ width: `${Math.min(s.percent, 100)}%` }} />
                        </div>
                        <div className="phase-progress-meta">
                          <span>{s.percent}% · Target {p.targetPercent}%</span>
                          <span>{s.perfectDays} hari sempurna · Streak {s.streak}</span>
                        </div>
                      </div>
                    )}

                    {s.status === "completed" && s.targetMet === false && (
                      <p className="phase-recommendation">
                        Target fase ini belum tercapai ({s.percent}% dari {p.targetPercent}%). Coba fokus konsisten centang aktivitas harian di fase berikutnya agar tidak tertinggal jauh.
                      </p>
                    )}

                    <div className="field">
                      <label>
                        <NotebookPen size={14} />
                        Catatan refleksi
                      </label>
                      <textarea
                        placeholder="Tulis refleksi Anda di sini..."
                        defaultValue={mod.notes.find((n) => n.phaseKey === `phase-${i}`)?.content || ""}
                        onBlur={(e) => post("/api/modules/notes", { moduleId: mod.id, phaseKey: `phase-${i}`, content: e.target.value })}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <MobileBottomNav
        active="dashboard"
        onPrimary={() => setModal(true)}
        onSettings={() => setProfileModal(true)}
        primaryLabel="Tambah tracker"
      />

      {profileModal && (
        <div className="modal profile-modal" onClick={() => setProfileModal(false)}>
          <div className="profile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <ProfileSettings onClose={() => setProfileModal(false)} onSaved={(updated) => setUser(updated)} />
          </div>
        </div>
      )}

      {modal && (
        <div className="modal" onClick={() => setModal(false)}>
          <form className="sheet glass-card" onClick={(e) => e.stopPropagation()} onSubmit={create}>
            <div className="row between">
              <div className="section-title-row">
                <span className="section-icon">
                  <Plus size={19} />
                </span>
                <h2>Tracker baru</h2>
              </div>
              <button type="button" className="secondary" onClick={() => setModal(false)}>
                Tutup
              </button>
            </div>
            <div className="field">
              <label>Nama tracker</label>
              <input name="title" required maxLength={50} placeholder="Belajar, Olahraga, Kerja Proyek" />
            </div>
            <div className="field">
              <label>Tagline tracker</label>
              <input name="tagline" maxLength={80} placeholder="Fondasi Ketenangan" />
              <small className="date-hint">Format tampilan: Jumlah Hari — Tagline Anda.</small>
            </div>
            <div className="field">
              <label>Jumlah hari (minimal 40)</label>
              <input name="days" type="number" min="40" max="100" defaultValue="40" required />
            </div>
            <div className="field">
              <label>Perjalanan fase</label>
              <small className="date-hint">Rentang hari akan dibagi otomatis sesuai jumlah hari, label dan target bisa Anda sesuaikan.</small>
              <div className="phase-create-list">
                {TRACKER_PHASE_DEFAULTS.map((phase, idx) => (
                  <div className="phase-create-item" key={phase.label}>
                    <div className="row between">
                      <b>Fase {idx + 1}</b>
                      <input
                        name={`phaseTarget-${idx}`}
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={phase.targetPercent}
                        aria-label={`Target fase ${idx + 1}`}
                      />
                    </div>
                    <input name={`phaseLabel-${idx}`} defaultValue={phase.label} maxLength={80} required aria-label={`Label fase ${idx + 1}`} />
                    <textarea
                      name={`phaseDescription-${idx}`}
                      defaultValue={phase.description}
                      maxLength={180}
                      required
                      aria-label={`Deskripsi fase ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="tracker-fresh-state">
              <div className="row between">
                <span>Aktivitas tracker baru</span>
                <b>0/10 aktivitas digunakan</b>
              </div>
              <div className="activity-progress" aria-hidden="true">
                <span style={{ width: "0%" }} />
              </div>
              <small className="date-hint">Tracker baru dimulai kosong supaya tidak membawa aktivitas dari tracker sebelumnya.</small>
            </div>
            <button className="primary full icon-button">
              <Plus size={18} />
              Buat tracker
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
