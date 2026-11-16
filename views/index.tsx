import { FormEvent, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { api } from './services/api';
import { Report, User } from './types';

// Admin Components
import { AdminDashboard } from './admin/AdminDashboard';

// Mahasiswa Components
import { ReportForm } from './mahasiswa/ReportForm';
import { SuccessScreen } from './mahasiswa/SuccessScreen';
import { TrackingTimeline } from './mahasiswa/TrackingTimeline';
import { MyReports } from './mahasiswa/MyReports';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('report');
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  // Login Form States
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 1. Cek sesi saat startup
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.me();
        if (res.success && res.user) {
          setUser(res.user);
          if (res.user.role === 'admin') {
            setCurrentScreen('admin_dashboard');
          } else {
            setCurrentScreen('report');
          }
        } else {
          setUser(null);
          setCurrentScreen('login');
        }
      } catch {
        setUser(null);
        setCurrentScreen('login');
      } finally {
        setLoadingSession(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Navigasi Terproteksi (Role-Based Access Control)
  function navigate(screen: string) {
    // Proteksi: Mahasiswa tidak boleh mengakses halaman admin
    if (screen.startsWith('admin_') && (!user || user.role !== 'admin')) {
      alert('Akses Ditolak: Anda tidak memiliki izin untuk mengakses area Admin Sarpras.');
      setCurrentScreen(user?.role === 'mahasiswa' ? 'report' : 'login');
      return;
    }

    setCurrentScreen(screen);
  }

  // 3. Proses Login Terpadu
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');

    if (!loginId.trim() || !loginPassword) {
      setLoginError('NIM, Email, atau ID Staf dan kata sandi wajib diisi.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await api.login(loginId.trim(), loginPassword);
      if (res.success && res.user) {
        setUser(res.user);
        setLoginPassword('');
        // Otomatis arahkan sesuai peran hasil autentikasi
        if (res.user.role === 'admin') {
          setCurrentScreen('admin_dashboard');
        } else {
          setCurrentScreen('report');
        }
      } else {
        setLoginError(res.message || 'NIM / Email atau kata sandi tidak cocok.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Gagal terhubung ke server autentikasi.');
    } finally {
      setLoginLoading(false);
    }
  }

  // 4. Proses Logout
  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setCurrentScreen('login');
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6F2] text-xs text-[#5F6E6A]">
        Memuat Sistem LaporSarpras AI…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F2] text-[#14201E] flex flex-col font-sans" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Header Aplikasi (Sesuai Desain Figma: Emerald #0F6B5C, h-70px) */}
      <Header
        title="LaporSarpras AI"
        subtitle={
          user?.role === 'admin'
            ? 'Pusat Kendali Operasional Biro Sarpras'
            : 'Universitas Muhammadiyah Yogyakarta'
        }
        user={user}
        onLogout={handleLogout}
        onNavigate={navigate}
        activeScreen={currentScreen}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-x-hidden">
        {/* ========================================================
            1. HALAMAN LOGIN (Satu Halaman Terpadu - Single Portal)
        ======================================================== */}
        {currentScreen === 'login' && (
          <div className="min-h-[calc(100dvh-70px)] flex flex-col justify-center items-center py-6 px-4">
            <div className="w-full max-w-[390px]">
              <div className="mb-6 text-left">
                <h1 className="text-2xl font-bold text-[#14201E] tracking-tight">Masuk ke Sistem</h1>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6E6A]">
                  Akses lewat 1 QR Code kampus. Gunakan NIM Mahasiswa, Email, atau ID Staf Sarpras.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-[12px] bg-[#F9E1DE] border border-[#A8261D]/30 text-xs text-[#A8261D] flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="bg-white rounded-[14px] border border-[#DCE1DC] p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2B3B38] mb-1.5">
                    NIM Mahasiswa atau Email
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="Contoh: 20240140151 atau email@mail.umy.ac.id"
                    className="w-full h-[42px] px-3.5 bg-white border border-[#DCE1DC] rounded-[10px] text-sm text-[#14201E] placeholder-[#8A9692] focus:outline-none focus:border-[#0F6B5C] focus:ring-1 focus:ring-[#0F6B5C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B3B38] mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full h-[42px] pl-3.5 pr-12 bg-white border border-[#DCE1DC] rounded-[10px] text-sm text-[#14201E] placeholder-[#8A9692] focus:outline-none focus:border-[#0F6B5C] focus:ring-1 focus:ring-[#0F6B5C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 text-xs text-[#0F6B5C] font-semibold hover:text-[#0c574a]"
                    >
                      {showPassword ? 'Tutup' : 'Lihat'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-[48px] bg-[#0F6B5C] hover:bg-[#0c574a] text-white font-semibold text-sm rounded-[10px] shadow-xs flex items-center justify-center gap-2 transition-all mt-2"
                >
                  {loginLoading ? 'Memeriksa Kredensial…' : 'Masuk ke Sistem'}
                </button>
              </form>

              {/* Info Guidance Banner */}
              <div className="mt-4 bg-[#EDF7F4] border border-[#DDEFEA] rounded-[14px] p-3.5 text-xs text-[#2B3B38] flex items-start gap-2.5">
                <span className="text-base text-[#0F6B5C]">ℹ️</span>
                <div className="leading-relaxed">
                  <strong className="text-[#0F6B5C]">Otomatisasi Hak Akses:</strong>
                  <p className="text-[#5F6E6A] mt-0.5">
                    Sistem mendeteksi apakah Anda mahasiswa atau staf admin dan langsung mengarahkan Anda ke area kerja masing-masing.
                  </p>
                </div>
              </div>

              {/* Publik Tracking Link */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('tracking')}
                  className="text-xs text-[#5F6E6A] hover:text-[#0F6B5C] font-medium"
                >
                  🔍 Lacak status tiket laporan tanpa login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            2. MAHASISWA: FORMULIR PELAPORAN (mahasiswa/)
        ======================================================== */}
        {currentScreen === 'report' && (
          <ReportForm
            onSuccess={(rep) => {
              setSubmittedReport(rep);
              setCurrentScreen('success');
            }}
          />
        )}

        {/* ========================================================
            3. MAHASISWA: SUCCESS TICKET FEEDBACK (mahasiswa/)
        ======================================================== */}
        {currentScreen === 'success' && submittedReport && (
          <SuccessScreen
            report={submittedReport}
            onTrack={(tkt) => {
              setSelectedTicket(tkt);
              setCurrentScreen('tracking');
            }}
            onNew={() => setCurrentScreen('report')}
          />
        )}

        {/* ========================================================
            4. MAHASISWA / PUBLIK: TRACKING LINIMASA (mahasiswa/)
        ======================================================== */}
        {currentScreen === 'tracking' && (
          <TrackingTimeline
            initialTicket={selectedTicket}
            onBack={() => setCurrentScreen(user ? (user.role === 'admin' ? 'admin_dashboard' : 'report') : 'login')}
          />
        )}

        {/* ========================================================
            5. MAHASISWA: RIWAYAT PENGADUAN SAYA (mahasiswa/)
        ======================================================== */}
        {currentScreen === 'my_reports' && user?.role === 'mahasiswa' && (
          <MyReports
            onSelectTicket={(tkt) => {
              setSelectedTicket(tkt);
              setCurrentScreen('tracking');
            }}
            onNewReport={() => setCurrentScreen('report')}
          />
        )}

        {/* ========================================================
            6. ADMIN: DASHBOARD PUSAT KENDALI OPERASIONAL (admin/)
        ======================================================== */}
        {currentScreen === 'admin_dashboard' && user?.role === 'admin' && (
          <AdminDashboard
            onViewTracking={(tkt) => {
              setSelectedTicket(tkt);
              setCurrentScreen('tracking');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-[#DCE1DC] text-center text-xs text-[#5F6E6A]">
        Proyek Perancangan Sistem Pengaduan Fasilitas Kampus Berbasis AI — Kelompok 5 TI UMY 2026
      </footer>
    </div>
  );
}
