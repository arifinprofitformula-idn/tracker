export type CoachRiskLevel = "GREEN" | "YELLOW" | "RED";

export type CoachRiskReason = {
  code: "INACTIVE_3D" | "LOW_COMPLETION_7D" | "STREAK_BROKEN" | "PRIORITY_MISSED";
  points: number;
  label: string;
};

export type CoachRiskInput = {
  inactivityDays: number;
  completion7d: number;
  streakBroken: boolean;
  priorityTasksMissed: number;
};

export function calculateCoachRisk(input: CoachRiskInput): {
  score: number;
  level: CoachRiskLevel;
  reasons: CoachRiskReason[];
} {
  const reasons: CoachRiskReason[] = [];
  if (input.inactivityDays >= 3) reasons.push({ code: "INACTIVE_3D", points: 35, label: "Tidak aktif selama 3 hari atau lebih" });
  if (input.completion7d < 50) reasons.push({ code: "LOW_COMPLETION_7D", points: 30, label: "Penyelesaian 7 hari di bawah 50%" });
  if (input.streakBroken) reasons.push({ code: "STREAK_BROKEN", points: 20, label: "Streak terputus" });
  if (input.priorityTasksMissed > 0) reasons.push({ code: "PRIORITY_MISSED", points: 15, label: "Tugas prioritas terlewat" });
  const score = Math.min(100, reasons.reduce((total, reason) => total + reason.points, 0));
  const level: CoachRiskLevel = score >= 60 ? "RED" : score >= 30 ? "YELLOW" : "GREEN";
  return { score, level, reasons };
}
