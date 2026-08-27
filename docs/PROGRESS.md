# Progress — Arva Tracker V2

## 2026-08-27 — Coach Mode + billing activation

- Reuse `User`, `Workspace(type=COACH)`, `WorkspaceMember`, `Module`, `Check`, plans/subscriptions, entitlement `maxClients`, catch-all API, shared header, dan `/billing`.
- Additive gap only: `CoachClientLink` untuk invite/consent dan `CoachIntervention` untuk private note/nudge record.
- Client bukan `WorkspaceMember`; reflection, Daily Plan label, password, session, dan billing tidak masuk Coach DTO.
- Invite: random 32 byte, SHA-256 hash only di DB, TTL 7 hari, matching email, consent versioned.
- Risk deterministic + reasons; metrik 7/30 hari dari window `Check.checkedAt`, bukan rata-rata snapshot kumulatif.
- Client self-revoke dan coach revoke langsung memutus detail access.
- Billing existing diaktifkan dan diperluas memakai authorized `workspaceId`; tidak ada backend billing kedua.
- Migration `20260827150000_coach_mode_foundation` additive. Rollback app aman; tabel baru tetap inert.

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
- [x] Billing summary contract untuk UI: plans/pricing, current plan, usage, transactions, payment status
- [x] Halaman `/billing`, pricing comparison, upgrade CTA, payment return state, dan paywall banner reusable

**Catatan sesi berjalan:** Selesai 2026-08-27. Backend billing sudah mencakup `PaymentProvider`, mock/Sumopod provider, checkout, webhook idempotent, dan entitlement gate. Sesi lanjutan menutup monetization UX sebelum Fase D: `GET /api/billing` diperluas menjadi summary contract server-side, `GET /api/billing/payment-status` ditambahkan, `/billing` menampilkan current plan, usage, pricing comparison, upgrade CTA, billing history, dan payment state. Dashboard memakai `PaywallBanner` saat limit `maxActivePrograms` tercapai. Integration test billing summary ditambahkan, tetapi belum bisa dijalankan di sesi ini karena PostgreSQL lokal `localhost:5433` tidak start di environment shell saat validasi; type-check, lint, build, dan unit/security billing tests hijau.

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
