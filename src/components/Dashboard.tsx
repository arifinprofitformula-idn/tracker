"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import PaywallBanner from "@/components/PaywallBanner";
import ProfileSettings from "@/components/ProfileSettings";
import { readJson } from "@/lib/http";
import {
  AlertTriangle,
  Bell,
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
  ImagePlus,
  Images,
  LoaderCircle,
  Lock,
  Mountain,
  MessageSquareQuote,
  NotebookPen,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculatePhaseStats } from "@/lib/tracker";

type Check = { day: number; activityIdx: number };
type Note = { phaseKey: string; content: string };
type Phase = { label: string; startDay: number; endDay: number; description: string; targetPercent: number };
type DailyProgress = { day: number; date: string; progress: number; status: "PENDING" | "SUBMITTED" | "MISSED" };
type Testimonial = { id: string; content: string };
type VisionImage = { id: string; width: number; height: number; position: number; createdAt: string };
type Mod = {
  id: string;
  ownerId: string;
  title: string;
  subtitle?: string;
  days: number;
  activities: string[];
  startDate?: string;
  endDate?: string;
  locksActivities: boolean;
  checks: Check[];
  notes: Note[];
  phases: Phase[];
  dailyProgress: DailyProgress[];
  testimonials: Testimonial[];
  visionImages: VisionImage[];
};
type User = { id: string; name: string; email: string; role: string };
type VisionMenu = { imageId: string; imageNumber: number; x: number; y: number };

const headers = { "Content-Type": "application/json" };
const PHASE_ICONS = [Rocket, Flame, Mountain, Trophy];
const TRACKER_PHASE_DEFAULTS = [
  { label: "Fase 1 — Pemanasan", description: "Fondasi kebiasaan dasar. Fokus membangun ritme awal.", targetPercent: 70 },
  { label: "Fase 2 — Pembentukan", description: "Konsistensi mulai terbentuk. Jaga agar tidak putus di tengah jalan.", targetPercent: 70 },
  { label: "Fase 3 — Penguatan", description: "Perkuat kebiasaan, evaluasi aktivitas yang paling berdampak.", targetPercent: 70 },
  { label: "Fase 4 — Puncak", description: "Pertahankan performa terbaik sampai program selesai.", targetPercent: 70 },
];

function localIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDaysIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateIso?: string) {
  if (!dateIso) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`));
}

function formatActiveDate(dateIso?: string) {
  const value = dateIso?.slice(0, 10) || localIsoDate();
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getTrackerSummary(tracker: Mod) {
  const rows = tracker.dailyProgress ?? [];
  const submitted = rows.filter((row) => row.status === "SUBMITTED").length;
  const missed = rows.filter((row) => row.status === "MISSED").length;
  const points = rows.reduce((sum, row) => sum + (row.status === "SUBMITTED" ? row.progress : 0), 0);
  const today = rows.find((row) => row.date.slice(0, 10) === localIsoDate());
  const isCompleted = !!tracker.endDate && localIsoDate() > tracker.endDate.slice(0, 10);

  return {
    submitted,
    missed,
    accountability: tracker.days ? Math.round((submitted / tracker.days) * 100) : 0,
    progress: tracker.days ? Math.round(points / tracker.days) : 0,
    today,
    isCompleted,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mods, setMods] = useState<Mod[]>([]);
  const [active, setActive] = useState("");
  const [modal, setModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState("");
  const [notice, setNotice] = useState("");
  const [createEndDate, setCreateEndDate] = useState(() => addDaysIso(localIsoDate(), 39));
  const [testimonialOpen, setTestimonialOpen] = useState(false);
  const [testimonialDraft, setTestimonialDraft] = useState("");
  const [testimonialDismissed, setTestimonialDismissed] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [visionPage, setVisionPage] = useState(0);
  const [visionUploading, setVisionUploading] = useState(false);
  const [visionDeleting, setVisionDeleting] = useState("");
  const [visionTouchStart, setVisionTouchStart] = useState<number | null>(null);
  const [visionMenu, setVisionMenu] = useState<VisionMenu | null>(null);
  const [showVisionHint, setShowVisionHint] = useState(false);
  const visionPressTimer = useRef<number | null>(null);
  const visionPressStart = useRef<{ x: number; y: number } | null>(null);
  const visionMenuAction = useRef<HTMLButtonElement>(null);

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
      setActive((current) => {
        if (current && m.some((tracker: Mod) => tracker.id === current)) return current;
        const today = localIsoDate();
        return m.find((tracker: Mod) => !tracker.endDate || tracker.endDate.slice(0, 10) >= today)?.id || m[0]?.id || "";
      });
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
  const lifecycle = useMemo(() => {
    if (!mod) return { submitted: 0, missed: 0, accountability: 0, progress: 0, today: undefined as DailyProgress | undefined };
    return getTrackerSummary(mod);
  }, [mod]);
  const trackerSummaries = useMemo(() => mods.map((tracker) => ({ tracker, summary: getTrackerSummary(tracker) })), [mods]);
  const todayTrackers = useMemo(
    () => trackerSummaries.filter(({ summary }) => summary.today && !summary.isCompleted).sort((a, b) => Number(a.summary.today?.status === "SUBMITTED") - Number(b.summary.today?.status === "SUBMITTED")),
    [trackerSummaries],
  );
  const phaseStatsList = useMemo(() => {
    if (!mod) return [];
    const checksByIndex = mod.checks.map((c) => ({ day: c.day, activityIndex: c.activityIdx }));
    return mod.phases.map((p) => calculatePhaseStats(p.startDay, p.endDay, stats.today, mod.activities, checksByIndex, p.targetPercent));
  }, [mod, stats.today]);

  useEffect(() => {
    setWeekIndex(stats.today ? Math.floor((stats.today - 1) / 7) : 0);
    setHistoryOpen(false);
  }, [mod, stats.today]);

  useEffect(() => {
    setVisionPage(0);
  }, [mod?.id]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((mod?.visionImages?.length ?? 0) / 2));
    setVisionPage(current => Math.min(current, totalPages - 1));
  }, [mod?.visionImages?.length]);

  useEffect(() => {
    if (!mod?.visionImages?.length) {
      setShowVisionHint(false);
      return;
    }
    setShowVisionHint(localStorage.getItem("vision-image-actions-discovered") !== "yes");
  }, [mod?.id, mod?.visionImages?.length]);

  useEffect(() => {
    if (!visionMenu) return;
    visionMenuAction.current?.focus();
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisionMenu(null);
    };
    const closeFromViewportChange = () => setVisionMenu(null);
    window.addEventListener("keydown", closeMenu);
    window.addEventListener("resize", closeFromViewportChange);
    window.addEventListener("scroll", closeFromViewportChange, true);
    return () => {
      window.removeEventListener("keydown", closeMenu);
      window.removeEventListener("resize", closeFromViewportChange);
      window.removeEventListener("scroll", closeFromViewportChange, true);
    };
  }, [visionMenu]);

  useEffect(() => () => {
    if (visionPressTimer.current) window.clearTimeout(visionPressTimer.current);
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [historyOpen]);

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

  useEffect(() => {
    setRemindersEnabled(localStorage.getItem("tracker-progress-reminders") === "on");
  }, []);

  useEffect(() => {
    if (!mod?.endDate || mod.ownerId !== user?.id || mod.testimonials?.length || testimonialDismissed === mod.id) return;
    if (localIsoDate() > mod.endDate.slice(0, 10)) {
      setTestimonialDraft("");
      setTestimonialOpen(true);
    }
  }, [mod, testimonialDismissed, user?.id]);

  useEffect(() => {
    if (!remindersEnabled || !mod || lifecycle.today?.status !== "PENDING" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notificationKey = `tracker-progress-notified-${mod.id}-${localIsoDate()}`;
    if (localStorage.getItem(notificationKey)) return;
    const now = new Date();
    const reminder = new Date(now);
    reminder.setHours(20, 0, 0, 0);
    const show = () => {
      new Notification("Isi progress tracker hari ini sebelum jam 23:59.", {
        body: `${mod.title}: satu langkah jujur hari ini membangun perubahan nyata.`,
        tag: notificationKey,
      });
      localStorage.setItem(notificationKey, "shown");
    };
    if (now >= reminder) {
      show();
      return;
    }
    const timer = window.setTimeout(show, reminder.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [remindersEnabled, mod, lifecycle.today]);

  async function post(path: string, body: unknown) {
    const r = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
    if (!r.ok) {
      const data = await readJson<{ error?: string; code?: string }>(r);
      setNotice("");
      setPaywall(data.code === "LIMIT_REACHED" ? data.error || "Limit paket Anda sudah tercapai." : "");
      setError(data.error || "Gagal");
      return false;
    }
    setError("");
    setPaywall("");
    await load();
    return true;
  }

  async function toggle(day: number, activityIdx: number) {
    if (mod) await post("/api/modules/checks", { moduleId: mod.id, day, activityIdx });
  }

  async function saveDailyProgress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mod || !stats.today) return;
    const progress = Number(new FormData(e.currentTarget).get("progress"));
    const r = await fetch(`/api/trackers/${mod.id}/progress`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ day: stats.today, progress }),
    });
    const data = await readJson<{ error?: string }>(r);
    if (!r.ok) {
      setError(data.error || "Gagal menyimpan progress harian");
      setNotice("");
      return;
    }
    setError("");
    setNotice("Progress hari ini tersimpan. Teruskan satu langkah berikutnya.");
    await load();
  }

  async function enableTrackerReminders() {
    if (typeof Notification === "undefined") {
      setError("Browser ini belum mendukung notifikasi.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Izin notifikasi belum diberikan.");
      return;
    }
    localStorage.setItem("tracker-progress-reminders", "on");
    setRemindersEnabled(true);
    setError("");
    setNotice("Pengingat progress harian aktif pukul 20:00.");
  }

  async function uploadVisionImages(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!mod || !files.length) return;
    if ((mod.visionImages?.length ?? 0) + files.length > 10) {
      setNotice("");
      setError("Maksimal 10 gambar impian per tracker.");
      input.value = "";
      return;
    }
    const formData = new FormData();
    files.forEach(file => formData.append("images", file));
    setVisionUploading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/trackers/${mod.id}/vision-images`, { method: "POST", body: formData });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error || "Gagal mengunggah gambar impian.");
        return;
      }
      setNotice(files.length > 1 ? `${files.length} gambar impian berhasil ditambahkan.` : "Gambar impian berhasil ditambahkan.");
      await load();
      setVisionPage(Math.floor((mod.visionImages?.length ?? 0) / 2));
    } catch {
      setError("Koneksi terputus saat mengunggah gambar.");
    } finally {
      setVisionUploading(false);
      input.value = "";
    }
  }

  async function deleteVisionImage(imageId: string) {
    if (!mod || !window.confirm("Hapus gambar impian ini?")) return;
    setVisionDeleting(imageId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/trackers/${mod.id}/vision-images/${imageId}`, { method: "DELETE" });
      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error || "Gagal menghapus gambar impian.");
        return;
      }
      setNotice("Gambar impian berhasil dihapus.");
      await load();
    } catch {
      setError("Koneksi terputus saat menghapus gambar.");
    } finally {
      setVisionDeleting("");
    }
  }

  function cancelVisionLongPress() {
    if (visionPressTimer.current) window.clearTimeout(visionPressTimer.current);
    visionPressTimer.current = null;
    visionPressStart.current = null;
  }

  function openVisionActions(imageId: string, imageNumber: number, clientX: number, clientY: number) {
    cancelVisionLongPress();
    localStorage.setItem("vision-image-actions-discovered", "yes");
    setShowVisionHint(false);
    setVisionMenu({
      imageId,
      imageNumber,
      x: Math.max(12, Math.min(clientX, window.innerWidth - 200)),
      y: Math.max(12, Math.min(clientY, window.innerHeight - 76)),
    });
  }

  function startVisionLongPress(event: React.PointerEvent<HTMLElement>, imageId: string, imageNumber: number) {
    if (event.pointerType === "mouse") return;
    cancelVisionLongPress();
    visionPressStart.current = { x: event.clientX, y: event.clientY };
    visionPressTimer.current = window.setTimeout(() => {
      navigator.vibrate?.(20);
      openVisionActions(imageId, imageNumber, event.clientX, event.clientY);
    }, 550);
  }

  function moveVisionLongPress(event: React.PointerEvent<HTMLElement>) {
    const start = visionPressStart.current;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) return;
    cancelVisionLongPress();
  }

  async function logout() {
    router.push("/logout");
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const endDate = String(f.get("endDate"));
    const days = Math.round((new Date(`${endDate}T00:00:00.000Z`).getTime() - new Date(`${localIsoDate()}T00:00:00.000Z`).getTime()) / 86_400_000) + 1;
    const activities = String(f.get("activities") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (activities.length < 1 || activities.length > 10) {
      setError("Isi 1 sampai 10 aktivitas, satu aktivitas per baris.");
      return;
    }
    const tagline = String(f.get("tagline") || "").trim() || "Fondasi Ketenangan";
    const phases = TRACKER_PHASE_DEFAULTS.map((phase, idx) => ({
      label: String(f.get(`phaseLabel-${idx}`) || phase.label).trim(),
      description: String(f.get(`phaseDescription-${idx}`) || phase.description).trim(),
      targetPercent: Number(f.get(`phaseTarget-${idx}`) || phase.targetPercent),
    }));
    const r = await fetch("/api/modules", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: f.get("title"), subtitle: `${days} Hari — ${tagline}`, days, endDate, activities, phases }),
    });
    const data = await readJson<{ error?: string; id?: string; code?: string }>(r);
    if (!r.ok) {
      setNotice("");
      setPaywall(data.code === "LIMIT_REACHED" ? data.error || "Limit paket Anda sudah tercapai." : "");
      setError(data.error || "Gagal membuat tracker");
      return;
    }
    setError("");
    setPaywall("");
    setNotice("Tracker dimulai hari ini. Tanggal perjalanan sudah dikunci.");
    setModal(false);
    e.currentTarget.reset();
    await load();
    if (data.id) setActive(data.id);
  }

  async function submitTestimonial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mod) return;
    const r = await fetch(`/api/trackers/${mod.id}/testimonial`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: testimonialDraft }),
    });
    const data = await readJson<{ error?: string }>(r);
    if (!r.ok) {
      setError(data.error || "Gagal menyimpan testimoni");
      return;
    }
    setTestimonialOpen(false);
    setError("");
    setNotice("Terima kasih. Kisah perubahan Anda sudah tersimpan.");
    await load();
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
  const totalWeeks = Math.ceil(mod.days / 7);
  const safeWeekIndex = Math.min(weekIndex, totalWeeks - 1);
  const pageStart = safeWeekIndex * 7 + 1;
  const pageEnd = Math.min(pageStart + 6, mod.days);
  const visibleDays = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
  const todayDone = stats.today ? mod.activities.filter((a, i) => a && checkSet.has(`${stats.today}-${i}`)).length : 0;
  const visionImages = mod.visionImages ?? [];
  const visionPageCount = Math.max(1, Math.ceil(visionImages.length / 2));
  const visibleVisionImages = visionImages.slice(visionPage * 2, visionPage * 2 + 2);
  const statCards = [
    { label: "Progress", value: `${lifecycle.progress}%`, icon: Gauge },
    { label: "Pencapaian", value: `${lifecycle.submitted}/${mod.days}`, icon: Trophy },
    { label: "Streak", value: stats.streak, icon: Flame },
    { label: "Target Hari", value: `${stats.today || 0}/${mod.days}`, icon: Target },
  ];

  return (
    <div className="shell dashboard-shell">
      <AppHeader user={user} active="dashboard" onProfile={() => setProfileModal(true)} onLogout={logout} />

      <main className="content dashboard-content" id="overview">
        <section className="hero dashboard-hero">
          <div>
            <div className="eyebrow">Halo, {user.name}</div>
            <h1>
              <span className="tracker-title-card">
                <span className="tracker-title-copy">
                  <span className="tracker-title-text">{trackerTitle}</span>
                  <small className="tracker-title-tagline">{mod.subtitle}</small>
                </span>
              </span>
            </h1>
          </div>
          <div className="hero-actions">
            <button className="primary icon-button hero-add-tracker" onClick={() => setModal(true)}>
              <Plus size={18} />
              Tracker
            </button>
          </div>
        </section>

        {paywall && <PaywallBanner compact message={paywall} />}
        {error && !paywall && <p className="error">{error}</p>}
        {notice && <p className="notice success">{notice}</p>}

        <div className="dashboard-focus-grid">
          <section className="card glass-card vision-board" aria-labelledby="vision-board-title">
            <div className="vision-board-heading">
              <div className="section-title-row">
                <div>
                  <b id="vision-board-title">Visualisasi Impian</b>
                  <small className="date-hint">Ingat alasan terbesar di balik perubahan ini.</small>
                </div>
              </div>
              <label aria-label="Tambah gambar impian" className={`secondary vision-upload-button ${visionUploading || visionImages.length >= 10 ? "is-disabled" : ""}`}>
                {visionUploading ? <LoaderCircle className="spin" size={17} /> : <ImagePlus size={17} />}
                {visionUploading ? "Memproses..." : "Tambah Gambar"}
                <input
                  className="vision-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={visionUploading || visionImages.length >= 10}
                  onChange={uploadVisionImages}
                />
              </label>
            </div>

            {visionImages.length === 0 ? (
              <div className="vision-empty">
                <span><Images size={28} /></span>
                <div>
                  <b>Apa perubahan terbesar yang ingin Anda wujudkan?</b>
                  <p>Tambahkan foto rumah, keluarga, perjalanan, karya, atau kehidupan yang sedang Anda perjuangkan.</p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="vision-slider"
                  onTouchStart={event => setVisionTouchStart(event.changedTouches[0]?.clientX ?? null)}
                  onTouchEnd={event => {
                    if (visionTouchStart === null || visionPageCount < 2) return;
                    const delta = event.changedTouches[0]?.clientX - visionTouchStart;
                    if (delta > 40) setVisionPage(current => Math.max(0, current - 1));
                    if (delta < -40) setVisionPage(current => Math.min(visionPageCount - 1, current + 1));
                    setVisionTouchStart(null);
                  }}
                >
                  {visibleVisionImages.map((image, index) => (
                    <figure
                      className={`vision-image ${visionDeleting === image.id ? "is-deleting" : ""}`}
                      key={image.id}
                      tabIndex={0}
                      aria-haspopup="menu"
                      aria-label={`Gambar impian ${visionPage * 2 + index + 1}. Tekan lama atau buka menu konteks untuk pilihan.`}
                      onContextMenu={event => {
                        event.preventDefault();
                        openVisionActions(image.id, visionPage * 2 + index + 1, event.clientX, event.clientY);
                      }}
                      onKeyDown={event => {
                        if (!(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return;
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        openVisionActions(image.id, visionPage * 2 + index + 1, rect.left + rect.width / 2, rect.top + rect.height / 2);
                      }}
                      onPointerDown={event => startVisionLongPress(event, image.id, visionPage * 2 + index + 1)}
                      onPointerMove={moveVisionLongPress}
                      onPointerUp={cancelVisionLongPress}
                      onPointerCancel={cancelVisionLongPress}
                      onPointerLeave={cancelVisionLongPress}
                    >
                      <Image
                        src={`/api/trackers/${mod.id}/vision-images/${image.id}`}
                        alt={`Gambar impian ${visionPage * 2 + index + 1} untuk ${trackerTitle}`}
                        fill
                        sizes="(max-width: 767px) 44vw, (max-width: 1200px) 34vw, 360px"
                        unoptimized
                      />
                      {visionDeleting === image.id && (
                        <span className="vision-deleting-status" role="status" aria-label="Menghapus gambar">
                          <LoaderCircle className="spin" size={20} />
                        </span>
                      )}
                    </figure>
                  ))}
                  {visibleVisionImages.length === 1 && visionImages.length < 10 && (
                    <label className="vision-add-tile">
                      <ImagePlus size={22} />
                      <span>Tambah impian lain</span>
                      <input className="vision-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={visionUploading} onChange={uploadVisionImages} />
                    </label>
                  )}
                </div>
                {visionPageCount > 1 && (
                  <div className="vision-controls" aria-label="Navigasi gambar impian">
                    <button type="button" aria-label="Slide sebelumnya" disabled={visionPage === 0} onClick={() => setVisionPage(current => Math.max(0, current - 1))}><ChevronLeft size={18} /></button>
                    <span className="vision-dots">
                      {Array.from({ length: visionPageCount }, (_, index) => (
                        <button key={index} type="button" className={index === visionPage ? "active" : ""} aria-label={`Buka slide ${index + 1}`} aria-current={index === visionPage ? "true" : undefined} onClick={() => setVisionPage(index)} />
                      ))}
                    </span>
                    <button type="button" aria-label="Slide berikutnya" disabled={visionPage === visionPageCount - 1} onClick={() => setVisionPage(current => Math.min(visionPageCount - 1, current + 1))}><ChevronRight size={18} /></button>
                  </div>
                )}
                {showVisionHint && (
                  <p className="vision-gesture-hint">Tekan lama gambar di mobile atau klik kanan di desktop untuk melihat pilihan.</p>
                )}
              </>
            )}

            {visionMenu && (
              <div
                className="vision-action-layer"
                role="presentation"
                onPointerDown={event => {
                  if (event.target === event.currentTarget) setVisionMenu(null);
                }}
                onContextMenu={event => event.preventDefault()}
              >
                <div
                  className="vision-action-menu"
                  role="menu"
                  aria-label={`Pilihan gambar impian ${visionMenu.imageNumber}`}
                  style={{ left: visionMenu.x, top: visionMenu.y }}
                >
                  <span className="vision-action-title">Pilihan gambar</span>
                  <button
                    ref={visionMenuAction}
                    type="button"
                    role="menuitem"
                    className="vision-action-delete"
                    onClick={() => {
                      const imageId = visionMenu.imageId;
                      setVisionMenu(null);
                      void deleteVisionImage(imageId);
                    }}
                  >
                    <Trash2 size={17} />
                    Hapus gambar
                  </button>
                  <button type="button" role="menuitem" className="vision-action-cancel" onClick={() => setVisionMenu(null)}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="grid-stats compact-stats" aria-label="Ringkasan tracker aktif">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div className="card stat glass-card" key={label}>
                <span className="stat-icon"><Icon size={18} /></span>
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </section>
        </div>

        {mods.length > 1 && (
          <section className="card glass-card tracker-portfolio" aria-labelledby="tracker-portfolio-title">
            <div className="section-title-row tracker-portfolio-heading">
              <span className="section-icon"><Sparkles size={19} /></span>
              <div>
                <b id="tracker-portfolio-title">Tracker Saya</b>
                <small className="date-hint">Pilih satu tracker untuk melihat detail. Status hari ini tetap dirangkum di bawah.</small>
              </div>
            </div>
            <div className="tracker-portfolio-grid">
              {trackerSummaries.map(({ tracker, summary }) => {
                const todayStatus = summary.isCompleted
                  ? "Perjalanan selesai"
                  : summary.today?.status === "SUBMITTED"
                    ? `Hari ini ${summary.today.progress}%`
                    : summary.today?.status === "MISSED"
                      ? "Hari ini missed"
                      : summary.today
                        ? "Perlu diisi hari ini"
                        : "Belum berjalan";
                return (
                  <button
                    key={tracker.id}
                    type="button"
                    className={`tracker-summary-card ${tracker.id === mod.id ? "is-active" : ""}`}
                    aria-pressed={tracker.id === mod.id}
                    onClick={() => setActive(tracker.id)}
                  >
                    <span className="tracker-summary-topline">
                      <strong>{tracker.title?.trim() || "Judul Tracker Anda"}</strong>
                      <span className={`tracker-state ${summary.isCompleted ? "completed" : (summary.today?.status.toLowerCase() ?? "pending")}`}>{todayStatus}</span>
                    </span>
                    <span className="tracker-summary-metrics">
                      <span><b>{summary.progress}%</b> progres</span>
                      <span><b>{summary.accountability}%</b> kepatuhan</span>
                      <span><b>{summary.today?.day ?? (summary.isCompleted ? tracker.days : 0)}</b>/{tracker.days} hari</span>
                    </span>
                    <span className="tracker-summary-progress" aria-hidden="true"><span style={{ width: `${summary.progress}%` }} /></span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {mods.length > 1 && todayTrackers.length > 0 && (
          <section className="card glass-card today-priority-card" aria-labelledby="today-priority-title">
            <div className="section-title-row">
              <span className="section-icon"><Target size={19} /></span>
              <div>
                <b id="today-priority-title">Prioritas Hari Ini</b>
                <small className="date-hint">Satu tempat untuk memastikan tidak ada tracker aktif yang terlewat.</small>
              </div>
            </div>
            <div className="today-priority-list">
              {todayTrackers.map(({ tracker, summary }) => {
                const submitted = summary.today?.status === "SUBMITTED";
                return (
                  <button
                    type="button"
                    className={`today-priority-item ${submitted ? "is-complete" : "needs-input"}`}
                    key={tracker.id}
                    onClick={() => {
                      setActive(tracker.id);
                      window.setTimeout(() => document.getElementById("today")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
                    }}
                  >
                    <span className="today-priority-icon">{submitted ? <CheckCircle2 size={18} /> : <Circle size={16} />}</span>
                    <span><b>{tracker.title}</b><small>{submitted ? `Tersimpan ${summary.today?.progress ?? 0}%` : "Belum diisi · buka tracker"}</small></span>
                    <ChevronRight size={17} />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="card glass-card accountability-card">
          <div className="row between accountability-heading">
            <div className="section-title-row">
              <span className="section-icon"><Gauge size={19} /></span>
              <div>
                <b>Akumulasi perubahan nyata</b>
                <small className="date-hint">Nilai harian dihitung terhadap seluruh periode, termasuk hari yang terlewat.</small>
              </div>
            </div>
            <strong>{lifecycle.progress}%</strong>
          </div>
          <div className="accountability-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lifecycle.progress}>
            <span style={{ width: `${lifecycle.progress}%` }} />
          </div>
          <div className="accountability-meta">
            <span>Kepatuhan input {lifecycle.accountability}%</span>
            <span>{lifecycle.missed} hari missed</span>
            <span>{formatDate(mod.startDate)} — {formatDate(mod.endDate)}</span>
          </div>
        </section>

        {lifecycle.today?.status === "PENDING" && (
          <section className="card reminder-card" role="status">
            <span className="section-icon"><Bell size={19} /></span>
            <div>
              <b>Isi progress tracker hari ini sebelum jam 23:59.</b>
              <p>Satu laporan jujur hari ini menjaga momentum perubahan Anda.</p>
            </div>
            {!remindersEnabled && <button type="button" className="secondary" onClick={enableTrackerReminders}>Aktifkan pengingat</button>}
          </section>
        )}

        {stats.today && filledActivities.length > 0 && mod.ownerId === user.id && (
          <section className="card glass-card today" id="today">
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
              <div className="today-heading-meta">
                <span className="today-date-badge">
                  <CalendarDays size={16} />
                  {formatActiveDate(lifecycle.today?.date)}
                </span>
                <span className="progress-badge">
                  {todayDone}/{filledActivities.length}
                </span>
              </div>
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
            <form className="daily-progress-form" onSubmit={saveDailyProgress}>
              <label htmlFor="daily-progress-range">Nilai progress hari ini</label>
              <div className="daily-progress-control">
                <input
                  id="daily-progress-range"
                  name="progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  defaultValue={lifecycle.today?.progress ?? 0}
                  key={`${mod.id}-${lifecycle.today?.progress ?? 0}`}
                />
                <button className="primary save-progress-button" type="submit">
                  <Save size={18} aria-hidden="true" />
                  Simpan progress
                </button>
              </div>
              <small className="date-hint">Checklist otomatis menghitung nilai; slider dapat dipakai untuk koreksi reflektif hari ini.</small>
            </form>
          </section>
        )}

        <section className="card glass-card tracker-card" id="tracker">
          <div className="row between tracker-card-heading">
            <div className="section-title-row">
              <span className="section-icon">
                <ClipboardList size={19} />
              </span>
              <div>
                <b>Minggu Berjalan</b>
                <p className="muted">Pantau ritme tanpa memenuhi dashboard dengan seluruh periode.</p>
              </div>
            </div>
            <span className="tracker-range-badge">Hari {pageStart}–{pageEnd} dari {mod.days}</span>
          </div>
          <div className="daily-progress-grid" aria-label="Timeline progress harian">
            {visibleDays.map((day) => {
              const row = mod.dailyProgress?.find((item) => item.day === day);
              const status = row?.status ?? "PENDING";
              const statusLabel = status === "MISSED" ? "Missed" : status === "SUBMITTED" ? `${row?.progress ?? 0}%` : row?.date.slice(0, 10) === localIsoDate() ? "Hari ini" : "Menunggu";
              return (
                <div className={`daily-progress-slot status-${status.toLowerCase()} ${row?.date.slice(0, 10) === localIsoDate() ? "is-today" : ""}`} key={day}>
                  <b>Hari {day}</b>
                  <span>{row ? formatDate(row.date) : "Belum aktif"}</span>
                  <strong>{statusLabel}</strong>
                </div>
              );
            })}
          </div>
          {filledActivities.length === 0 ? (
            <div className="empty-state">Tambahkan aktivitas lebih dulu agar riwayat tracking bisa digunakan.</div>
          ) : (
            <button type="button" className="secondary tracker-history-button" onClick={() => setHistoryOpen(true)}>
              <BookOpenText size={17} />
              Buka riwayat lengkap {mod.days} hari
              <ChevronRight size={17} />
            </button>
          )}
        </section>

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

      {historyOpen && (
        <div className="modal tracker-history-modal" role="presentation" onClick={() => setHistoryOpen(false)}>
          <section
            className="sheet glass-card tracker-history-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracker-history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row between tracker-history-header">
              <div className="section-title-row">
                <span className="section-icon"><BookOpenText size={19} /></span>
                <div>
                  <div className="eyebrow">Riwayat perjalanan</div>
                  <h2 id="tracker-history-title">{trackerTitle} · {mod.days} hari</h2>
                </div>
              </div>
              <button type="button" className="secondary" onClick={() => setHistoryOpen(false)}>Tutup</button>
            </div>

            <div className="history-overview" aria-label={`Ringkasan status ${mod.days} hari`}>
              {Array.from({ length: mod.days }, (_, index) => index + 1).map((day) => {
                const row = mod.dailyProgress?.find((item) => item.day === day);
                const status = row?.status ?? "PENDING";
                const isToday = day === stats.today;
                const statusText = status === "MISSED" ? "missed" : status === "SUBMITTED" ? `${row?.progress ?? 0}%` : isToday ? "hari ini" : "menunggu";
                return (
                  <span
                    key={day}
                    className={`history-day status-${status.toLowerCase()} ${isToday ? "is-today" : ""}`}
                    aria-label={`Hari ${day}, ${statusText}`}
                    title={`Hari ${day} · ${statusText}`}
                  >
                    <b>{day}</b>
                    <small>{status === "SUBMITTED" ? `${row?.progress ?? 0}%` : status === "MISSED" ? "×" : "·"}</small>
                  </span>
                );
              })}
            </div>
            <div className="history-legend" aria-label="Legenda status">
              <span><i className="submitted" />Submitted</span>
              <span><i className="missed" />Missed</span>
              <span><i className="pending" />Menunggu</span>
              <span><i className="today" />Hari ini</span>
            </div>

            <div className="tracker-history-detail">
              <div className="tracker-pager row between">
                <button
                  type="button"
                  className="secondary icon-only"
                  onClick={() => setWeekIndex((week) => Math.max(week - 1, 0))}
                  disabled={safeWeekIndex === 0}
                  aria-label="Minggu sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tracker-pager-label"><b>Detail aktivitas</b><small>Hari {pageStart}–{pageEnd} dari {mod.days}</small></span>
                <button
                  type="button"
                  className="secondary icon-only"
                  onClick={() => setWeekIndex((week) => Math.min(week + 1, totalWeeks - 1))}
                  disabled={safeWeekIndex >= totalWeeks - 1}
                  aria-label="Minggu berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="table-wrap">
                <table className="tracker-grid history-grid">
                  <thead>
                    <tr>
                      <th>Hari</th>
                      {mod.activities.map((activity, index) => <th key={index}>{activity || `Akt. ${index + 1}`}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDays.map((day) => (
                      <tr key={day}>
                        <td>{day}</td>
                        {mod.activities.map((activity, index) => {
                          const checked = checkSet.has(`${day}-${index}`);
                          return (
                            <td key={index}>
                              <span className="cell-label">{activity || `Akt. ${index + 1}`}</span>
                              <span className={`history-check ${checked ? "is-done" : ""}`} aria-label={`${activity || `Aktivitas ${index + 1}`}: ${checked ? "selesai" : "tidak selesai"}`}>
                                {checked ? <Check size={15} /> : <span aria-hidden="true">—</span>}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

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
              <label>Tanggal berakhir</label>
              <input
                name="endDate"
                type="date"
                min={addDaysIso(localIsoDate(), 39)}
                max={addDaysIso(localIsoDate(), 99)}
                value={createEndDate}
                onChange={(event) => setCreateEndDate(event.target.value)}
                required
              />
              <small className="date-hint">Mulai otomatis hari ini · minimal 40 hari dan maksimal 100 hari.</small>
            </div>
            <div className="field">
              <label>Aktivitas perubahan</label>
              <textarea
                name="activities"
                rows={4}
                required
                placeholder={"Satu aktivitas per baris\nContoh: Olahraga 20 menit\nMembaca 10 halaman"}
              />
              <small className="date-hint">Isi 1–10 aktivitas konkret. Aktivitas masih dapat dirapikan selama hari pertama.</small>
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
                <span>Komitmen periode</span>
                <b>{Math.round((new Date(`${createEndDate}T00:00:00.000Z`).getTime() - new Date(`${localIsoDate()}T00:00:00.000Z`).getTime()) / 86_400_000) + 1} hari</b>
              </div>
              <div className="activity-progress" aria-hidden="true">
                <span style={{ width: "100%" }} />
              </div>
              <small className="date-hint">Setelah dibuat, tanggal mulai dan berakhir tidak dapat diubah.</small>
            </div>
            <button className="primary full icon-button">
              <Plus size={18} />
              Buat tracker
            </button>
          </form>
        </div>
      )}

      {testimonialOpen && (
        <div className="modal testimonial-modal" role="presentation">
          <form className="sheet glass-card testimonial-sheet" role="dialog" aria-modal="true" aria-labelledby="testimonial-title" onSubmit={submitTestimonial}>
            <span className="testimonial-icon" aria-hidden="true"><MessageSquareQuote size={28} /></span>
            <div>
              <div className="eyebrow">Perjalanan selesai</div>
              <h2 id="testimonial-title">Ceritakan perubahan nyata yang Anda rasakan</h2>
              <p className="muted">Refleksi ini membantu Anda melihat jarak yang sudah ditempuh dan menjadi testimoni perjalanan pribadi Anda.</p>
            </div>
            <div className="field">
              <label htmlFor="testimonial-content">Testimoni Anda</label>
              <textarea
                id="testimonial-content"
                value={testimonialDraft}
                onChange={(event) => setTestimonialDraft(event.target.value)}
                minLength={20}
                maxLength={2000}
                rows={7}
                placeholder="Apa yang berubah dalam diri, rutinitas, hasil, atau cara pandang Anda setelah menyelesaikan tracker ini?"
                required
                autoFocus
              />
              <small className="date-hint">Minimal 20 karakter · {testimonialDraft.length}/2000</small>
            </div>
            <div className="testimonial-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setTestimonialOpen(false);
                  setTestimonialDismissed(mod.id);
                }}
              >
                Isi nanti
              </button>
              <button type="submit" className="primary">Simpan testimoni</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
