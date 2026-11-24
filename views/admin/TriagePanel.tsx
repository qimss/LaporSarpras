import { useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface TriagePanelProps {
  emergencyList: Report[];
  onRefresh: () => void;
}

export function TriagePanel({ emergencyList, onRefresh }: TriagePanelProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function handleTriage(reportId: number, action: 'verify' | 'downgrade') {
    const confirmation = window.confirm(
      action === 'verify'
        ? 'Verifikasi laporan ini sebagai KONDISI DARURAT (SLA 1-2 Jam)?'
        : 'Turunkan laporan ini menjadi prioritas REGULER?'
    );
    if (!confirmation) return;

    setLoadingId(reportId);
    try {
      const res = await api.triageEmergency(reportId, action);
      if (res.success) {
        alert(res.message);
        onRefresh();
      } else {
        alert(res.message || 'Gagal memproses triage.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan server.');
    } finally {
      setLoadingId(null);
    }
  }

  if (emergencyList.length === 0) {
    return (
      <div className="bg-[#DDF0E3] border border-[#256B43]/20 rounded-[14px] p-4 text-xs text-[#256B43] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🛡️</span>
          <strong>Semua Triage Aman:</strong> Tidak ada laporan dugaan bahaya mendesak yang menunggu verifikasi saat ini.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9E1DE] border-2 border-[#A8261D] rounded-[16px] p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-[#A8261D]/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#A8261D] text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase animate-pulse">
            RED ALERT
          </span>
          <h2 className="text-sm sm:text-base font-bold text-[#A8261D]">
            Triage Kondisi Darurat (Menunggu Verifikasi Staf Sarpras)
          </h2>
        </div>
        <span className="text-xs font-bold text-[#A8261D] bg-white px-2.5 py-0.5 rounded-full border border-[#A8261D]/30">
          {emergencyList.length} Laporan Pending
        </span>
      </div>

      <p className="text-xs text-[#5F6E6A] mb-4">
        SLA Penanganan Bahaya Fisik/Listrik adalah 1–2 jam. Verifikasi keabsahan laporan atau turunkan ke jadwal perbaikan reguler.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {emergencyList.map((item) => (
          <div
            key={item.report_id}
            className="bg-white border border-[#A8261D]/30 rounded-[12px] p-3.5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-1.5">
                <strong className="text-xs font-bold text-[#14201E] block">
                  {item.nama_fasilitas} — {item.kode_lokasi}
                </strong>
                <span className="text-[10px] font-mono font-semibold text-[#A8261D]">
                  #{item.ticket_number}
                </span>
              </div>

              <div className="text-[11px] text-[#A8261D] font-medium bg-red-50 p-2 rounded-[8px] mb-2 border border-red-100">
                🚨 {item.deskripsi_kerusakan}
              </div>

              {(item.emergencyVerification || item.EmergencyVerification) && (
                <div className="text-[10px] text-[#5F6E6A] space-y-0.5 mb-3">
                  <div>Durasi Masalah: <strong>{(item.emergencyVerification || item.EmergencyVerification)?.durasi_masalah}</strong></div>
                  <div>Pelapor: <strong>{(item.reporter || item.User)?.nama_lengkap || 'Mahasiswa'}</strong> ({(item.reporter || item.User)?.nim})</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#F5F6F2]">
              <button
                type="button"
                disabled={loadingId === item.report_id}
                onClick={() => handleTriage(item.report_id, 'verify')}
                className="flex-1 h-[34px] bg-[#A8261D] hover:bg-[#8e1f18] text-white text-xs font-semibold rounded-[8px] transition-colors shadow-xs"
              >
                {loadingId === item.report_id ? 'Proses…' : '✓ Verifikasi Darurat'}
              </button>
              <button
                type="button"
                disabled={loadingId === item.report_id}
                onClick={() => handleTriage(item.report_id, 'downgrade')}
                className="h-[34px] px-3 bg-white hover:bg-gray-100 text-[#5F6E6A] border border-[#DCE1DC] text-xs font-medium rounded-[8px] transition-colors"
              >
                Turunkan Reguler
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
