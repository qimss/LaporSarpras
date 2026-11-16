import { Report } from '../types';

interface SuccessScreenProps {
  report: Report;
  onTrack: (ticketNumber: string) => void;
  onNew: () => void;
}

export function SuccessScreen({ report, onTrack, onNew }: SuccessScreenProps) {
  const formattedDate = new Date(report.created_at || Date.now()).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="success-content max-w-md mx-auto py-8 text-center px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#DDF0E3] text-[#256B43] flex items-center justify-center text-3xl font-bold border border-[#256B43]/20 shadow-xs">
        ✓
      </div>

      <h1 className="text-2xl font-bold text-[#14201E] mb-1">Laporan Terkirim!</h1>
      <p className="text-xs text-[#5F6E6A] mb-6">
        Simpan kode tiket Anda untuk memantau linimasa perkembangan perbaikan oleh teknisi.
      </p>

      {/* Ticket Number Card */}
      <div className="ticket bg-white border border-[#DCE1DC] rounded-[14px] p-4 mb-4 shadow-xs">
        <small className="text-[10px] font-bold text-[#5F6E6A] uppercase tracking-wider block mb-0.5">
          NOMOR TIKET PENGADUAN
        </small>
        <strong className="text-xl font-mono font-bold text-[#0F6B5C] tracking-wide block">
          #{report.ticket_number}
        </strong>
      </div>

      {/* Detail Summary */}
      <div className="card summary bg-white border border-[#DCE1DC] rounded-[14px] p-4 text-xs text-left space-y-2 mb-6 shadow-xs">
        <div className="flex justify-between border-b border-[#F5F6F2] pb-1.5">
          <span className="text-[#5F6E6A]">Lokasi Ruangan:</span>
          <strong className="text-[#14201E]">{report.kode_lokasi}</strong>
        </div>
        <div className="flex justify-between border-b border-[#F5F6F2] pb-1.5">
          <span className="text-[#5F6E6A]">Fasilitas:</span>
          <strong className="text-[#14201E]">{report.nama_fasilitas}</strong>
        </div>
        <div className="flex justify-between border-b border-[#F5F6F2] pb-1.5">
          <span className="text-[#5F6E6A]">Status Awal:</span>
          <span className={`font-semibold ${report.status === 'Dugaan Mendesak' ? 'text-[#A8261D]' : 'text-[#0F6B5C]'}`}>
            {report.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#5F6E6A]">Waktu Submit:</span>
          <strong className="text-[#14201E]">{formattedDate} WIB</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => onTrack(report.ticket_number)}
          className="w-full h-[46px] bg-[#0F6B5C] hover:bg-[#0c574a] text-white font-semibold text-xs sm:text-sm rounded-[10px] shadow-xs flex items-center justify-center gap-2 transition-all"
        >
          <span>Pantau Linimasa Status Tiket</span>
          <span>→</span>
        </button>

        <button
          type="button"
          onClick={onNew}
          className="w-full h-[44px] bg-white hover:bg-gray-50 border border-[#DCE1DC] text-[#14201E] font-medium text-xs sm:text-sm rounded-[10px] transition-all"
        >
          + Laporkan Fasilitas Lain
        </button>
      </div>
    </div>
  );
}
