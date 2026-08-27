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

- [x] Model `Plan`, `Subscription`, `BillingTransaction`, `WebhookEvent`
- [x] Seed plan FREE/PERSONAL_PRO/COACH_PRO/COMMUNITY/BUSINESS
- [x] `getEntitlements(workspaceId)` membaca subscription server-side
- [x] PaymentProvider interface + mock/dev provider
- [x] Paywall/export/advanced progress gated by entitlement

**Catatan sesi berjalan:** Selesai (backend) 2026-08-27. Sesi ini melanjutkan pekerjaan yang sebelumnya terhenti tanpa update dokumen (schema/seed/entitlement sudah ada dari commit sebelumnya, tapi PaymentProvider/webhook/gating belum). Ditambahkan: `PaymentProvider` interface + `mockProvider` (`src/lib/payment/`), `src/lib/billing.ts` (`createCheckoutTransaction`, `processWebhookEvent` dengan idempotency via `WebhookEvent.@@unique([provider, providerEventId])`), route `POST /api/billing/checkout`, `GET /api/billing`, dan route terpisah `POST /api/billing/webhook` (di luar catch-all, verifikasi via signature bukan cookie/sameOrigin). Gating diterapkan di 3 titik nyata: `POST /api/modules` (limit `maxActivePrograms`), `GET /api/modules/export` (CSV, `exportEnabled`), `GET /api/progress-snapshots` (`advancedAnalytics` + clamp `historyDays`). Diverifikasi end-to-end manual lewat dev server (register → checkout → simulate webhook → entitlement upgrade reflected di `/api/billing`) plus test idempotency & downgrade/cancel lulus. **Scope sengaja backend-only** — belum ada UI billing/pricing/upgrade/paywall banner di aplikasi; itu jadi item pertama kalau ada sesi lanjutan sebelum Fase D benar-benar butuh UI billing untuk coach.

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
