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