import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface TrackingTimelineProps {
  initialTicket?: string;
  onBack?: () => void;
}

export function TrackingTimeline({ initialTicket = '', onBack }: TrackingTimelineProps) {
  const [ticketInput, setTicketInput] = useState(initialTicket);
  const [report, setReport] = useState<Report | null>(null);
  const [stepIndex, setStepIndex] = useState(1);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchTracking(ticket: string) {
    if (!ticket.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getTracking(ticket.trim());
      if (res.success && res.report) {
        setReport(res.report);
        setStepIndex(res.stepIndex || 1);
        setStatusLogs(res.statusLogs || []);
      } else {
        setError(res.message || 'Nomor tiket tidak ditemukan.');
        setReport(null);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat status tiket.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialTicket) {
      fetchTracking(initialTicket);
    }
  }, [initialTicket]);

  const steps = [
    { title: 'Terkirim', desc: 'Laporan Masuk' },
    { title: 'Diterima', desc: 'Terverifikasi' },
    { title: 'Diproses', desc: 'Teknisi Bekerja' },
    { title: 'Selesai', desc: 'Tuntas' },
  ];

  return (
    <div className="tracking-page max-w-2xl mx-auto py-4 px-3 sm:px-4">
      {/* Header & Back */}
      <div className="flex items-center justify-between mb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-[#5F6E6A] hover:text-[#0F6B5C] flex items-center gap-1"
          >
            ← Kembali
          </button>
        )}
        <h1 className="text-lg font-bold text-[#14201E]">Pelacakan Status Pengaduan</h1>
        <span />
      </div>

      {/* Input Pencarian Tiket */}
      <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-3.5 mb-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTracking(ticketInput);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Ketik nomor tiket: TKT-20261116-0001"
            className="flex-1 h-[40px] px-3.5 bg-white border border-[#DCE1DC] rounded-[8px] text-xs sm:text-sm font-mono uppercase focus:outline-none focus:border-[#0F6B5C]"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-[40px] px-4 bg-[#0F6B5C] hover:bg-[#0c574a] text-white rounded-[8px] text-xs font-semibold shadow-xs transition-colors"
          >
            {loading ? 'Mencari…' : 'Cek Status'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3.5 mb-5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Card Ringkasan Tiket */}
          <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-4 shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <div>
                <strong className="text-sm sm:text-base text-[#14201E] block">{report.nama_fasilitas}</strong>
                <p className="text-xs text-[#5F6E6A] font-mono">#{report.ticket_number} • {report.kode_lokasi}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  report.status === 'Selesai'
                    ? 'bg-[#DDF0E3] text-[#256B43]'
                    : report.status === 'Diproses'
                    ? 'bg-[#FBEACB] text-[#8A5A00]'
                    : report.status === 'Dugaan Mendesak'
                    ? 'bg-[#F9E1DE] text-[#A8261D]'
                    : 'bg-[#DDEFEA] text-[#0F6B5C]'
                }`}
              >
                {report.status}
              </span>
            </div>

            {/* Banner Sinkronisasi Kluster AI jika terhubung dengan Induk */}
            {report.ParentReport && (
              <div className="mt-3 p-2.5 rounded-[10px] bg-[#EDF7F4] border border-[#DDEFEA] text-xs text-[#0F6B5C] flex items-center gap-2">
                <span>🔗</span>
                <span>
                  Laporan Anda digabungkan dengan tiket induk <strong>#{report.ParentReport.ticket_number}</strong> untuk penanganan terpadu. Status pengerjaan otomatis tersinkronisasi.
                </span>
              </div>
            )}
          </div>

          {/* 4-Step Stepper Progress Bar */}
          <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-4 sm:p-5 shadow-xs">
            <h2 className="text-xs font-semibold text-[#5F6E6A] uppercase tracking-wider mb-4">
              Tahapan Progres Penanganan
            </h2>
            <div className="grid grid-cols-4 gap-1 text-center relative">
              {steps.map((st, idx) => {
                const stepNum = idx + 1;
                const isPassed = stepIndex >= stepNum;
                const isCurrent = stepIndex === stepNum;

                return (
                  <div key={st.title} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors mb-1.5 ${
                        isCurrent
                          ? 'bg-[#0F6B5C] text-white ring-4 ring-[#0F6B5C]/20'
                          : isPassed
                          ? 'bg-[#DDF0E3] text-[#256B43]'
                          : 'bg-[#F5F6F2] text-[#8A9692] border border-[#DCE1DC]'
                      }`}
                    >
                      {isPassed && !isCurrent ? '✓' : stepNum}
                    </div>
                    <strong className={`text-xs block ${isCurrent ? 'text-[#0F6B5C] font-bold' : isPassed ? 'text-[#14201E]' : 'text-[#8A9692]'}`}>
                      {st.title}
                    </strong>
                    <small className="text-[10px] text-[#8A9692] hidden sm:block">{st.desc}</small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linimasa Catatan Petugas */}
          <div className="bg-white border border-[#DCE1DC] rounded-[14px] p-4 shadow-xs">
            <h2 className="text-xs font-semibold text-[#5F6E6A] uppercase tracking-wider mb-3">
              Linimasa Audit &amp; Catatan Petugas
            </h2>

            {statusLogs.length === 0 ? (
              <p className="text-xs text-[#8A9692] italic">Belum ada catatan pembaruan status.</p>
            ) : (
              <div className="space-y-3 relative pl-4 border-l-2 border-[#DCE1DC] ml-2">
                {statusLogs.map((log, i) => (
                  <div key={log.log_id || i} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#0F6B5C]" />
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#14201E]">{log.status_sesudah || log.status}</span>
                      <time className="text-[11px] text-[#8A9692]">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <p className="text-xs text-[#5F6E6A]">{log.catatan_petugas || log.keterangan}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
