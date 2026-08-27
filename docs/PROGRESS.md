# Progress — Arva Tracker V2

Diupdate di **akhir setiap fase**, bukan di tengah kerja. Kalau sesi kerja terganggu di tengah fase, tulis catatan singkat di bagian "Catatan sesi berjalan" di bawah checklist fase terkait — jangan centang sebagian item lalu lupa kenapa.

---

## Fase 0 — Audit + Dokumentasi Landasan

- [x] Audit repository (stack, schema, auth, deployment)
- [x] Gap analysis blueprint vs repo aktual
- [x] `AGENTS.md` — konteks proyek ditambahkan
- [x] `docs/ARVA_TRACKER_V2_PLAN.md` dibuat
- [x] `docs/DECISIONS.md` dibuat
- [x] `docs/PROGRESS.md` dibuat (file ini)
- [x] `.github/copilot-instructions.md` ditambahkan

**Catatan sesi berjalan:** —

---

## Fase A — Workspace Foundation

- [x] Model `Workspace` (type: personal untuk sekarang) di `prisma/schema.prisma`
- [x] Model `WorkspaceMember` (role: owner/admin/coach/member/viewer)
- [x] Migration Prisma dibuat (additive, tidak drop kolom lama)
- [x] Script backfill: setiap `User` existing dapat 1 `Workspace` personal + jadi owner
- [x] `Module` dapat kolom `workspaceId` (backfill dari personal workspace pemiliknya)
- [x] Helper `assertWorkspaceMember()` / `getEntitlements()` di `src/lib/`
- [x] `route.ts`: query `Module` dikonversi dari filter `ownerId` langsung ke filter lewat membership
- [x] Test cross-tenant: user A tidak bisa baca/tulis workspace user B
- [x] `npm test`, `npm run type-check`, `npm run lint`, `npm run build` hijau semua
- [x] `docs/PROGRESS.md` & `docs/ARVA_TRACKER_V2_PLAN.md` diupdate statusnya

**Catatan sesi berjalan:** Selesai 2026-08-27. `DailyPlan/TimeBlock` masih personal via `userId`; workspace attachment untuk domain ini ditunda ke slice Program/Tracking V2 agar migration tetap kecil.

---

## Fase B — Program/Tracking V2

- [x] Tentukan apakah `Module/Phase/Check/Note` tetap nama internal atau perlu alias `Program` di service layer
- [x] Tambahkan `ProgramEnrollment` eksplisit tanpa menghapus `Module.ownerId`
- [x] Putuskan workspace visibility untuk `DailyPlan/TimeBlock`
- [x] Tambahkan progress snapshot dasar untuk query 7/30/90 hari bila diperlukan
- [x] Test ownership/enrollment untuk tracking V2

**Catatan sesi berjalan:** Selesai 2026-08-27. Nama internal `Module/Phase/Check/Note` dipertahankan untuk mencegah rename besar; `ProgramEnrollment` menjadi jembatan domain V2. `DailyPlan` punya `workspaceId`, tetap personal-private via `userId`, dan query API melewati helper workspace-aware. `ProgressSnapshot` tersedia sebagai numeric aggregate tanpa note/private text.

---

## Fase C — Billing + Personal Pro

- [ ] Model `Plan`, `Subscription`, `BillingTransaction`, `WebhookEvent`
- [ ] Seed plan FREE/PERSONAL_PRO/COACH_PRO/COMMUNITY/BUSINESS
- [ ] `getEntitlements(workspaceId)` membaca subscription server-side
- [ ] PaymentProvider interface + mock/dev provider
- [ ] Paywall/export/advanced progress gated by entitlement

---

## Fase D — Coach Mode

- [ ] (menyusul)

---

## Fase E — AI Coach

- [ ] (menyusul)

---

## Fase F — Community Mode

- [ ] (menyusul)

---

## Fase G — Hardening + Launch

- [ ] (menyusul)
