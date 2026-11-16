import { FormEvent, useEffect, useRef, useState } from "react";

type Screen = "login" | "report" | "success" | "tracking" | "admin";

const statusNotes = [
  {
    status: "Diproses",
    time: "13:30",
    text: "Teknisi Pak Rudi menuju lokasi, cek freon & saluran pembuangan.",
    tone: "amber",
  },
  {
    status: "Diterima",
    time: "10:02",
    text: "Laporan diverifikasi, dijadwalkan hari ini.",
    tone: "teal",
  },
  { status: "Terkirim", time: "09:14", text: "Laporan diterima sistem.", tone: "green" },
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return <span className={`logo ${inverse ? "logo-inverse" : ""}`}>L</span>;
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="app-header">
      <Logo />
      <div>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </header>
  );
}

function Login({ onLogin, onAdmin }: { onLogin: () => void; onAdmin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!id.trim() || !password) {
      setError("Masukkan NIM / ID Pengguna dan kata sandi.");
      return;
    }
    onLogin();
  }

  return (
    <main className="mobile-page">
      <Header title="LaporSarpras AI" subtitle="Universitas Muhammadiyah Yogyakarta" />
      <section className="login-content">
        <h1>Masuk untuk melapor</h1>
        <p className="lead">Akses lewat 1 QR Code kampus. Gunakan NIM atau ID Sivitas Anda.</p>
        <form className="card form-card" onSubmit={submit}>
          <label>
            <span>NIM / ID Pengguna</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="contoh: 20230140123"
            />
          </label>
          <label>
            <span>Kata Sandi</span>
            <span className="password-wrap">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                aria-label="Kata Sandi"
              />
              <button
                type="button"
                className="text-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button">Masuk</button>
        </form>
        <aside className="info-card">
          Target pelaporan selesai &lt; 90 detik dari scan QR hingga nomor tiket.
        </aside>
        <button className="login-footer" onClick={onAdmin}>
          Prodi Teknologi Informasi • UMY
        </button>
      </section>
    </main>
  );
}

function ReportForm({ onSubmit }: { onSubmit: () => void }) {
  const [urgent, setUrgent] = useState(false);
  const [location, setLocation] = useState("Gedung F6 L2 R.204");
  const [facility, setFacility] = useState("Pendingin Ruangan (AC)");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("ac_rusak.jpg");
  const [risk, setRisk] = useState("Bahaya listrik");
  const inputRef = useRef<HTMLInputElement>(null);

  function send(event: FormEvent) {
    event.preventDefault();
    if (urgent && !fileName) return;
    onSubmit();
  }

  return (
    <main className="mobile-page report-page">
      <Header
        title="Lapor Kerusakan"
        subtitle={urgent ? "Mode Mendesak aktif" : "Isi cepat • < 90 detik"}
      />
      <form className="report-content" onSubmit={send}>
        <label className="field">
          <span>Lokasi Ruangan / Titik Fasilitas</span>
          <span className="input-count">
            <input value={location} maxLength={35} onChange={(e) => setLocation(e.target.value)} />
            <small>{location.length}/35 huruf</small>
          </span>
          {!urgent && (
            <small>Maksimal 35 karakter. Karakter berbahaya otomatis dibersihkan (anti-XSS).</small>
          )}
        </label>
        <label className="field">
          <span>Jenis Fasilitas</span>
          <select value={facility} onChange={(e) => setFacility(e.target.value)}>
            <option>Pendingin Ruangan (AC)</option>
            <option>Kelistrikan / Stopkontak</option>
            <option>Toilet / Sanitasi</option>
            <option>Proyektor / LCD</option>
          </select>
        </label>

        {urgent ? (
          <section className="urgent-panel">
            <button type="button" className="urgent-title" onClick={() => setUrgent(false)}>
              <span className="checked-box" aria-hidden="true">
                ✓
              </span>
              <strong>
                <span className="warning-icon">!</span> Kondisi Mendesak / Berbahaya
              </strong>
            </button>
            <strong className="field-label">Jenis risiko (pilih yang sesuai)</strong>
            <div className="chips">
              {["Bahaya listrik", "Banjir air", "Risiko fisik"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={risk === item ? "active" : ""}
                  onClick={() => setRisk(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Sudah berlangsung berapa lama?</span>
              <select>
                <option>Kurang dari 1 hari</option>
                <option>1–3 hari</option>
                <option>Lebih dari 3 hari</option>
              </select>
            </label>
            <p className="urgent-note">
              Laporan bahaya yang terverifikasi ditangani dengan SLA respons 1–2 jam.
            </p>
          </section>
        ) : (
          <>
            <label className="field">
              <span>Deskripsi Kerusakan</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: AC menetes air dan tidak dingin sejak kemarin pagi..."
              />
            </label>
          </>
        )}

        <div className="field">
          <span>Foto Bukti ({urgent ? "wajib" : "wajib, maks 5 MB"})</span>
          <input
            ref={inputRef}
            className="file-input"
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
          <button
            type="button"
            className={`dropzone ${urgent ? "dropzone-urgent" : ""}`}
            onClick={() => inputRef.current?.click()}
          >
            <strong>
              {urgent && !fileName
                ? "Foto bukti fisik wajib diunggah"
                : "Ambil foto / seret file ke sini"}
            </strong>
            {!urgent && <small>JPG, PNG • &lt; 5 MB</small>}
          </button>
          {fileName && !urgent && (
            <div className="file-card">
              <span className="photo-placeholder" />
              <span>
                <strong>{fileName}</strong>
                <small>2,1 MB • siap diunggah</small>
              </span>
              <button type="button" onClick={() => setFileName("")}>
                Hapus
              </button>
            </div>
          )}
        </div>

        {!urgent && (
          <button
            type="button"
            className="urgent-toggle"
            onClick={() => {
              setUrgent(true);
              setLocation("Lab Komputer 7B");
              setFacility("Kelistrikan / Stopkontak");
            }}
          >
            <span className="empty-box" />
            <strong>
              <span className="warning-icon">!</span> Tandai sebagai Kondisi Mendesak / Berbahaya
            </strong>
          </button>
        )}
        <button className={`primary-button ${urgent ? "danger-button" : ""}`}>
          {urgent ? "Kirim Laporan Mendesak" : "Kirim Laporan"}
        </button>
      </form>
    </main>
  );
}

function Success({ onTrack, onNew }: { onTrack: () => void; onNew: () => void }) {
  return (
    <main className="mobile-page success-page">
      <Header title="LaporSarpras AI" />
      <section className="success-content">
        <span className="success-mark">✓</span>
        <h1>Laporan Terkirim!</h1>
        <p className="lead">Simpan kode tiket Anda untuk memantau perkembangan perbaikan.</p>
        <div className="ticket">
          <small>KODE TIKET</small>
          <strong>#TKT-20261116-0042</strong>
        </div>
        <div className="card summary">
          <span>
            Lokasi <strong>Gedung F6 L2 R.204</strong>
          </span>
          <span>
            Fasilitas <strong>AC</strong>
          </span>
          <span>
            Waktu <strong>16 Nov 2026, 09:14</strong>
          </span>
        </div>
        <div className="success-actions">
          <button className="primary-button" onClick={onTrack}>
            Pantau Linimasa Status Tiket
          </button>
          <button className="secondary-button" onClick={onNew}>
            + Laporkan Fasilitas Lain
          </button>
        </div>
      </section>
    </main>
  );
}

function Stepper() {
  const steps = ["Terkirim", "Diterima / Terjadwal", "Sedang Ditangani", "Selesai"];
  return (
    <div className="card stepper">
      {steps.map((step, index) => (
        <div
          className={`step ${index === 3 ? "muted" : ""} ${index === 2 ? "current" : ""}`}
          key={step}
        >
          <span>{index + 1}</span>
          <div>
            <strong>{step}</strong>
            <small>
              {index === 0
                ? "16 Nov, 09:14"
                : index === 1
                  ? "16 Nov, 10:02"
                  : index === 2
                    ? "16 Nov, 13:30 • saat ini"
                    : "Menunggu"}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline() {
  return (
    <div className="card timeline-card">
      {statusNotes.map((note) => (
        <article key={note.status}>
          <div>
            <span className={`badge ${note.tone}`}>{note.status}</span>
            <time>{note.time}</time>
          </div>
          <p>{note.text}</p>
        </article>
      ))}
    </div>
  );
}

function Tracking() {
  return (
    <main className="tracking-page">
      <Header title="Status Tiket" subtitle="#TKT-20261116-0042" />
      <div className="tracking-desktop-header">
        <Logo />
        <strong>LaporSarpras AI — Pantau Tiket Publik</strong>
      </div>
      <section className="tracking-grid">
        <div className="tracking-main">
          <div className="card ticket-heading">
            <div>
              <strong>AC tidak dingin &amp; menetes</strong>
              <span className="badge amber">Diproses</span>
            </div>
            <p>#TKT-20261116-0042 • Gedung F6 L2 R.204</p>
          </div>
          <div className="mobile-cluster cluster-banner">
            Laporan Anda digabung dengan tiket induk #TKT-20261115-0031 untuk penanganan kolektif.
            Status tersinkron otomatis.
          </div>
          <Stepper />
          <div className="desktop-cluster cluster-banner">
            Laporan digabung dengan tiket induk #TKT-20261115-0031. Status perbaikan identik dan
            tersinkron otomatis.
          </div>
        </div>
        <aside className="tracking-aside">
          <h2>Linimasa Catatan Petugas</h2>
          <Timeline />
        </aside>
      </section>
    </main>
  );
}

const reportRows = [
  [
    "AC menetes & tidak dingin",
    "Gedung F6 L2",
    "Tinggi",
    "94%",
    "+2 Laporan Serupa Tergabung",
    "Diproses",
  ],
  ["Proyektor LCD tidak menyala", "Gedung F7 R.301", "Sedang", "87%", "—", "Diterima"],
  [
    "Kursi kuliah patah",
    "Gedung E5 R.102",
    "Rendah",
    "91%",
    "+4 Laporan Serupa Tergabung",
    "Selesai",
  ],
];

function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [aiRunning, setAiRunning] = useState(false);
  const [statuses, setStatuses] = useState(reportRows.map((row) => row[5]));
  const [alerts, setAlerts] = useState([
    "Stopkontak terbakar — Lab Komputer 7B",
    "Toilet banjir — Gedung E5 L1",
  ]);

  return (
    <main className="admin-page">
      <aside className="sidebar">
        <button className="brand" onClick={onExit}>
          <Logo inverse />
          <strong>LaporSarpras AI</strong>
        </button>
        {["Dashboard Operasional", "Semua Laporan", "Siklus AI", "Teknisi", "Laporan Bulanan"].map(
          (item, index) => (
            <button className={index === 0 ? "selected" : ""} key={item}>
              {item}
            </button>
          ),
        )}
        <div className="admin-user">
          <small>Admin Sarpras</small>
          <strong>Dimas P. Aditama</strong>
        </div>
      </aside>
      <section className="dashboard">
        <header className="dashboard-heading">
          <div>
            <h1>Pusat Kendali Operasional</h1>
            <p>Senin, 16 November 2026 • Batch AI terakhir: 03:00 WIB</p>
          </div>
          <button
            className="primary-button ai-button"
            onClick={() => {
              setAiRunning(true);
              window.setTimeout(() => setAiRunning(false), 1200);
            }}
          >
            {aiRunning ? "Siklus AI Berjalan…" : "Jalankan Siklus AI Sekarang"} <i />
          </button>
        </header>
        <div className="kpi-grid">
          {[
            ["Total Pengaduan", "248"],
            ["Dugaan Mendesak", "3"],
            ["Sedang Dikerjakan", "27"],
            ["Selesai", "196"],
          ].map(([label, value]) => (
            <div className="card kpi" key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="card alert-panel">
          <h2>
            <span className="red-badge">RED ALERT</span> Triage Kondisi Darurat • Menunggu
            Verifikasi
          </h2>
          <div className="alert-grid">
            {alerts.map((alert, index) => (
              <article className="card alert-card" key={alert}>
                <span className="photo-placeholder" />
                <div>
                  <strong>{alert}</strong>
