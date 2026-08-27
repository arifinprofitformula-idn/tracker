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

- [ ] Model `Workspace` (type: personal untuk sekarang) di `prisma/schema.prisma`
- [ ] Model `WorkspaceMember` (role: owner/admin/coach/member/viewer)
- [ ] Migration Prisma dibuat (additive, tidak drop kolom lama)
- [ ] Script backfill: setiap `User` existing dapat 1 `Workspace` personal + jadi owner
- [ ] `Module` dapat kolom `workspaceId` (backfill dari personal workspace pemiliknya)
- [ ] Helper `assertWorkspaceMember()` / `getEntitlements()` di `src/lib/`
- [ ] `route.ts`: query `Module` dikonversi dari filter `ownerId` langsung ke filter lewat membership
- [ ] Test cross-tenant: user A tidak bisa baca/tulis workspace user B
- [ ] `npm test`, `npm run type-check`, `npm run lint`, `npm run build` hijau semua
- [ ] `docs/PROGRESS.md` & `docs/ARVA_TRACKER_V2_PLAN.md` diupdate statusnya

**Catatan sesi berjalan:** —

---

## Fase B — Program/Tracking V2

- [ ] (diisi saat Fase A selesai — jangan detail-kan fase depan sebelum fase sekarang kelar, supaya dokumen tidak basi)

---

## Fase C — Billing + Personal Pro

- [ ] (menyusul)

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
