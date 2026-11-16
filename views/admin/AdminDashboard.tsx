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

  async function loadDashboardData() {
    setLoading(true);
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
        alert(res.message);
        loadDashboardData();
      } else {
        alert(res.message || 'Gagal menjalankan siklus AI.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memicu batch AI.');
    } finally {
      setAiRunning(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 px-3 sm:px-4">
      {/* Header Pusat Kendali Operasional */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14201E]">Pusat Kendali Operasional Sarpras</h1>
          <p className="text-xs text-[#5F6E6A]">
            Senin, 16 November 2026 • Penjadwalan Cron AI otomatis berjalan setiap pukul 03.00 WIB
          </p>
        </div>

        <button
          type="button"
          disabled={aiRunning}
          onClick={handleRunAI}
          className={`h-[42px] px-4 rounded-[10px] text-xs font-semibold text-white shadow-xs flex items-center gap-2 transition-all ${
            aiRunning ? 'bg-[#5F6E6A] cursor-not-allowed' : 'bg-[#0F6B5C] hover:bg-[#0c574a]'
          }`}
        >
          <span>🤖</span>
          <span>{aiRunning ? 'Siklus AI Sedang Berjalan…' : 'Jalankan Siklus AI Sekarang'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-4 shadow-xs">
          <small className="text-[11px] font-semibold text-[#5F6E6A] block mb-1">Total Pengaduan</small>
          <strong className="text-2xl sm:text-3xl font-bold text-[#14201E]">{kpis.total}</strong>
        </div>

        <div className="bg-white border border-red-200 rounded-[14px] p-4 shadow-xs bg-red-50/20">
          <small className="text-[11px] font-semibold text-[#A8261D] block mb-1">Dugaan Mendesak</small>
          <strong className="text-2xl sm:text-3xl font-bold text-[#A8261D]">{kpis.urgent}</strong>
        </div>

        <div className="bg-white border border-amber-200 rounded-[14px] p-4 shadow-xs bg-amber-50/20">
          <small className="text-[11px] font-semibold text-[#8A5A00] block mb-1">Sedang Dikerjakan</small>
          <strong className="text-2xl sm:text-3xl font-bold text-[#8A5A00]">{kpis.inProgress}</strong>
        </div>

        <div className="bg-white border border-green-200 rounded-[14px] p-4 shadow-xs bg-green-50/20">
          <small className="text-[11px] font-semibold text-[#256B43] block mb-1">Selesai Diperbaiki</small>
          <strong className="text-2xl sm:text-3xl font-bold text-[#256B43]">{kpis.completed}</strong>
        </div>
      </div>

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
    </div>
  );
}
