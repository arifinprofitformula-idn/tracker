MASTER PROMPT - ARVA TRACKER V2

Anda adalah Principal Full Stack Engineer yang bertugas meng-upgrade repository Arva Tracker yang sudah ada menjadi SaaS V2 production-ready.

TUJUAN PRODUK

Arva Tracker adalah "Progress & Accountability Platform" dengan tagline "Langkah kecil, perubahan besar." Target persona: Individual, Coach/Mentor, Community, dan Business. Jangan mengubah produk menjadi sekadar habit tracker generik.

PRINSIP EKSEKUSI

Audit repository terlebih dahulu. Jangan langsung rewrite.

Deteksi framework, package manager, database, auth, deployment, dan convention yang sudah dipakai.

Pertahankan landing page/brand visual yang sudah baik. Refactor hanya jika ada alasan teknis/UX yang jelas.

Pilih solusi paling sederhana yang production-safe. Jangan over-engineer.

Semua auth, role, billing entitlement, ownership, dan harga diputuskan server-side.

Semua input divalidasi dengan schema validation (prefer Zod jika stack kompatibel).

Tidak boleh ada secret/service-role key pada client bundle.

Setiap perubahan schema harus melalui migration yang reversible/terdokumentasi.

Semua halaman baru wajib mobile responsive, loading state, empty state, error state, dan accessibility dasar.

Jangan menghapus data existing. Buat migration/backfill yang aman.

STACK TARGET

Next.js App Router + TypeScript (gunakan versi existing atau latest stable yang kompatibel; jangan upgrade major tanpa alasan).

Tailwind CSS untuk styling dan design tokens.

Supabase Auth + PostgreSQL + RLS jika repository memang menggunakan Supabase; jika DB berbeda, pertahankan adapter tetapi ikuti domain model di bawah.

PaymentProvider abstraction dengan implementasi Midtrans atau Xendit berdasarkan ENV/config yang tersedia.

AIProvider abstraction agar bisa menggunakan OpenAI-compatible/Anthropic/provider lain tanpa mengikat domain.

Sentry atau observability existing.

Vitest/Jest untuk unit/integration dan Playwright untuk critical E2E jika toolchain kompatibel.

DESIGN SYSTEM

Pertahankan identitas Arva Tracker: dark navy, white, elegant gold accent. Dashboard app boleh menggunakan surface terang/dark sesuai desain existing, tetapi harus konsisten. Buat design token, jangan hard-code warna berulang.

FASE 0 - AUDIT

Sebelum coding:

Print ringkasan arsitektur repository.

Identifikasi package manager dan commands.

Identifikasi route, auth, schema, migrations, env, deployment.

Cari technical debt yang menghalangi V2.

Buat file docs/ARVA_TRACKER_V2_PLAN.md berisi audit, keputusan, risiko, dan urutan migration.

Jangan melakukan destructive change.

DOMAIN MODEL WAJIB

Gunakan auth provider untuk identity, lalu buat domain minimum:

profiles

workspaces (type: personal|coach|community|business)

workspace_members (role: owner|admin|coach|member|viewer)

workspace_invites

programs

program_steps

program_enrollments

activity_logs

daily_reflections

progress_snapshots

coach_client_links

accountability_links

coach_interventions

community_challenges

challenge_members

plans

subscriptions

billing_transactions

webhook_events

notifications

ai_insights

ai_usage

audit_logs

feature_flags

referrals (boleh Phase 2)

DATABASE RULES

Primary key UUID.

timestamptz UTC.

FK + ON DELETE behavior eksplisit.

Unique constraint untuk membership/enrollment yang relevan.

Index untuk workspace membership, activity logs by enrollment/date, active subscription, scheduled notifications, audit logs.

JSONB hanya untuk flexible config/metrics; data yang sering di-query harus kolom relational.

Personal workspace otomatis dibuat untuk setiap user.

Semua collaborative entity memiliki workspace_id secara langsung atau bisa diturunkan secara aman.

RLS / AUTHORIZATION

Jika Supabase:

Enable RLS pada semua tabel user/tenant data.

Policy membaca workspace membership dari auth.uid().

User hanya melihat data pribadi kecuali relation/permission eksplisit.

Coach hanya melihat client yang linked/assigned.

Community admin melihat aggregate/member progress sesuai permission; reflection private tidak boleh bocor.

Service role hanya server-side.
Tambahkan test yang membuktikan cross-tenant read/write ditolak.

PRICING & ENTITLEMENT

Seed plan:

FREE - Rp0

PERSONAL_PRO - Rp39.000/bulan, Rp349.000/tahun

COACH_PRO - Rp199.000/bulan, Rp1.790.000/tahun

COMMUNITY - Rp599.000/bulan, Rp5.390.000/tahun

BUSINESS - custom/manual

Entitlement disimpan sebagai config server-side dari plan, contoh:

max_active_programs

history_days

advanced_analytics

ai_weekly_insights

max_accountability_partners

max_clients

max_community_members

export_enabled

custom_branding
Jangan hard-code limit di UI. Buat helper server getEntitlements(workspaceId).

BILLING

Buat interface PaymentProvider:

createCheckout()

verifyWebhook()

parseEvent()

getPaymentStatus() bila perlu
Implement provider berdasarkan env. Jika credential belum ada, buat mock/dev provider yang aman untuk local development tanpa meniru webhook production secara insecure.

Flow wajib:

POST checkout server-side.

Price/plan/coupon dihitung server-side.

Simpan pending billing transaction.

Verify webhook signature.

Idempotency via provider event_id.

Dalam DB transaction update transaction + subscription.

Entitlement dibaca dari subscription server-side.

Redirect browser tidak boleh mengaktifkan subscription.

Status subscription minimum:
trialing, active, past_due, grace, canceled, expired.
Support upgrade, downgrade effective period, cancellation, and failed payment UX.

PERSONAL PRO

Implement:

unlimited programs (sesuai entitlement)

unlimited history

advanced progress 7/30/90 days

weekly report

export CSV/PDF sederhana

paywall component reusable

plan/billing page

COACH MODE

Routes/UI minimum:
/app/coach
/app/coach/clients

/app/coach/clients/[id]
/app/coach/programs

Fitur:

Coach workspace.

Invite client dengan signed/random token; simpan token hash, expiry.

Client accept dengan consent.

Client list + search/filter.

Client detail: 7/30-day progress, streak, recent activity, program enrollment.

Needs Attention queue.

Deterministic risk score MVP:
inactivity >= 3d = +35
completion 7d < 50% = +30
streak broken = +20
priority tasks missed = +15
0-29 green, 30-59 yellow, 60-100 red.

Tampilkan reason breakdown untuk risk score.

Coach intervention log.

Nudge template; rate limit dan audit log.

Private coach note tidak terlihat client kecuali explicitly shared.

COMMUNITY MODE

Routes minimum:
/app/community
/app/community/challenges
/app/community/challenges/[id]
/app/community/members

Fitur:

Create challenge from program.

Invite link/code.

Member roster.

Aggregate progress.

Metrics: participants, active today, completion rate, 7-day active, at-risk.

Leaderboard opt-in; jangan expose data private.

Announcement/nudge.

Role owner/admin/coach/member.

Light community branding gated by entitlement.

AI COACH

Buat ai gateway server-only:

AIProvider interface.

model router: FAST dan REASONING.

configurable provider/model via ENV.

timeout + retry + fallback.

output schema validation.

prompt_version dan model disimpan.

ai_usage simpan input/output token dan cost estimate jika tersedia.

per-plan usage limit/soft budget.

MVP AI use case:

Weekly Personal Insight.

Coach Client Summary on-demand.

Optional Daily Micro Nudge.

Privacy:

Default input menggunakan structured metrics, bukan raw notes.

Redact email/phone/token/secret dari context.

Reflection hanya dikirim bila explicit opt-in/config.

Jangan membuat diagnosis medis/psikologis.

Weekly insight output JSON:
{
"summary": string,
"wins": string[],
"risks": string[],
"next_actions": string[],
"tone": "supportive"
}
Render dengan UI card yang clean dan action-oriented.

BACKGROUND JOBS

Buat idempotent job handlers:

progress snapshot generation

weekly AI insight

scheduled reminders

subscription reconciliation

invite expiration cleanup
Jangan mengikat domain ke satu scheduler. Buat endpoint/job function yang bisa dipanggil Vercel Cron, server cron, atau queue.

ANALYTICS EVENTS

Buat analytics adapter. Track minimum:

signup_completed

program_created

enrollment_started

activity_completed

week_success

paywall_viewed

checkout_started

subscription_activated

coach_invite_accepted

ai_insight_viewed
Jangan memasukkan note/private text sebagai event property.

OBSERVABILITY

Structured error handling.

request_id/correlation id.

Sentry existing jika tersedia.

audit_logs untuk role change, billing, export, delete, coach intervention sensitif, dan admin support action.

Jangan log secret/token/full payment payload.

PERFORMANCE

Server Components default; use client hanya untuk interaksi.

Avoid N+1 queries pada dashboard coach/community.

Index berdasarkan query nyata.

Lazy load chart/AI panel berat.

Paginate member/client list.

Cache aggregate yang aman melalui progress_snapshots bila query mahal.

Image optimization dan bundle check.

UX REQUIREMENTS

Mobile-first.

Skeleton untuk dashboard, bukan spinner global.

Error state dengan retry.

Empty state punya satu CTA yang jelas.

Optimistic update hanya untuk activity check/uncheck dan harus rollback ketika gagal.

Paywall tidak menghapus data; hanya membatasi premium actions.

Accessibility: label, focus state, keyboard navigation, contrast.

FOLDER ORGANIZATION (ADAPT TO REPO)

Prefer struktur domain-based, misalnya:
src/
app/
components/
features/
auth/
programs/
tracking/
billing/
coach/
community/
ai/
lib/
db/
auth/
payments/
ai/
analytics/
security/
server/
services/
jobs/
types/
validation/

supabase/
migrations/
seed.sql
docs/

Jangan memindahkan seluruh repo hanya demi mengikuti struktur ini. Refactor incremental.

TEST WAJIB

Auth/authorization:

cross tenant read denied

cross tenant write denied

coach cannot see unrelated client

Billing:

webhook signature invalid -> reject

duplicate event -> no duplicate activation

success -> subscription active

canceled/expired -> entitlement downgrade

Tracking:

activity completion ownership

weekly progress calculation

Coach:

risk score deterministic

invitation expiry/acceptance

AI:

output schema validation

budget exceeded fallback

provider timeout fallback

Critical E2E:
signup -> create program -> check activity -> upgrade mock -> access Pro
coach -> invite client -> client accepts -> coach sees progress

MIGRATION STRATEGY

Inspect current schema and map old table -> new domain.

Add new tables/columns first.

Backfill in separate migration/script.

Dual-read only jika benar-benar perlu.

Jangan drop old columns sampai compatibility terverifikasi.

Buat docs migration notes.

ROADMAP EKSEKUSI

Implement bertahap:
A. Foundation: workspace/RLS/domain migrations.
B. Program/tracking V2.
C. Billing + Personal Pro.
D. Coach Mode.
E. AI Coach.
F. Community Mode.
G. Hardening + launch.

SETIAP FASE HARUS

jelaskan file yang akan diubah

implement code lengkap

jalankan lint/typecheck/test/build

perbaiki error sampai bersih

update docs/ARVA_TRACKER_V2_PLAN.md

commit-ready output (jangan commit kecuali diminta)

DEFINITION OF DONE

Fitur belum selesai jika:

auth hanya di frontend

tidak ada validation

tidak ada loading/error/empty state

RLS/test tenant tidak ada untuk data sensitif

billing mengandalkan redirect

webhook tidak idempotent

AI output tidak divalidasi

TypeScript/lint/build gagal

LANGKAH PERTAMA SEKARANG

Audit repository secara menyeluruh.

Tampilkan ringkasan temuan dan gap terhadap blueprint ini.

Buat docs/ARVA_TRACKER_V2_PLAN.md.

Usulkan migration plan paling aman.

Setelah itu mulai FASE A tanpa meminta saya menyalin ulang konteks, kecuali ada keputusan bisnis yang benar-benar blocking.

Expected Output Pertama dari Codex

Repository audit: stack, route, schema, auth, deployment, dan technical debt.

Gap analysis terhadap blueprint V2 tanpa melakukan destructive rewrite.

docs/ARVA_TRACKER_V2_PLAN.md berisi ADR, migration strategy, risiko, dan urutan fase.

Daftar file/migration yang akan dibuat pada Fase A serta command test/build yang akan dijalankan.

Implementasi Fase A baru dimulai setelah audit selesai dan repository tetap buildable.

Rule untuk Sesi Coding

Jika Codex menemukan stack existing berbeda dari asumsi blueprint, pertahankan komponen yang sehat dan adaptasikan domain model. Jangan melakukan major upgrade hanya untuk mengejar versi terbaru.
