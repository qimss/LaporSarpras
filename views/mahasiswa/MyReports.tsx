import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface MyReportsProps {
  onSelectTicket: (ticketNumber: string) => void;
  onNewReport: () => void;
}

export function MyReports({ onSelectTicket, onNewReport }: MyReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const res = await api.getMyReports();
        if (res.success) {
          setReports(res.reports || []);
        } else {
          setError(res.message || 'Gagal memuat data laporan.');
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-4 px-3 sm:px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#14201E]">Daftar Pengaduan Saya</h1>
          <p className="text-xs text-[#5F6E6A]">Riwayat pengaduan fasilitas yang telah Anda laporkan.</p>
        </div>
        <button
          type="button"
          onClick={onNewReport}
          className="h-[36px] px-3 bg-[#0F6B5C] hover:bg-[#0c574a] text-white text-xs font-semibold rounded-[8px] transition-colors shadow-xs"
        >
          + Buat Laporan Baru
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-xs text-[#8A9692]">Memuat laporan Anda…</div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-8 text-center shadow-xs">
          <span className="text-3xl block mb-2">📋</span>
          <h2 className="text-sm font-bold text-[#14201E] mb-1">Belum Ada Pengaduan</h2>
          <p className="text-xs text-[#5F6E6A] mb-4">
            Anda belum pernah mengirim laporan kerusakan fasilitas kampus.
          </p>
          <button
            type="button"
            onClick={onNewReport}
            className="h-[38px] px-4 bg-[#0F6B5C] text-white text-xs font-semibold rounded-[8px]"
          >
            Mulai Melapor Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.report_id}
              onClick={() => onSelectTicket(rep.ticket_number)}
              className="bg-white border border-[#DCE1DC] hover:border-[#0F6B5C] rounded-[14px] p-4 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#0F6B5C]">
                    #{rep.ticket_number}
                  </span>
                  <h3 className="text-sm font-bold text-[#14201E]">{rep.nama_fasilitas}</h3>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    rep.status === 'Selesai'
                      ? 'bg-[#DDF0E3] text-[#256B43]'
                      : rep.status === 'Diproses'
                      ? 'bg-[#FBEACB] text-[#8A5A00]'
                      : rep.status === 'Dugaan Mendesak'
                      ? 'bg-[#F9E1DE] text-[#A8261D]'
                      : 'bg-[#DDEFEA] text-[#0F6B5C]'
                  }`}
                >
                  {rep.status}
                </span>
              </div>

              <p className="text-xs text-[#5F6E6A] line-clamp-2 mb-2">{rep.deskripsi_kerusakan}</p>

              <div className="flex items-center justify-between text-[11px] text-[#8A9692] border-t border-[#F5F6F2] pt-2">
                <span>📍 {rep.kode_lokasi}</span>
                <span>
                  {new Date(rep.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
