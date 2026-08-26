export const MAX_BLOCKS_PER_DAY = 10;

export function blocksOverlap(a: { startMinute: number; endMinute: number }, b: { startMinute: number; endMinute: number }): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

export function findOverlappingBlock<T extends { id: string; startMinute: number; endMinute: number }>(
  blocks: T[],
  candidate: { startMinute: number; endMinute: number },
  excludeId?: string,
): T | undefined {
  return blocks.find((b) => b.id !== excludeId && blocksOverlap(b, candidate));
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function sortByStart<T extends { startMinute: number }>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => a.startMinute - b.startMinute);
}

export type EffectiveBlockStatus = "SCHEDULED" | "COMPLETED" | "RESCHEDULED" | "MISSED";

export function effectiveBlockStatus(
  status: "SCHEDULED" | "COMPLETED" | "RESCHEDULED",
  planDate: string,
  endMinute: number,
  now = new Date(),
): EffectiveBlockStatus {
  if (status !== "SCHEDULED") return status;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (planDate < today) return "MISSED";
  if (planDate > today) return "SCHEDULED";
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  return endMinute < nowMinute ? "MISSED" : "SCHEDULED";
}

export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftISODate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}
