import { useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface ReportListProps {
  reports: Report[];
  onRefresh: () => void;
  onViewTracking: (ticketNumber: string) => void;
}

export function ReportList({ reports, onRefresh, onViewTracking }: ReportListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      r.kode_lokasi.toLowerCase().includes(search.toLowerCase()) ||
      r.nama_fasilitas.toLowerCase().includes(search.toLowerCase()) ||
      r.deskripsi_kerusakan.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleQuickStatus(reportId: number, status: string) {
    setUpdatingId(reportId);
    try {
      const res = await api.updateReportStatus(reportId, status);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="bg-white border border-[#DCE1DC] rounded-[16px] p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#14201E]">Semua Pengaduan Sarpras</h2>
          <p className="text-xs text-[#5F6E6A]">Daftar seluruh laporan kerusakan fasilitas fisik kampus.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tiket, lokasi, fasilitas…"
            className="h-[34px] px-3 bg-white border border-[#DCE1DC] rounded-[8px] text-xs text-[#14201E] focus:outline-none focus:border-[#0F6B5C]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[34px] px-2.5 bg-white border border-[#DCE1DC] rounded-[8px] text-xs text-[#14201E] focus:outline-none focus:border-[#0F6B5C]"
          >
            <option value="ALL">Semua Status</option>
            <option value="Terkirim">Terkirim</option>
            <option value="Dugaan Mendesak">Dugaan Mendesak</option>
            <option value="Diterima">Diterima</option>
            <option value="Diproses">Diproses</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F5F6F2] text-[#5F6E6A] font-semibold uppercase text-[10px]">
            <tr>
              <th className="p-2.5 rounded-l-[8px]">Tiket</th>
              <th className="p-2.5">Fasilitas &amp; Lokasi</th>
              <th className="p-2.5">Deskripsi</th>
              <th className="p-2.5">Pelapor</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 rounded-r-[8px] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE1DC]/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#8A9692]">
                  Tidak ada laporan yang sesuai dengan pencarian/filter.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.report_id} className="hover:bg-[#F5F6F2]/50 transition-colors">
                  <td className="p-2.5 font-mono font-bold text-[#0F6B5C] whitespace-nowrap">
                    #{item.ticket_number}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <strong className="text-[#14201E] block">{item.nama_fasilitas}</strong>
                    <small className="text-[#5F6E6A]">{item.kode_lokasi}</small>
                  </td>
                  <td className="p-2.5 max-w-[220px] truncate text-[#5F6E6A]">
                    {item.deskripsi_kerusakan}
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-[#5F6E6A]">
                    <div>{item.User?.nama_lengkap || 'Mahasiswa'}</div>
                    <small className="font-mono text-[10px] text-[#8A9692]">{item.User?.nim}</small>
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <select
                      value={item.status}
                      disabled={updatingId === item.report_id}
                      onChange={(e) => handleQuickStatus(item.report_id, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-[6px] border ${
                        item.status === 'Selesai'
                          ? 'bg-[#DDF0E3] text-[#256B43] border-[#256B43]/30'
                          : item.status === 'Diproses'
                          ? 'bg-[#FBEACB] text-[#8A5A00] border-[#8A5A00]/30'
                          : item.status === 'Dugaan Mendesak'
                          ? 'bg-[#F9E1DE] text-[#A8261D] border-[#A8261D]/30'
                          : 'bg-[#DDEFEA] text-[#0F6B5C] border-[#0F6B5C]/30'
                      }`}
                    >
                      <option value="Terkirim">Terkirim</option>
                      <option value="Dugaan Mendesak">Dugaan Mendesak</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Diproses">Diproses</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => onViewTracking(item.ticket_number)}
                      className="text-xs text-[#0F6B5C] hover:underline font-semibold"
                    >
                      Linimasa →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
