import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=resolve(__dirname,"..");
const route=readFileSync(resolve(root,"src/app/api/[...route]/route.ts"),"utf8");
const schema=readFileSync(resolve(root,"prisma/schema.prisma"),"utf8");
const coach=readFileSync(resolve(root,"src/lib/coach.ts"),"utf8");
const ui=readFileSync(resolve(root,"src/components/CoachDashboard.tsx"),"utf8");

describe("Coach Mode architecture contract",()=>{
 it("keeps public invite preview before session authentication",()=>{
   expect(route.indexOf('path === "/api/coach/invite-preview"')).toBeGreaterThan(-1);
   expect(route.indexOf('path === "/api/coach/invite-preview"')).toBeLessThan(route.indexOf("const auth = await actor(req)"));
 });
 it("stores only invite hashes and uses a narrow coach-client relation",()=>{
   const model=schema.slice(schema.indexOf("model CoachClientLink"),schema.indexOf("model CoachIntervention"));
   expect(model).toContain("tokenHash");expect(model).not.toMatch(/\btoken\s+String/);
   expect(model).toContain("consentedAt");expect(model).toContain("clientUserId");
   expect(coach).not.toContain("workspaceMember.create({ data: { workspaceId: input.workspaceId");
 });
 it("does not leak reflections or Daily Plan through coach detail",()=>{
   const detail=coach.slice(coach.indexOf("export async function getCoachClientDetail"),coach.indexOf("export async function addCoachIntervention"));
   expect(detail).not.toMatch(/\bnote\b/i);expect(detail).not.toMatch(/dailyPlan|timeBlock/);
 });
 it("labels nudge as an in-app record instead of fake delivery",()=>{
   expect(ui).toContain("Nudge (in-app)");expect(ui).not.toMatch(/terkirim|delivered/i);
 });
});
