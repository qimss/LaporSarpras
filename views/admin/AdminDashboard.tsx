import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { KPIs, Report } from '../types';
import { TriagePanel } from './TriagePanel';
import { ClusterTable } from './ClusterTable';
import { ReportList } from './ReportList';

interface AdminDashboardProps {
  onViewTracking: (ticketNumber: string) => void;
}

export function AdminDashboard({ onViewTracking }: AdminDashboardProps) {
  const [kpis, setKpis] = useState<KPIs>({ total: 0, urgent: 0, inProgress: 0, completed: 0 });
  const [emergencyList, setEmergencyList] = useState<Report[]>([]);
  const [clusteredReports, setClusteredReports] = useState<Report[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), 4500);
    return () => clearTimeout(timer);
  }, [popup]);

  async function loadDashboardData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminDashboard();
      if (res.success) {
        setKpis(res.kpis || { total: 0, urgent: 0, inProgress: 0, completed: 0 });
        setEmergencyList(res.emergencyList || []);
        setClusteredReports(res.clusteredReports || []);
        setAllReports(res.allReports || []);
      } else {
        setError(res.message || 'Gagal memuat data dashboard.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke API backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleRunAI() {
    setAiRunning(true);
    try {
      const res = await api.runBatchAI();
      if (res.success) {
        setPopup({ msg: res.message || 'Siklus analisis AI berhasil dijalankan!', type: 'success' });
        await loadDashboardData();
      } else {
        setPopup({ msg: res.message || 'Gagal menjalankan siklus AI.', type: 'error' });
      }
    } catch (err: any) {
      setPopup({ msg: err.message || 'Gagal memicu batch AI.', type: 'error' });
    } finally {
      setAiRunning(false);
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '20px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      {/* Pop-up Toast Notifikasi Admin (Kontras Tinggi, Jelas di HP & Desktop) */}
      {popup && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: 'max-content',
            minWidth: '300px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '15px 22px',
            borderRadius: '14px',
            backgroundColor: popup.type === 'success' ? '#0F6B54' : '#DC2626',
            color: '#FFFFFF',
            border: popup.type === 'success' ? '2px solid #064E3B' : '2px solid #991B1B',
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
            {popup.type === 'success' ? '✅' : '⚠️'} {popup.msg}
          </span>
          <button
            type="button"
            onClick={() => setPopup(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '4px 9px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Pusat Kendali Operasional */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Pusat Kendali Operasional Sarpras
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 500, color: '#334155', lineHeight: 1.5 }}>
            {todayFormatted} • Penjadwalan Cron AI otomatis berjalan setiap pukul 03.00 WIB
          </p>
        </div>

        <button
          type="button"
          disabled={aiRunning}
          onClick={handleRunAI}
          style={{
            padding: '12px 20px',
            borderRadius: '11px',
            border: 'none',
            backgroundColor: aiRunning ? '#64748B' : '#0F6B54',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: aiRunning ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(15, 107, 84, 0.24)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🤖</span>
          <span>{aiRunning ? 'Siklus AI Sedang Berjalan…' : 'Jalankan Siklus AI Sekarang'}</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 700,
            boxShadow: '0 6px 16px rgba(220, 38, 38, 0.25)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards Grid (Responsif HP & Desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Total Pengaduan
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A' }}>{kpis.total}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#B91C1C', marginBottom: '6px' }}>
            Dugaan Mendesak
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#DC2626' }}>{kpis.urgent}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #FCD34D',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.05)',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>
            Sedang Dikerjakan
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#B45309' }}>{kpis.inProgress}</div>
        </div>

        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
            Selesai Diperbaiki
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#15803D' }}>{kpis.completed}</div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#334155',
          }}
        >
          Memuat data operasional Sarpras…
        </div>
      ) : (
        <>
          {/* Panel Triage Bahaya Red Alert */}
          <TriagePanel emergencyList={emergencyList} onRefresh={loadDashboardData} />

          {/* Tabel Pengelompokan Kluster AI */}
          <ClusterTable clusteredReports={clusteredReports} onRefresh={loadDashboardData} />

          {/* Tabel Semua Laporan Raw */}
          <ReportList
            reports={allReports}
            onRefresh={loadDashboardData}
            onViewTracking={onViewTracking}
          />
        </>
      )}
    </div>
  );
}

export default AdminDashboard;