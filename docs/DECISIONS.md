# Decision Log

Append-only. Jangan edit atau hapus entri lama — kalau keputusan berubah, tambah entri baru yang menyatakan perubahannya dan alasan kenapa, lalu tandai entri lama sebagai "Superseded by #N".

Format: `#N — YYYY-MM-DD — Judul singkat`

---

### #1 — 2026-08-27 — Stack tetap self-hosted, TIDAK migrasi ke Supabase

**Konteks:** Blueprint V2 (`Arva_Tracker_V2_Blueprint.pdf`) mengasumsikan Supabase Auth + Postgres + RLS sebagai default.

**Keputusan:** Tetap pakai stack aktual — Prisma + PostgreSQL self-hosted, auth custom (bcryptjs + session cookie).

**Alasan:** Konsisten dengan prinsip self-hosted Coach Arifin di semua proyek (GadaiVault, VaultMind). V1 sudah membuktikan pola ini stabil di production. Pindah ke Supabase berarti migrasi auth + database sekaligus tanpa manfaat yang jelas dibanding risikonya.

**Konsekuensi:** Tidak ada RLS native. Isolasi multi-tenant harus ditegakkan di application layer lewat helper terpusat (lihat Fase A di PLAN.md). Ini menambah tanggung jawab testing (cross-tenant test wajib), tapi risikonya diterima demi konsistensi arsitektur.

---

### #2 — 2026-08-27 — Tidak migrasi ke Tailwind CSS untuk sekarang

**Konteks:** Blueprint mengasumsikan Tailwind CSS. Repo aktual pakai plain CSS (`globals.css`, `landing.css`), dan landing page + brand asset sudah jadi dan dipakai production.

**Keputusan:** Tidak migrasi CSS existing. Tailwind boleh dipertimbangkan lagi khusus untuk screen dashboard baru yang kompleks (Coach Mode, Community Mode) kalau plain CSS terasa tidak scalable saat itu — evaluasi ulang, jangan migrasi preventif.

**Alasan:** Prinsip blueprint sendiri: "pertahankan yang sudah baik, refactor hanya kalau ada alasan teknis jelas." Belum ada alasan teknis konkret untuk migrasi sekarang.

---

### #3 — 2026-08-27 — DailyPlan/TimeBlock tetap hidup sebagai bagian domain Tracking

**Konteks:** Blueprint tidak menyebut fitur ini sama sekali, karena ditulis generik tanpa tahu repo aktual sudah punya time-blocking harian yang matang (ada test tersendiri).

**Keputusan:** `DailyPlan`/`TimeBlock` tetap ada, disandingkan dengan `Module/Phase/Check` di bawah domain Tracking yang sama, bukan dibuang demi "murni ikut blueprint".

**Alasan:** Ini aset yang sudah terbukti dipakai dan diuji. Blueprint adalah panduan, bukan spesifikasi yang harus diikuti 1:1 kalau bertentangan dengan sesuatu yang sudah bekerja.

---

### #4 — 2026-08-27 — Titik mulai V2 adalah Fase A (Workspace Foundation), bukan Billing atau AI

**Konteks:** Blueprint punya banyak fase menarik (billing, AI, community) yang bisa menggoda untuk dikerjakan duluan.

**Keputusan:** Mulai dari `Workspace`+`WorkspaceMember` sebagai fondasi, dengan backfill non-destruktif (setiap user existing dapat personal workspace otomatis).

**Alasan:** Semua fase berikutnya (Coach Mode, Community, Billing per-workspace) bergantung pada konsep workspace ada duluan. Mengerjakan billing atau AI dulu tanpa fondasi ini berarti kerja ulang nanti.
