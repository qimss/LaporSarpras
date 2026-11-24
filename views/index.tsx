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

const SAVED_LOGIN_ID_KEY = 'laporsarpras_saved_login_id';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('report');
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  // Global Pop-up Bar State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Dedicated Alert Modal State (Sangat Terlihat di HP & Desktop)
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  } | null>(null);

  // Login Form States (Username/NIM tersimpan, Password selalu kosong)
  const [loginId, setLoginId] = useState<string>(() => localStorage.getItem(SAVED_LOGIN_ID_KEY) || '');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

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
    if (screen.startsWith('admin_') && (!user || user.role !== 'admin')) {
      showToast('Akses Ditolak: Anda tidak memiliki izin untuk mengakses area Admin Sarpras.', 'error');
      setCurrentScreen(user?.role === 'mahasiswa' ? 'report' : 'login');
      return;
    }

    setCurrentScreen(screen);
  }

  // 3. Proses Login Terpadu
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');

    const cleanId = loginId.trim();
    if (!cleanId || !loginPassword) {
      const msg = 'NIM, Email, atau ID Staf dan kata sandi wajib diisi.';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await api.login(cleanId, loginPassword);
      if (res.success && res.user) {
        // Simpan NIM/Email agar tetap muncul saat logout nanti, tetapi kosongkan password
        localStorage.setItem(SAVED_LOGIN_ID_KEY, cleanId);
        setUser(res.user);
        setLoginPassword('');
        setShowPassword(false);
        showToast(`Selamat datang, ${res.user.nama_lengkap}!`, 'success');

        if (res.user.role === 'admin') {
          setCurrentScreen('admin_dashboard');
        } else {
          setCurrentScreen('report');
        }
      } else {
        const msg = res.message || 'NIM / Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali kata sandi Anda.';
        setLoginError(msg);
        setLoginPassword('');
        setAlertModal({
          title: 'Kata Sandi / Kredensial Salah',
          message: msg,
          type: 'error',
        });
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Gagal terhubung ke server autentikasi.';
      setLoginError(msg);
      setAlertModal({
        title: 'Kendala Autentikasi',
        message: msg,
        type: 'error',
      });
      showToast(msg, 'error');
    } finally {
      setLoginLoading(false);
    }
  }

  // 4. Proses Logout (Simpan username/NIM, wajib ketik ulang password)
  async function handleLogout() {
    const savedId = user?.nim || user?.email || localStorage.getItem(SAVED_LOGIN_ID_KEY) || loginId || '';
    if (savedId) {
      localStorage.setItem(SAVED_LOGIN_ID_KEY, savedId);
    }

    try {
      await api.logout();
    } catch {}

    setUser(null);
    setLoginId(savedId);
    setLoginPassword('');
    setShowPassword(false);
    setLoginError('');
    setCurrentScreen('login');
    showToast('Anda telah keluar. Username/NIM tersimpan, silakan ketik ulang kata sandi untuk masuk kembali.', 'success');
  }

  if (loadingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F1F5F9',
          color: '#0F172A',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        Memuat Sistem LaporSarpras AI…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col"
      style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif' }}
    >
      {/* DEDICATED ALERT MODAL (Sangat Jelas & Terlihat di HP & Desktop) */}
      {alertModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="animate-error-shake"
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '26px 22px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
              border: alertModal.type === 'error' ? '2.5px solid #DC2626' : '2px solid #0F6B54',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: alertModal.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                border: alertModal.type === 'error' ? '2px solid #FCA5A5' : '2px solid #86EFAC',
                color: alertModal.type === 'error' ? '#DC2626' : '#15803D',
                fontSize: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {alertModal.type === 'error' ? '⚠️' : '✅'}
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                {alertModal.title}
              </h3>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#475569', lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAlertModal(null)}
              autoFocus
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '12px 18px',
                backgroundColor: alertModal.type === 'error' ? '#DC2626' : '#0F6B54',
                color: '#FFFFFF',
                borderRadius: '12px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: alertModal.type === 'error' ? '0 4px 14px rgba(220, 38, 38, 0.3)' : '0 4px 14px rgba(15, 107, 84, 0.3)',
              }}
            >
              {alertModal.type === 'error' ? 'Periksa Kembali / Coba Lagi' : 'Lanjutkan'}
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL POP-UP / TOAST BAR (Kontras Tinggi, Jelas di HP & Desktop) */}
      {toast && (
        <div
          role="alert"
          className="animate-popup-down"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: 'max-content',
            minWidth: '320px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '15px 22px',
            borderRadius: '14px',
            backgroundColor:
              toast.type === 'success' ? '#0F6B54' : toast.type === 'warning' ? '#D97706' : '#DC2626',
            color: '#FFFFFF',
            border:
              toast.type === 'success'
                ? '2px solid #064E3B'
                : toast.type === 'warning'
                ? '2px solid #92400E'
                : '2px solid #991B1B',
            boxShadow: '0 18px 38px -8px rgba(15, 23, 42, 0.45)',
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <span>
            {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup pop-up"
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Aplikasi */}
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
          <div
            style={{
              minHeight: 'calc(100dvh - 70px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 16px',
            }}
          >
            <div style={{ width: '100%', maxWidth: '440px' }}>
              <div style={{ marginBottom: '22px', textAlign: 'left' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Masuk ke Sistem
                </h1>
                <p style={{ marginTop: '6px', fontSize: '14.5px', color: '#475569', lineHeight: 1.5 }}>
                  Akses lewat 1 QR Code kampus. Gunakan NIM Mahasiswa, Email, atau ID Staf Sarpras.
                </p>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="animate-error-shake"
                  style={{
                    marginBottom: '18px',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    backgroundColor: '#FEF2F2',
                    border: '2px solid #DC2626',
                    color: '#991B1B',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.15)',
                  }}
                >
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '15px', marginBottom: '2px', color: '#B91C1C' }}>
                      Kata Sandi atau Kredensial Tidak Sesuai
                    </strong>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#7F1D1D' }}>
                      {loginError}
                    </span>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleLogin}
                autoComplete="off"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1.5px solid #CBD5E1',
                  padding: '26px 24px',
                  boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label
                      htmlFor="login-identifier"
                      style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginBottom: 0 }}
                    >
                      NIM Mahasiswa atau Email
                    </label>
                    {loginId && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginId('');
                          localStorage.removeItem(SAVED_LOGIN_ID_KEY);
                        }}
                        style={{
                          fontSize: '12px',
                          color: '#0F6B54',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        (Ganti Akun)
                      </button>
                    )}
                  </div>
                  <input
                    id="login-identifier"
                    name="username"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="Contoh: 20240140151 atau email@mail.umy.ac.id"
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 14px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #94A3B8',
                      borderRadius: '11px',
                      fontSize: '15.5px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {localStorage.getItem(SAVED_LOGIN_ID_KEY) && loginId && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                      ✓ Akun tersimpan. Silakan masukkan kata sandi untuk masuk kembali.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}
                  >
                    Kata Sandi
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      placeholder="Masukkan kata sandi akun Anda"
                      style={{
                        width: '100%',
                        height: '48px',
                        paddingLeft: '14px',
                        paddingRight: '68px',
                        backgroundColor: loginError ? '#FEF2F2' : '#FFFFFF',
                        border: loginError ? '2px solid #DC2626' : '1.5px solid #94A3B8',
                        borderRadius: '11px',
                        fontSize: '15.5px',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '12px',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        fontSize: '13.5px',
                        color: '#0F6B54',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? 'Tutup' : 'Lihat'}
                    </button>
                  </div>
                  {loginError && (
                    <p style={{ margin: '5px 0 0', fontSize: '12.5px', color: '#DC2626', fontWeight: 700 }}>
                      ⚠️ Kata sandi yang Anda masukkan salah.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    height: '50px',
                    backgroundColor: loginLoading ? '#64748B' : '#0F6B54',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '16px',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(15, 107, 84, 0.28)',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loginLoading ? 'Memeriksa Kredensial…' : 'Masuk ke Sistem'}
                </button>
              </form>

              {/* Info Guidance Banner */}
              <div
                style={{
                  marginTop: '18px',
                  backgroundColor: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>ℹ️</span>
                <div style={{ lineHeight: 1.5 }}>
                  <strong style={{ color: '#065F46' }}>Akses Otomatis Berbasis Peran:</strong>
                  <p style={{ color: '#334155', margin: '3px 0 0' }}>
                    Sistem mendeteksi apakah Anda mahasiswa atau staf admin Sarpras dan langsung mengarahkan Anda ke area kerja masing-masing.
                  </p>
                </div>
              </div>

              {/* Publik Tracking Link */}
              <div style={{ marginTop: '18px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('tracking')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    color: '#0F6B54',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
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
            showToast={showToast}
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
            onNewReport={() => {
              setSubmittedReport(null);
              setCurrentScreen('report');
            }}
            onReset={() => {
              setSubmittedReport(null);
              setCurrentScreen('report');
            }}
          />
        )}

        {/* ========================================================
            4. MAHASISWA / PUBLIK: TRACKING LINIMASA (mahasiswa/)
           ======================================================== */}
        {currentScreen === 'tracking' && (
          <TrackingTimeline
            initialTicket={selectedTicket}
            onBack={() =>
              setCurrentScreen(user ? (user.role === 'admin' ? 'admin_dashboard' : 'report') : 'login')
            }
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
      <footer
        style={{
          marginTop: 'auto',
          padding: '18px 16px',
          borderTop: '1px solid #CBD5E1',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          color: '#475569',
        }}
      >
        Proyek Perancangan Sistem Pengaduan Fasilitas Kampus Berbasis AI — Kelompok 5 TI UMY 2026
      </footer>
    </div>
  );
}