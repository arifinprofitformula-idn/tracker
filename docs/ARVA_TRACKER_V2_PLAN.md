# Arva Tracker V2 — Plan

Status: **Fase B (Program/Tracking V2) selesai. Fase C (Billing + Personal Pro foundation) berikutnya.**
Terakhir diperbarui: 2026-08-27

Dokumen ini adalah satu-satunya sumber kebenaran soal status & arah V2. Kalau ada percakapan lama yang menyebut rencana berbeda, dokumen ini yang menang — update di sini begitu ada keputusan baru, jangan biarkan basi.

---

## 1. North Star

Arva Tracker = **Progress & Accountability Platform**, bukan habit tracker generik.
Value ladder: Free → Personal Pro → Coach Pro → Community → Marketplace → White-label/Business.
Metrik utama: **Weekly Successful Progress (WSP)** — % pengguna aktif yang menyelesaikan ≥70% aktivitas terjadwal per minggu.

Referensi lengkap monetisasi/entitlement/AI: `Arva_Tracker_V2_Blueprint.pdf` (dokumen sumber dari Coach Arifin). Dokumen ini (`ARVA_TRACKER_V2_PLAN.md`) adalah versi **yang sudah disesuaikan dengan stack nyata** — kalau ada bentrok antara blueprint dan file ini, **file ini yang berlaku**, karena blueprint ditulis sebelum audit repo.

## 2. Audit Temuan (Fase 0 — selesai 2026-08-27)

| Area | Blueprint asumsi | Repo aktual |
|---|---|---|
| Auth | Supabase Auth | Custom bcryptjs + session cookie |
| Database | Supabase Postgres + RLS | Prisma + PostgreSQL self-hosted |
| Styling | Tailwind CSS | Plain CSS |
| Multi-tenancy | `workspaces` sejak awal | Tidak ada — `Module.ownerId → User` langsung |
| Domain tracking | `programs/program_steps/enrollments` | `Module/Phase/Check/Note` (setara, nama beda) |
| Fitur ekstra | Tidak disebut | `DailyPlan/TimeBlock` (time-blocking harian) sudah live dan matang |
| Deploy | — | PM2 port 3500 di belakang Caddy |

Keputusan hasil audit ada di `docs/DECISIONS.md`. Ringkas: **stack self-hosted dipertahankan sepenuhnya**, blueprint diadaptasi ke stack nyata, bukan sebaliknya.

## 3. Pemetaan Domain: Blueprint ↔ Repo Aktual

| Konsep blueprint | Padanan di repo | Aksi |
|---|---|---|
| `programs` | `Module` | Rename opsional, boleh ditunda — tidak blocking |
| `program_steps` | `Phase` | Sudah setara |
| `program_enrollments` | `ProgramEnrollment` | Sudah eksplisit untuk owner module; assignment coach/client diperluas di Fase D |
| `activity_logs` | `Check` | Sudah setara |
| `daily_reflections` | `Note` | Sudah setara |
| `workspaces` / `workspace_members` | **Belum ada** | **Ini fokus Fase A** |
| `plans` / `subscriptions` | Belum ada | Fase C |
| `coach_client_links` | Belum ada | Fase D |
| `community_challenges` | Belum ada | Fase F |
| `ai_insights` / `ai_usage` | Belum ada | Fase E |
| — | `DailyPlan` / `TimeBlock` | **Tidak ada di blueprint.** Tetap hidup sebagai bagian domain Tracking, disandingkan dengan Program/Check. |

## 4. Roadmap Fase (adaptasi dari roadmap 12 minggu blueprint)

Blueprint menulis roadmap generik minggu-per-minggu. Di sini dipetakan ulang jadi fase (tidak dikunci per minggu, karena Coach solo-builder + AI pair programmer, bukan tim 5 orang) — fase selesai kalau Definition of Done-nya terpenuhi, bukan kalau tanggal habis.

| Fase | Fokus | Definition of Done | Status |
|---|---|---|---|
| **0** | Audit + dokumentasi landasan | AGENTS.md, DECISIONS.md, PLAN.md, PROGRESS.md ada dan disetujui | ✅ Selesai |
| **A** | Workspace foundation | `Workspace`+`WorkspaceMember` ada, backfill personal workspace utk semua user existing, `route.ts` baca lewat membership (bukan `ownerId` langsung), test cross-tenant lulus | ✅ Selesai |
| **B** | Program/Tracking V2 | `Module` (atau rename `programs`) resmi terhubung ke `workspace_id`, `program_enrollments` eksplisit | ✅ Selesai |
| **C** | Billing + Personal Pro | `plans`, `subscriptions`, `billing_transactions`, `webhook_events`, PaymentProvider adapter (Midtrans/Xendit), entitlement helper server-side | ⬜ |
| **D** | Coach Mode | `coach_client_links`, `coach_interventions`, dashboard Needs Attention, risk score deterministik | ⬜ |
| **E** | AI Coach | AI gateway, weekly insight, `ai_insights`/`ai_usage`, privacy filter, budget guardrail | ⬜ |
| **F** | Community Mode | `community_challenges`, `challenge_members`, aggregate progress, leaderboard opt-in | ⬜ |
| **G** | Hardening + Launch | Security review, backup/restore drill, observability, pricing page publik | ⬜ |

Detail checklist per fase ada di `docs/PROGRESS.md` — file ini cuma nyimpen definisi fase, bukan status harian.

## 5. Release Gates (tetap dipakai dari blueprint, tidak diubah)

- **Gate A→C**: tracking inti stabil + test ownership/cross-tenant lulus, sebelum billing masuk.
- **Gate C→D**: webhook idempotency + upgrade/downgrade/entitlement test lulus, sebelum menerima uang sungguhan.
- **Gate D→E**: AI hanya rilis kalau usage budget + schema validation + privacy filter + fallback jalan.
- **Gate G**: security regression + restore test + observability + support playbook selesai sebelum public launch.

## 6. Risiko Aktif

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Tidak ada RLS (bukan Supabase) → isolasi tenant bergantung 100% pada disiplin kode | Kebocoran data antar coach/client/community kalau ada query yang lupa di-scope | Wajib helper terpusat (`assertWorkspaceMember()`, `getEntitlements()`), tidak boleh query Prisma langsung tanpa lewat helper untuk data kolaboratif. Test cross-tenant wajib di setiap fase yang sentuh data tenant. |
| Next.js 16 breaking changes | Kode yang dihasilkan agent bisa pakai API lama yang sudah deprecated | Wajib cek `node_modules/next/dist/docs/` sebelum sentuh routing/server actions |
| Scope creep dari blueprint (marketplace, white-label, gamification) | Waktu habis di fitur yang seharusnya P3 | Scope P2/P3 di blueprint tetap ditunda — tidak masuk fase manapun di atas sampai Fase D-F terbukti (retention + willingness-to-pay) |
| DailyPlan/TimeBlock tidak termodelkan di blueprint | Bisa "hilang" dari rencana kalau tim/agent baru cuma baca blueprint | Sudah dicatat eksplisit di tabel pemetaan domain (baris terakhir) — jangan dihapus |

## 7. Catatan Implementasi Fase A

Fase A selesai pada 2026-08-27:

- Schema menambahkan `Workspace`, `WorkspaceMember`, `WorkspaceType`, dan `WorkspaceRole`.
- `Module.workspaceId` ditambahkan dan dibackfill dari personal workspace pemilik lama tanpa menghapus `ownerId`.
- Registrasi user dan seed admin sekarang otomatis membuat personal workspace + owner membership.
- Query module/check/note/start-date sudah melewati membership workspace melalui helper `src/lib/workspace.ts`.
- `getEntitlements(workspaceId)` tersedia sebagai helper server-side awal dan untuk sementara mengembalikan entitlement FREE sampai Fase C.
- Cross-tenant integration test sudah membuktikan user unrelated tidak bisa read/write module workspace lain, sedangkan viewer hanya bisa read.

Catatan scope: `DailyPlan/TimeBlock` tetap personal lewat `userId` pada Fase A. Workspace attachment untuk DailyPlan dikerjakan saat Fase B/C bila diperlukan untuk coach/community visibility, supaya Fase A tetap kecil dan aman.

## 8. Catatan Implementasi Fase B

Fase B selesai pada 2026-08-27:

- `ProgramEnrollment` ditambahkan sebagai domain V2 eksplisit tanpa rename/drop `Module`.
- Setiap `Module` existing dibackfill menjadi active owner enrollment.
- Registrasi, seed admin, dan create tracker sekarang membuat owner enrollment dalam transaction yang sama dengan module.
- Script `db:backfill:program-enrollments` tersedia dan idempotent.
- Test integration membuktikan owner module memiliki active enrollment dan unrelated user tidak dianggap enrolled.
- `DailyPlan.workspaceId` ditambahkan dan dibackfill dari personal workspace pemiliknya.
- API Daily Plan tetap personal-private (`userId` pemilik wajib cocok), tetapi sekarang query/read/write juga melewati workspace-aware helper.
- Test integration membuktikan member workspace lain tidak otomatis bisa membaca daily plan personal user tersebut.
- `ProgressSnapshot` ditambahkan sebagai numeric aggregate per workspace/module/user/date.
- Script `db:backfill:progress-snapshots` tersedia dan idempotent.
- Snapshot sengaja tidak menyimpan note/reflection/private text.
- Test unit/integration membuktikan kalkulasi snapshot dan upsert idempotent.

Catatan scope:

- `Module/Phase/Check/Note` tetap nama internal untuk sekarang; service-layer alias `Program` bisa ditambahkan bila UI/API coach membutuhkannya.
- UI analytics 7/30/90 belum dibuat; tabel snapshot sekarang menjadi fondasinya untuk Fase C/D/F.

## 9. Yang Sengaja Ditunda (ikut rekomendasi blueprint)

Marketplace payout, white-label custom domain, gamification economy kompleks, native iOS/Android, realtime chat, offline-first sync lanjutan, ML predictive churn — tidak dikerjakan sebelum Fase D-F terbukti retention & willingness-to-pay-nya.
