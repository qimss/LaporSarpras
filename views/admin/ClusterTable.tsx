import { useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface ClusterTableProps {
  clusteredReports: Report[];
  onRefresh: () => void;
}

export function ClusterTable({ clusteredReports, onRefresh }: ClusterTableProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function handleStatusChange(reportId: number, newStatus: string) {
    const confirmation = window.confirm(
      `Perbarui status tiket induk dan sinkronkan secara otomatis ke seluruh laporan serupa menjadi '${newStatus}'?`
    );
    if (!confirmation) return;

    setUpdatingId(reportId);
    try {
      const res = await api.updateReportStatus(reportId, newStatus);
      if (res.success) {
        alert(res.message);
        onRefresh();
      } else {
        alert(res.message || 'Gagal memperbarui status.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan server.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleUnlink(childId: number) {
    const confirmation = window.confirm(
      'Pisahkan laporan ini dari kluster induk? (Laporan akan berdiri sendiri kembali).'
    );
    if (!confirmation) return;

    try {
      const res = await api.unlinkCluster(childId);
      if (res.success) {
        alert(res.message);
        onRefresh();
      } else {
        alert(res.message || 'Gagal memisahkan laporan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    }
  }

  return (
    <div className="bg-white border border-[#DCE1DC] rounded-[16px] p-5 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#14201E] flex items-center gap-2">
            <span>🧠</span>
            <span>Pengelompokan Keluhan Serupa (AI Clustering)</span>
          </h2>
          <p className="text-xs text-[#5F6E6A]">
            Tiket induk yang mengonsolidasikan laporan kerusakan identik untuk efisiensi penanganan teknisi.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-[#DDEFEA] text-[#0F6B5C] rounded-full">
          {clusteredReports.length} Tiket Induk
        </span>
      </div>

      {clusteredReports.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#8A9692]">
          Belum ada kelompok pengaduan serupa. Jalankan Siklus AI untuk memproses pengelompokan batch.
        </div>
      ) : (
        <div className="space-y-4">
          {clusteredReports.map((master) => {
            const ai = master.AIAnalysisResult;
            const childs = master.ChildReports || [];
            const similarCount = ai?.jumlah_laporan_serupa || childs.length;

            return (
              <div
                key={master.report_id}
                className="border border-[#DCE1DC] rounded-[14px] p-4 bg-[#F5F6F2]/40 hover:bg-[#F5F6F2]/80 transition-colors"
              >
                {/* Header Master Report */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0F6B5C]">
                        #{master.ticket_number} (Induk)
                      </span>
                      {similarCount > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DDF0E3] text-[#256B43]">
                          +{similarCount} Laporan Serupa Tergabung
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          ai?.rekomendasi_prioritas === 'Tinggi'
                            ? 'bg-red-100 text-red-800'
                            : ai?.rekomendasi_prioritas === 'Sedang'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        Prioritas AI: {ai?.rekomendasi_prioritas || 'Normal'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#14201E] mt-0.5">
                      {master.nama_fasilitas} — {master.kode_lokasi}
                    </h3>
                  </div>

                  {/* Quick Cascading Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5F6E6A]">Status:</span>
                    <select
                      value={master.status}
                      disabled={updatingId === master.report_id}
                      onChange={(e) => handleStatusChange(master.report_id, e.target.value)}
                      className="h-[32px] px-2.5 bg-white border border-[#DCE1DC] rounded-[8px] text-xs font-semibold text-[#14201E] focus:outline-none focus:border-[#0F6B5C]"
                    >
                      <option value="Terkirim">Terkirim</option>
                      <option value="Diterima">Diterima / Terjadwal</option>
                      <option value="Diproses">Sedang Diproses</option>
                      <option value="Selesai">Selesai Diperbaiki</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-[#5F6E6A] mb-3">{master.deskripsi_kerusakan}</p>

                {/* AI Metadata Pills */}
                {ai && (
                  <div className="bg-white border border-[#DCE1DC] rounded-[10px] p-2.5 text-[11px] text-[#2B3B38] space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span>Kata Kunci AI: <strong>{ai.kata_kunci_utama || '—'}</strong></span>
                      <span>Keyakinan: <strong>{Math.round((ai.skor_keyakinan || 0.85) * 100)}%</strong></span>
                    </div>
                    <div className="text-[#5F6E6A]">
                      💡 <em>Rekomendasi Tindakan:</em> {ai.rekomendasi_tindakan}
                    </div>
                  </div>
                )}

                {/* Child Reports Drawer */}
                {childs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#DCE1DC]/60">
                    <div className="text-[11px] font-bold text-[#5F6E6A] uppercase mb-1.5">
                      Laporan Mahasiswa yang Tergabung ke Tiket Ini:
                    </div>
                    <div className="space-y-1.5">
                      {childs.map((ch) => (
                        <div
                          key={ch.report_id}
                          className="bg-white border border-[#DCE1DC] rounded-[8px] p-2 flex items-center justify-between text-xs"
                        >
                          <div className="truncate max-w-[420px]">
                            <span className="font-mono font-bold text-[#0F6B5C] mr-2">#{ch.ticket_number}</span>
                            <span className="text-[#14201E]">{ch.deskripsi_kerusakan}</span>
                            <span className="text-[#8A9692] ml-2 font-mono text-[10px]">
                              ({ch.User?.nama_lengkap || 'Mahasiswa'})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlink(ch.report_id)}
                            className="text-[10px] text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50"
                            title="Pisahkan dari kluster jika pengelompokan salah (Unlink False Positive)"
                          >
                            Pisahkan ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
