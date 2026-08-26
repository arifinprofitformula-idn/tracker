<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Konteks Proyek

**Arva Tracker** — Progress & Accountability Platform milik Arva Digital Media (Coach Arifin).
Bukan habit tracker biasa: nilai jualnya ada di sistem harian yang terukur + accountability, bukan sekadar checklist.

- **V1**: live di production. Personal tracker (Module/Phase/Check/Note) + Daily Plan (time-blocking harian). Single-tenant — satu User punya banyak Module langsung.
- **V2**: sedang dalam migrasi ke multi-tenant (Personal → Coach → Community → Business) + billing + AI insight. Lihat `docs/ARVA_TRACKER_V2_PLAN.md` untuk status & urutan fase.

Jangan asumsikan ini masih V1 kalau `docs/ARVA_TRACKER_V2_PLAN.md` menunjukkan fase V2 sudah berjalan — selalu cek file itu dulu.

## Stack Sebenarnya (jangan tebak dari training data)

| Area       | Yang dipakai                                                                                                   | Yang TIDAK dipakai                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 App Router                                                                                          | —                                                                                            |
| Database   | PostgreSQL self-hosted via Prisma                                                                              | Supabase, PlanetScale                                                                        |
| Auth       | Custom: bcryptjs + session cookie (`tracker_session`) + rate limit manual di `src/app/api/[...route]/route.ts` | NextAuth, Supabase Auth, Clerk                                                               |
| Styling    | Plain CSS (`globals.css`, `landing.css`)                                                                       | Tailwind CSS (belum diadopsi — jangan migrasi tanpa keputusan eksplisit, lihat DECISIONS.md) |
| Validasi   | Zod (`src/lib/validation.ts`)                                                                                  | —                                                                                            |
| Deployment | PM2 (port 3500) di belakang **Caddy**, dedicated Postgres DB `tracker_system`                                  | Vercel, Nginx, Docker Compose di production                                                  |
| Local dev  | PostgreSQL bundled Laragon, `.local/postgres-data`                                                             | —                                                                                            |

Skema database yang berlaku SELALU `prisma/schema.prisma` — jangan simpulkan struktur data dari dokumen blueprint atau dari memori percakapan lama. Kalau ada perbedaan antara blueprint dan schema aktual, schema aktual yang menang.

## Aturan Non-Negotiable

1. **Self-hosted only.** Jangan pernah usulkan Supabase, NextAuth, Vercel, atau layanan pihak ketiga lain sebagai default — lihat `docs/DECISIONS.md` #1.
2. **Jangan migrasi ke Tailwind** tanpa keputusan eksplisit dicatat di `docs/DECISIONS.md`. Landing page & brand asset sudah jadi dan dipakai production.
3. **Authorization selalu server-side**, ownership dicek lewat `src/lib/authorization.ts` dan query di-scope per user/workspace. Tidak ada RLS di database (karena bukan Supabase) — jadi tidak boleh ada shortcut query yang skip ownership check.
4. **Jangan hapus kolom/tabel/migration lama.** Tambah kolom baru + migration backward-compatible + backfill script terpisah. Lihat pola di `prisma/migrations/`.
5. **Baca `docs/ARVA_TRACKER_V2_PLAN.md` dan `docs/DECISIONS.md` sebelum mulai kerja di fase manapun.** Jangan mengusulkan ulang sesuatu yang sudah diputuskan — cek DECISIONS.md dulu.
6. **Next.js 16 punya breaking changes.** Sebelum menyentuh routing/server actions, cek `node_modules/next/dist/docs/` (lihat blok di atas).
7. Setiap fitur baru: mobile responsive, ada loading/empty/error state, dan quality gates di bawah ini harus hijau sebelum dianggap selesai.

## Command Penting

```bash
npm run dev          # local dev, port 3500
npm run db:local:up  # start local postgres (Laragon)
npm run db:migrate   # prisma migrate dev
npm test             # vitest
npm run type-check
npm run lint
npm run build
```

Detail setup lengkap ada di `README.md`. Status fase & keputusan arsitektur ada di `docs/`.

## Peta Dokumen (baca sesuai kebutuhan, jangan duplikasi isinya di sini)

- `docs/ARVA_TRACKER_V2_PLAN.md` — rencana, status fase, risiko
- `docs/DECISIONS.md` — log keputusan (append-only, jangan diedit ulang entri lama)
- `docs/PROGRESS.md` — checklist progres per fase
- `prisma/schema.prisma` — bentuk data yang sebenarnya
- `tests/acceptance.md` — kontrak behavior yang diharapkan
