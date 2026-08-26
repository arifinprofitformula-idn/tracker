type Activity = string;

interface Check {
  day: number;
  activityIndex: number;
}

export function calculateTrackerStats(
  days: number,
  activities: Activity[],
  checks: Check[],
): { checked: number; total: number; progress: number; perfectDays: number; currentStreak: number } {
  const filled: number[] = [];
  for (let i = 0; i < activities.length; i++) {
    if (activities[i] && activities[i].trim()) filled.push(i);
  }

  const total = days * filled.length;
  const checkSet = new Set<string>();
  for (const c of checks) {
    if (c.day >= 1 && c.day <= days && filled.includes(c.activityIndex)) {
      checkSet.add(`${c.day}-${c.activityIndex}`);
    }
  }
  const checked = checkSet.size;
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

  const isDayComplete = (d: number): boolean => {
    if (filled.length === 0 || d < 1 || d > days) return false;
    for (const i of filled) {
      if (!checkSet.has(`${d}-${i}`)) return false;
    }
    return true;
  };

  const perfectDaysArr: number[] = [];
  for (let d = 1; d <= days; d++) {
    if (isDayComplete(d)) perfectDaysArr.push(d);
  }
  const perfectDays = perfectDaysArr.length;

  let lastActiveDay = 0;
  for (let d = days; d >= 1; d--) {
    for (const i of filled) {
      if (checkSet.has(`${d}-${i}`)) {
        lastActiveDay = d;
        break;
      }
    }
    if (lastActiveDay > 0) break;
  }

  let currentStreak = 0;
  for (let d = lastActiveDay; d >= 1; d--) {
    if (isDayComplete(d)) currentStreak++;
    else break;
  }

  return { checked, total, progress, perfectDays, currentStreak };
}

export function ownsResource(
  requesterId: string,
  resourceOwnerId: string,
  role: "USER" | "ADMIN",
  status: "ACTIVE" | "SUSPENDED",
): boolean {
  if (status !== "ACTIVE") return false;
  return role === "ADMIN" || requesterId === resourceOwnerId;
}

export type PhaseStatus = "upcoming" | "active" | "completed";

export interface PhaseStats {
  status: PhaseStatus;
  percent: number;
  perfectDays: number;
  totalDaysCounted: number;
  streak: number;
  targetMet: boolean | null;
}

export function calculatePhaseStats(
  startDay: number,
  endDay: number,
  today: number | null,
  activities: Activity[],
  checks: Check[],
  targetPercent: number,
): PhaseStats {
  const filled: number[] = [];
  for (let i = 0; i < activities.length; i++) {
    if (activities[i] && activities[i].trim()) filled.push(i);
  }

  let status: PhaseStatus = "upcoming";
  if (today !== null) {
    if (today > endDay) status = "completed";
    else if (today >= startDay) status = "active";
  }

  const rangeStart = startDay;
  const rangeEnd = status === "active" && today !== null ? Math.min(today, endDay) : endDay;

  if (status === "upcoming" || filled.length === 0 || rangeEnd < rangeStart) {
    return { status, percent: 0, perfectDays: 0, totalDaysCounted: 0, streak: 0, targetMet: null };
  }

  const checkSet = new Set<string>();
  for (const c of checks) {
    if (c.day >= 1 && c.day <= endDay && filled.includes(c.activityIndex)) {
      checkSet.add(`${c.day}-${c.activityIndex}`);
    }
  }

  const isDayComplete = (d: number) => filled.every((i) => checkSet.has(`${d}-${i}`));

  const totalDaysCounted = rangeEnd - rangeStart + 1;
  let checkedCount = 0;
  let perfectDays = 0;
  for (let d = rangeStart; d <= rangeEnd; d++) {
    for (const i of filled) if (checkSet.has(`${d}-${i}`)) checkedCount++;
    if (isDayComplete(d)) perfectDays++;
  }

  let streak = 0;
  for (let d = rangeEnd; d >= rangeStart; d--) {
    if (isDayComplete(d)) streak++;
    else break;
  }

  const percent = Math.round((checkedCount / (totalDaysCounted * filled.length)) * 100);
  const targetMet = status === "completed" ? percent >= targetPercent : null;

  return { status, percent, perfectDays, totalDaysCounted, streak, targetMet };
}

export interface DefaultPhaseTemplate {
  label: string;
  description: string;
  startDay: number;
  endDay: number;
  position: number;
  targetPercent: number;
}

const PHASE_TEMPLATES = [
  { label: "Fase 1 — Pemanasan", description: "Fondasi kebiasaan dasar. Fokus membangun ritme awal." },
  { label: "Fase 2 — Pembentukan", description: "Konsistensi mulai terbentuk. Jaga agar tidak putus di tengah jalan." },
  { label: "Fase 3 — Penguatan", description: "Perkuat kebiasaan, evaluasi aktivitas yang paling berdampak." },
  { label: "Fase 4 — Puncak", description: "Pertahankan performa terbaik sampai program selesai." },
];

export function buildDefaultPhases(days: number): DefaultPhaseTemplate[] {
  if (days <= 0) return [];
  const count = Math.min(PHASE_TEMPLATES.length, days);
  const base = Math.floor(days / count);
  let remainder = days % count;
  const phases: DefaultPhaseTemplate[] = [];
  let cursor = 1;
  for (let i = 0; i < count; i++) {
    const length = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    const startDay = cursor;
    const endDay = cursor + length - 1;
    phases.push({ ...PHASE_TEMPLATES[i], startDay, endDay, position: i, targetPercent: 70 });
    cursor = endDay + 1;
  }
  return phases;
}