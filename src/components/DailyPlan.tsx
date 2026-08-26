"use client";

import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProfileSettings from "@/components/ProfileSettings";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  History,
  LayoutGrid,
  ListPlus,
  Lock,
  Printer,
  Rows3,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effectiveBlockStatus, findOverlappingBlock, formatMinutes, MAX_BLOCKS_PER_DAY, parseTimeToMinutes, shiftISODate, sortByStart, todayLocalISO } from "@/lib/dailyPlan";

type Block = { id: string; label: string; startMinute: number; endMinute: number; status: "SCHEDULED" | "COMPLETED" | "RESCHEDULED"; completedAt: string | null; rescheduledAt: string | null; rescheduledToBlockId: string | null; rescheduleReason: string | null };
type PlanMeta = { id: string; date: string; locked: boolean } | null;
type HistoryItem = { date: string; locked: boolean; blockCount: number; completedCount: number; rescheduledCount: number };
type User = { name: string; email: string; role: string };

const jsonHeaders = { "Content-Type": "application/json" };
const DURATION_PRESETS = [30, 60, 90, 120];

export default function DailyPlan() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState(todayLocalISO());
  const [plan, setPlan] = useState<PlanMeta>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rescheduleBlock, setRescheduleBlock] = useState<Block | null>(null);
  const [undoBlockId, setUndoBlockId] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notifyOn, setNotifyOn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (targetDate: string) => {
      const s = await fetch("/api/auth/session");
      if (s.status === 401) {
        router.replace("/login");
        return;
      }
      const sj = await s.json();
      setUser(sj.user);
      const [planRes, historyRes] = await Promise.all([
        fetch(`/api/daily-plan?date=${targetDate}`),
        fetch("/api/daily-plan/history"),
      ]);
      if (planRes.ok) {
        const pj = await planRes.json();
        setPlan(pj.plan);
        setBlocks(pj.blocks);
      }
      if (historyRes.ok) setHistory(await historyRes.json());
      setLoaded(true);
    },
    [router],
  );

  useEffect(() => {
    load(date);
  }, [date, load]);

  useEffect(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    if (!notifyOn || date !== todayLocalISO() || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const now = new Date();
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    for (const b of blocks) {
      if (b.startMinute <= nowMinute || notifiedRef.current.has(b.id)) continue;
      const delayMs = (b.startMinute - nowMinute) * 60_000 - now.getSeconds() * 1000;
      const id = window.setTimeout(() => {
        new Notification(`Waktunya: ${b.label}`, { body: `${formatMinutes(b.startMinute)} - ${formatMinutes(b.endMinute)}`, tag: b.id });
        notifiedRef.current.add(b.id);
      }, Math.max(delayMs, 0));
      timers.current.push(id);
    }
    return () => {
      timers.current.forEach((tid) => clearTimeout(tid));
      timers.current = [];
    };
  }, [notifyOn, blocks, date]);

  const sorted = useMemo(() => sortByStart(blocks).sort((a, b) => {
    const rank = (block: Block) => block.status === "COMPLETED" ? 2 : block.status === "RESCHEDULED" ? 3 : 1;
    return rank(a) - rank(b);
  }), [blocks]);
  const locked = !!plan?.locked;
  const atLimit = blocks.filter((block) => block.status !== "RESCHEDULED").length >= MAX_BLOCKS_PER_DAY;
  const isToday = date === todayLocalISO();

  async function submitPost(path: string, body: unknown) {
    const r = await fetch(path, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setNotice("");
      setError(data.error || "Gagal menyimpan");
      return null;
    }
    setError("");
    return data;
  }

  function applyDuration(minutes: number) {
    const start = parseTimeToMinutes(startRef.current?.value || "");
    if (start === null || !endRef.current) return;
    endRef.current.value = formatMinutes(Math.min(start + minutes, 1439));
  }

  async function addBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return setError("Rencana harian ini sudah dikunci.");
    if (atLimit) return setError(`Maksimal ${MAX_BLOCKS_PER_DAY} aktivitas per hari.`);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const label = String(fd.get("label") || "").trim();
    const startMinute = parseTimeToMinutes(String(fd.get("startTime") || ""));
    const endMinute = parseTimeToMinutes(String(fd.get("endTime") || ""));
    if (startMinute === null || endMinute === null) return setError("Format waktu tidak valid.");
    if (endMinute <= startMinute) return setError("Waktu selesai harus setelah waktu mulai.");
    if (findOverlappingBlock(blocks.filter((block) => block.status !== "RESCHEDULED"), { startMinute, endMinute })) return setError("Blok waktu bertabrakan dengan blok lain.");
    const created = await submitPost("/api/daily-plan/blocks", { action: "add", date, label, startMinute, endMinute });
    if (created) {
      setNotice("Blok waktu berhasil ditambahkan.");
      form.reset();
      await load(date);
    }
  }

  async function updateBlock(e: FormEvent<HTMLFormElement>, block: Block) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const label = String(fd.get("label") || "").trim();
    const startMinute = parseTimeToMinutes(String(fd.get("startTime") || ""));
    const endMinute = parseTimeToMinutes(String(fd.get("endTime") || ""));
    if (startMinute === null || endMinute === null) return setError("Format waktu tidak valid.");
    if (endMinute <= startMinute) return setError("Waktu selesai harus setelah waktu mulai.");
    if (findOverlappingBlock(blocks, { startMinute, endMinute }, block.id)) return setError("Blok waktu bertabrakan dengan blok lain.");
    const updated = await submitPost("/api/daily-plan/blocks", { action: "update", blockId: block.id, label, startMinute, endMinute });
    if (updated) {
      setNotice("Blok waktu berhasil diperbarui.");
      setEditingId(null);
      await load(date);
    }
  }

  async function deleteBlock(id: string) {
    const ok = await submitPost("/api/daily-plan/blocks", { action: "delete", blockId: id });
    if (ok) {
      setNotice("Blok waktu dihapus.");
      await load(date);
    }
  }

  async function setCompleted(block: Block, completed: boolean) {
    const result = await submitPost("/api/daily-plan/complete", { blockId: block.id, completed });
    if (!result) return;
    setNotice(completed ? `${block.label} ditandai selesai.` : `Status ${block.label} dikembalikan.`);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoBlockId(completed ? block.id : null);
    if (completed) undoTimerRef.current = setTimeout(() => setUndoBlockId(null), 5000);
    await load(date);
  }

  async function submitReschedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rescheduleBlock) return;
    const fd = new FormData(e.currentTarget);
    const targetDate = String(fd.get("targetDate") || "");
    const startMinute = parseTimeToMinutes(String(fd.get("startTime") || ""));
    const endMinute = parseTimeToMinutes(String(fd.get("endTime") || ""));
    const reason = String(fd.get("reason") || "").trim();
    if (!targetDate || startMinute === null || endMinute === null) return setError("Tanggal dan jam baru wajib diisi.");
    if (endMinute <= startMinute) return setError("Waktu selesai harus setelah waktu mulai.");
    const result = await submitPost("/api/daily-plan/reschedule", { blockId: rescheduleBlock.id, targetDate, startMinute, endMinute, reason });
    if (!result) return;
    setNotice(`${rescheduleBlock.label} dipindahkan ke ${targetDate}.`);
    setRescheduleBlock(null);
    await load(date);
  }

  function statusOf(block: Block) {
    return effectiveBlockStatus(block.status, date, block.endMinute);
  }

  async function logout() {
    router.push("/logout");
  }

  async function toggleLock() {
    const result = await submitPost("/api/daily-plan/lock", { date, locked: !locked });
    if (result) {
      setNotice(result.locked ? "Rencana harian dikunci." : "Rencana harian dibuka kembali.");
      await load(date);
    }
  }

  async function enableReminders() {
    if (typeof Notification === "undefined") return setError("Browser ini tidak mendukung notifikasi.");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifyOn(true);
      setNotice("Pengingat aktif untuk blok waktu hari ini selama tab ini terbuka.");
    } else {
      setError("Izin notifikasi ditolak oleh browser.");
    }
  }

  function exportCsv() {
    const rows = [["Tanggal", "Mulai", "Selesai", "Aktivitas"], ...sorted.map((b) => [date, formatMinutes(b.startMinute), formatMinutes(b.endMinute), b.label])];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-plan-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function focusAddForm() {
    document.getElementById("add-time-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#add-time-block input[name='label']")?.focus(), 250);
  }

  function executionActions(block: Block) {
    const status = statusOf(block);
    if (status === "RESCHEDULED") return <span className="block-status rescheduled">Dipindahkan</span>;
    return (
      <div className="execution-actions">
        <button
          type="button"
          className={`done-action ${status === "COMPLETED" ? "completed" : ""}`}
          onClick={() => setCompleted(block, status !== "COMPLETED")}
          aria-label={status === "COMPLETED" ? `Batalkan selesai ${block.label}` : `Tandai selesai ${block.label}`}
        >
          <CheckCircle2 size={16} />
          {status === "COMPLETED" ? "Selesai" : "Done"}
        </button>
        {status !== "COMPLETED" && (
          <button type="button" className="reschedule-action" onClick={() => setRescheduleBlock(block)} aria-label={`Reschedule ${block.label}`}>
            <CalendarClock size={16} />
            Reschedule
          </button>
        )}
        {status === "MISSED" && <span className="block-status missed">Terlewat</span>}
      </div>
    );
  }

  if (!loaded || !user) {
    return (
      <main className="auth-shell">
        <div className="eyebrow">Memuat daily plan...</div>
      </main>
    );
  }

  return (
    <div className="shell dashboard-shell">
      <AppHeader user={user} active="daily-plan" onProfile={() => setProfileModal(true)} onLogout={logout} />

      <main className="content dashboard-content" id="daily-plan">
        <section className="hero dashboard-hero no-print">
          <div>
            <div className="eyebrow">Rencana harian</div>
            <h1>Time Blocking</h1>
            <div className="muted">Bagi waktu Anda ke dalam blok aktivitas untuk manajemen waktu harian.</div>
          </div>
          <div className="hero-actions">
            <button type="button" className="secondary icon-button" onClick={exportCsv} disabled={blocks.length === 0}>
              <Download size={16} />
              CSV
            </button>
            <button type="button" className="secondary icon-button" onClick={() => window.print()} disabled={blocks.length === 0}>
              <Printer size={16} />
              Cetak / PDF
            </button>
            {!notifyOn && (
              <button type="button" className="secondary icon-button" onClick={enableReminders} disabled={!isToday}>
                <BellRing size={16} />
                Pengingat
              </button>
            )}
          </div>
        </section>

        <section className="card glass-card plan-toolbar no-print">
          <div className="plan-date-nav">
            <button type="button" className="secondary icon-only" onClick={() => setDate((d) => shiftISODate(d, -1))} aria-label="Hari sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pilih tanggal" />
            <button type="button" className="secondary icon-only" onClick={() => setDate((d) => shiftISODate(d, 1))} aria-label="Hari berikutnya">
              <ChevronRight size={18} />
            </button>
            {!isToday && (
              <button type="button" className="pill" onClick={() => setDate(todayLocalISO())}>
                Hari ini
              </button>
            )}
          </div>
          <div className="row between">
            <div className="activity-count">
              {blocks.length}/{MAX_BLOCKS_PER_DAY} aktivitas digunakan
            </div>
            <div className="row">
              <div className="view-toggle">
                <button type="button" className={`pill ${view === "timeline" ? "active" : ""}`} onClick={() => setView("timeline")}>
                  <Rows3 size={14} />
                  Timeline
                </button>
                <button type="button" className={`pill ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
                  <LayoutGrid size={14} />
                  Grid
                </button>
              </div>
              <button type="button" className={locked ? "secondary icon-button" : "primary icon-button"} onClick={toggleLock}>
                {locked ? <Unlock size={16} /> : <Lock size={16} />}
                {locked ? "Buka Kunci" : "Kunci Rencana"}
              </button>
            </div>
          </div>
        </section>

        {error && <p className="error no-print">{error}</p>}
        {notice && <p className="notice success no-print">{notice}</p>}
        {locked && <p className="notice success no-print">Rencana harian ini terkunci. Buka kunci untuk mengubahnya.</p>}

        <section className="card glass-card activity-manager no-print" id="add-time-block">
          <div className="section-title-row">
            <span className="section-icon">
              <ListPlus size={19} />
            </span>
            <div>
              <b>Tambah blok waktu</b>
              <p className="muted">Isi jam mulai, jam selesai, dan aktivitas. Maksimal {MAX_BLOCKS_PER_DAY} blok per hari, tidak boleh bertabrakan.</p>
            </div>
          </div>
          <form className="block-add-form" onSubmit={addBlock}>
            <div className="field">
              <label>Aktivitas</label>
              <input name="label" placeholder="Mis. Olahraga pagi" maxLength={60} required disabled={locked || atLimit} />
            </div>
            <div className="field">
              <label>Mulai</label>
              <input ref={startRef} name="startTime" type="time" required disabled={locked || atLimit} />
            </div>
            <div className="field">
              <label>Selesai</label>
              <input ref={endRef} name="endTime" type="time" required disabled={locked || atLimit} />
            </div>
            <div className="duration-presets">
              {DURATION_PRESETS.map((mins) => (
                <button key={mins} type="button" className="secondary" onClick={() => applyDuration(mins)} disabled={locked || atLimit}>
                  {mins < 60 ? `${mins} mnt` : `${mins / 60} jam`}
                </button>
              ))}
            </div>
            <button className="primary icon-button full" disabled={locked || atLimit}>
              <Clock3 size={18} />
              Tambah blok
            </button>
          </form>
        </section>

        {blocks.length === 0 ? (
          <div className="empty-state no-print">Belum ada blok waktu untuk tanggal ini. Tambahkan blok pertama Anda.</div>
        ) : view === "timeline" ? (
          <section className="card glass-card no-print">
            <ol className="timeline">
              {sorted.map((b) => (
                <li className={`timeline-block status-${statusOf(b).toLowerCase()}`} key={b.id}>
                  <span className="time-badge">
                    {formatMinutes(b.startMinute)} - {formatMinutes(b.endMinute)}
                  </span>
                  {editingId === b.id ? (
                    <form className="block-edit-form" onSubmit={(e) => updateBlock(e, b)}>
                      <input name="label" defaultValue={b.label} maxLength={60} required disabled={locked} />
                      <input name="startTime" type="time" defaultValue={formatMinutes(b.startMinute)} required disabled={locked} />
                      <input name="endTime" type="time" defaultValue={formatMinutes(b.endMinute)} required disabled={locked} />
                      <button className="secondary icon-only" type="submit" aria-label="Simpan blok" disabled={locked}>
                        <Clock3 size={16} />
                      </button>
                      <button className="secondary icon-only" type="button" onClick={() => setEditingId(null)} aria-label="Batal">
                        &times;
                      </button>
                    </form>
                  ) : (
                    <div className="timeline-block-body">
                      <span className="timeline-block-label">{b.label}</span>
                      {executionActions(b)}
                      <div className="timeline-block-actions">
                        <button type="button" className="secondary icon-only" onClick={() => setEditingId(b.id)} disabled={locked || b.status !== "SCHEDULED"} aria-label={`Edit ${b.label}`}>
                          <Clock3 size={16} />
                        </button>
                        <button type="button" className="danger icon-only" onClick={() => deleteBlock(b.id)} disabled={locked || b.status === "RESCHEDULED"} aria-label={`Hapus ${b.label}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="block-grid no-print">
            {sorted.map((b) => (
              <article className={`card glass-card block-card status-${statusOf(b).toLowerCase()}`} key={b.id}>
                <span className="time-badge">
                  {formatMinutes(b.startMinute)} - {formatMinutes(b.endMinute)}
                </span>
                <b>{b.label}</b>
                {executionActions(b)}
                <div className="timeline-block-actions">
                  <button type="button" className="secondary icon-only" onClick={() => setEditingId(b.id)} disabled={locked || b.status !== "SCHEDULED"} aria-label={`Edit ${b.label}`}>
                    <Clock3 size={16} />
                  </button>
                  <button type="button" className="danger icon-only" onClick={() => deleteBlock(b.id)} disabled={locked || b.status === "RESCHEDULED"} aria-label={`Hapus ${b.label}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {history.length > 0 && (
          <section className="card glass-card no-print">
            <div className="section-title-row">
              <span className="section-icon">
                <History size={19} />
              </span>
              <div>
                <b>Riwayat daily plan</b>
                <p className="muted">Lihat kembali rencana harian sebelumnya.</p>
              </div>
            </div>
            <div className="history-list">
              {history.map((h) => (
                <button key={h.date} type="button" className={`history-item ${h.date === date ? "active" : ""}`} onClick={() => setDate(h.date)}>
                  <span>{h.date}</span>
                  <span className="muted">{h.completedCount} selesai · {h.rescheduledCount} dipindah · {h.blockCount} total</span>
                  {h.locked && <Lock size={13} />}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="print-only">
          <h1>Daily Plan — {date}</h1>
          <p>{user.name}</p>
          <table>
            <thead>
              <tr>
                <th>Mulai</th>
                <th>Selesai</th>
                <th>Aktivitas</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id}>
                  <td>{formatMinutes(b.startMinute)}</td>
                  <td>{formatMinutes(b.endMinute)}</td>
                  <td>{b.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <MobileBottomNav
        active="daily-plan"
        onPrimary={focusAddForm}
        onSettings={() => setProfileModal(true)}
        primaryLabel="Tambah blok waktu"
      />

      {undoBlockId && (() => {
        const block = blocks.find((item) => item.id === undoBlockId);
        return block ? (
          <div className="undo-toast" role="status">
            <span>Aktivitas selesai.</span>
            <button type="button" onClick={() => setCompleted(block, false)}>Undo</button>
          </div>
        ) : null;
      })()}

      {rescheduleBlock && (
        <div className="modal reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onClick={() => setRescheduleBlock(null)}>
          <form className="reschedule-sheet" onSubmit={submitReschedule} onClick={(event) => event.stopPropagation()}>
            <div className="reschedule-heading">
              <div>
                <span className="eyebrow">Atur jadwal baru</span>
                <h2 id="reschedule-title">Reschedule</h2>
                <p className="muted">{rescheduleBlock.label}</p>
              </div>
              <button type="button" className="secondary icon-only" aria-label="Tutup reschedule" onClick={() => setRescheduleBlock(null)}><X size={18} /></button>
            </div>
            <div className="reschedule-quick-actions">
              <button type="button" className="pill" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) (form.elements.namedItem("targetDate") as HTMLInputElement).value = todayLocalISO();
              }}>Hari ini</button>
              <button type="button" className="pill" onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) (form.elements.namedItem("targetDate") as HTMLInputElement).value = shiftISODate(todayLocalISO(), 1);
              }}>Besok</button>
            </div>
            <div className="field"><label>Tanggal baru</label><input name="targetDate" type="date" min={todayLocalISO()} defaultValue={date < todayLocalISO() ? todayLocalISO() : date} required /></div>
            <div className="reschedule-times">
              <div className="field"><label>Jam mulai baru</label><input name="startTime" type="time" defaultValue={formatMinutes(rescheduleBlock.startMinute)} required /></div>
              <div className="field"><label>Jam selesai baru</label><input name="endTime" type="time" defaultValue={formatMinutes(rescheduleBlock.endMinute)} required /></div>
            </div>
            <div className="field"><label>Alasan <span className="muted">(opsional)</span></label><textarea name="reason" maxLength={200} placeholder="Contoh: ada agenda mendadak" /></div>
            <button className="primary icon-button full" type="submit"><CalendarClock size={18} />Simpan jadwal baru</button>
          </form>
        </div>
      )}

      {profileModal && (
        <div className="modal profile-modal" onClick={() => setProfileModal(false)}>
          <div className="profile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <ProfileSettings onClose={() => setProfileModal(false)} onSaved={(updated) => setUser(updated)} />
          </div>
        </div>
      )}
    </div>
  );
}
