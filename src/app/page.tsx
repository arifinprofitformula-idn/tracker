import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Flame,
  Goal,
  LockKeyhole,
  Menu,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const benefits = [
  {
    icon: CalendarCheck2,
    title: "Tracker harian yang jelas",
    copy: "Tahu apa yang perlu dikerjakan hari ini. Centang aktivitas, lanjutkan ritme, tanpa catatan tercecer.",
  },
  {
    icon: BarChart3,
    title: "Progres mudah dibaca",
    copy: "Lihat perjalanan program secara utuh dan temukan bagian yang perlu mendapat perhatian lebih dulu.",
  },
  {
    icon: NotebookPen,
    title: "Catatan tetap terhubung",
    copy: "Simpan evaluasi dan insight tepat di dalam tracker, sehingga konteks penting tidak hilang.",
  },
  {
    icon: ShieldCheck,
    title: "Data personal terlindungi",
    copy: "Setiap akun hanya mengakses tracker miliknya sendiri melalui autentikasi dan validasi server.",
  },
  {
    icon: Target,
    title: "Program fleksibel",
    copy: "Atur tanggal mulai dan ikuti modul program yang dirancang untuk membangun kemajuan bertahap.",
  },
  {
    icon: Users,
    title: "Siap untuk tim dan komunitas",
    copy: "Admin dapat mengelola pengguna, peran, status akun, dan pengaturan fitur dari satu tempat.",
  },
];

const pains = [
  "Semangat tinggi di awal, lalu kehilangan ritme",
  "Aktivitas penting tersebar di chat dan catatan",
  "Sulit tahu progres nyata dari hari ke hari",
];

const gains = [
  "Prioritas harian terlihat dalam satu layar",
  "Setiap langkah tercatat dan mudah dievaluasi",
  "Konsistensi tumbuh lewat progres yang terlihat",
];

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <Link href="/" className="landing-logo" aria-label="Tracker System, halaman utama">
            <span className="logo-mark"><ClipboardCheck size={22} strokeWidth={2.2} /></span>
            <span>Tracker <strong>System</strong></span>
          </Link>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#manfaat">Manfaat</a>
            <a href="#keamanan">Keamanan</a>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="nav-login">Masuk</Link>
            <Link href="/register" className="landing-button button-small">
              Daftar gratis <ArrowRight size={16} />
            </Link>
          </div>
          <a href="#manfaat" className="mobile-menu" aria-label="Lihat manfaat"><Menu size={22} /></a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="landing-container hero-grid">
          <div className="hero-copy">
            <div className="landing-eyebrow"><Sparkles size={14} /> Sistem progres personal</div>
            <h1>Bangun konsistensi.<br /><span>Ukur setiap kemajuan.</span></h1>
            <p className="hero-lead">
              Ubah target besar menjadi langkah harian yang jelas. Tracker System membantu Anda fokus, mencatat aktivitas, dan melihat progres dalam satu dashboard.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="landing-button button-primary">
                Mulai tracking sekarang <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="landing-button button-ghost">Saya sudah punya akun</Link>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 size={16} /> Pendaftaran cepat</span>
              <span><LockKeyhole size={16} /> Data akun terlindungi</span>
              <span><Goal size={16} /> Siap dipakai langsung</span>
            </div>
          </div>

          <div className="product-stage" aria-label="Pratinjau dashboard Tracker System">
            <div className="stage-orbit orbit-a" />
            <div className="stage-orbit orbit-b" />
            <div className="product-window">
              <div className="window-bar">
                <span className="window-brand"><ClipboardCheck size={15} /> Tracker System</span>
                <span className="window-status"><i /> Aktif</span>
              </div>
              <div className="window-content">
                <div className="preview-heading">
                  <div><small>PROGRAM AKTIF</small><strong>Fokus Konsistensi</strong></div>
                  <span className="preview-chip">Hari ini</span>
                </div>
                <div className="preview-progress">
                  <div className="progress-meta"><span>Perjalanan program</span><b>Terus bertumbuh</b></div>
                  <div className="progress-track"><i /></div>
                </div>
                <div className="preview-grid">
                  <div className="preview-tasks">
                    <p>Aktivitas hari ini</p>
                    <div className="task done"><span><Check size={13} /></span><b>Review target utama</b></div>
                    <div className="task done"><span><Check size={13} /></span><b>Jalankan prioritas</b></div>
                    <div className="task"><span><Circle size={13} /></span><b>Catat evaluasi</b></div>
                  </div>
                  <div className="streak-card">
                    <Flame size={20} />
                    <small>RITME</small>
                    <strong>Terjaga</strong>
                    <span>Konsisten hari ini</span>
                  </div>
                </div>
                <div className="mini-chart" aria-hidden="true">
                  {[32, 46, 39, 61, 55, 76, 88, 72, 94].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}
                </div>
              </div>
            </div>
            <div className="floating-card floating-done"><CheckCircle2 size={19} /><span><small>AKTIVITAS</small><b>Selesai dicatat</b></span></div>
            <div className="floating-card floating-growth"><TrendingUp size={19} /><span><small>PROGRES</small><b>Terlihat jelas</b></span></div>
          </div>
        </div>
      </section>

      <section className="landing-section problem-section" id="cara-kerja">
        <div className="landing-container">
          <div className="section-heading centered">
            <span className="section-kicker">DARI NIAT MENJADI SISTEM</span>
            <h2>Masalahnya bukan kurang niat.<br />Masalahnya progres tidak terlihat.</h2>
            <p>Ketika aktivitas tidak tercatat, kemajuan terasa samar. Tracker System membuat langkah berikutnya selalu jelas.</p>
          </div>
          <div className="pain-gain-grid">
            <article className="contrast-card pain-card">
              <div className="contrast-label"><Circle size={15} /> Tanpa sistem</div>
              <h3>Terasa sibuk, tapi arah kabur</h3>
              <ul>{pains.map((item) => <li key={item}><span>×</span>{item}</li>)}</ul>
            </article>
            <article className="contrast-card gain-card">
              <div className="contrast-label"><Sparkles size={15} /> Dengan Tracker System</div>
              <h3>Yang berubah saat progres terlihat</h3>
              <ul>{gains.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section benefit-section" id="manfaat">
        <div className="landing-container">
          <div className="section-heading">
            <span className="section-kicker">SATU DASHBOARD, SATU ARAH</span>
            <h2>Manfaat yang terasa setiap hari</h2>
            <p>Fitur inti dirancang untuk mengurangi distraksi dan membantu Anda terus bergerak.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map(({ icon: Icon, title, copy }, index) => (
              <article className="benefit-card" key={title}>
                <div className="benefit-number">0{index + 1}</div>
                <div className="benefit-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="security-strip" id="keamanan">
        <div className="landing-container security-inner">
          <div className="security-icon"><ShieldCheck size={28} /></div>
          <div><span>PRIVASI BUKAN FITUR TAMBAHAN</span><h2>Tracker Anda, akses Anda.</h2></div>
          <p>Autentikasi aman, sesi terlindungi, dan validasi kepemilikan di server menjaga data setiap pengguna tetap terpisah.</p>
        </div>
      </section>

      <section className="landing-section final-cta">
        <div className="landing-container cta-panel">
          <div className="cta-grid-pattern" />
          <div className="cta-glow" />
          <div className="cta-content">
            <span className="section-kicker light">MULAI DARI HARI INI</span>
            <h2>Target besar dimulai dari<br />satu langkah yang tercatat.</h2>
            <p>Buat akun, buka tracker pertama Anda, dan mulai membangun ritme yang dapat dipertahankan.</p>
            <Link href="/register" className="landing-button button-light">
              Daftar sekarang <ArrowRight size={18} />
            </Link>
            <small>Sudah punya akun? <Link href="/login">Masuk ke dashboard</Link></small>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <Link href="/" className="landing-logo"><span className="logo-mark"><ClipboardCheck size={20} /></span><span>Tracker <strong>System</strong></span></Link>
          <p>Bangun konsistensi, satu centang setiap hari.</p>
          <div><Link href="/login">Masuk</Link><Link href="/register">Daftar</Link></div>
        </div>
      </footer>
    </main>
  );
}
