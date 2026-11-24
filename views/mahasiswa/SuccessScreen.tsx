import React from 'react';

interface SuccessScreenProps {
  report?: any;
  ticket?: any;
  onTrack?: (ticketNumber: string) => void;
  onTrackTicket?: (ticketNumber: string) => void;
  onNewReport?: () => void;
  onReset?: () => void;
  onBack?: () => void;
  onReportAnother?: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  report,
  ticket,
  onTrack,
  onTrackTicket,
  onNewReport,
  onReset,
  onBack,
  onReportAnother,
}) => {
  const data = report || ticket || {};
  const ticketNumber = data.ticket_number || 'TKT-00000000-0000';
  const lokasi = data.kode_lokasi || '-';
  const fasilitas = data.nama_fasilitas || '-';
  const status = data.status || 'Menunggu Analisis AI';
  const isUrgent = Boolean(data.is_urgent_claimed);

  const formattedDate = data.created_at
    ? new Date(data.created_at).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    : 'Baru saja';

  const handlePantauTiket = () => {
    const trackFn = onTrack || onTrackTicket;
    if (trackFn) {
      trackFn(ticketNumber);
    }
  };

  const handleLaporkanLain = () => {
    const resetFn = onNewReport || onReset || onBack || onReportAnother;
    if (resetFn) {
      resetFn();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '540px', margin: '0 auto', padding: '16px 16px 40px' }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '18px',
          padding: '28px 24px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
          textAlign: 'center',
        }}
      >
        {/* Ikon Sukses */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            border: '2px solid #86EFAC',
            color: '#15803D',
            fontSize: '26px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          ✓
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
          Laporan Terkirim!
        </h2>
        <p
          style={{
            margin: '0 auto 22px',
            maxWidth: '400px',
            fontSize: '14.5px',
            color: '#334155',
            lineHeight: 1.55,
          }}
        >
          Simpan kode tiket Anda untuk memantau linimasa perkembangan perbaikan oleh teknisi.
        </p>

        {/* Kotak Nomor Tiket */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '2px dashed #10B981',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#065F46',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            NOMOR TIKET PENGADUAN
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F6B54',
              letterSpacing: '0.03em',
              wordBreak: 'break-all',
            }}
          >
            #{ticketNumber}
          </div>
        </div>

        {/* Panel Fiksasi Analisis AI */}
        {data.aiAnalysis && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>🤖</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Fiksasi Analisis AI
                </span>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor:
                    data.aiAnalysis.rekomendasi_prioritas === 'Tinggi' || data.aiAnalysis.rekomendasi_prioritas === 'Kritis'
                      ? '#FEE2E2'
                      : data.aiAnalysis.rekomendasi_prioritas === 'Sedang'
                      ? '#FEF3C7'
                      : '#DCFCE7',
                  color:
                    data.aiAnalysis.rekomendasi_prioritas === 'Tinggi' || data.aiAnalysis.rekomendasi_prioritas === 'Kritis'
                      ? '#B91C1C'
                      : data.aiAnalysis.rekomendasi_prioritas === 'Sedang'
                      ? '#92400E'
                      : '#15803D',
                }}
              >
                Prioritas: {data.aiAnalysis.rekomendasi_prioritas} ({Math.round((data.aiAnalysis.skor_keyakinan || 0.88) * 100)}%)
              </span>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#1E293B', lineHeight: 1.45 }}>
              {data.aiAnalysis.alasan_ringkas}
            </p>
            <div style={{ fontSize: '12.5px', color: '#065F46', fontWeight: 700 }}>
              💡 Rekomendasi: {data.aiAnalysis.rekomendasi_tindakan}
            </div>
          </div>
        )}

        {/* Ringkasan Detail Laporan */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Lokasi Ruangan:</span>
            <span style={{ color: '#0F172A', fontWeight: 700, textAlign: 'right' }}>{lokasi}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Fasilitas:</span>
            <span style={{ color: '#0F172A', fontWeight: 700, textAlign: 'right' }}>{fasilitas}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Status Awal:</span>
            <span
              style={{
                color: isUrgent ? '#DC2626' : '#0F6B54',
                fontWeight: 800,
                textAlign: 'right',
              }}
            >
              {status}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Waktu Submit:</span>
            <span style={{ color: '#0F172A', fontWeight: 700, textAlign: 'right' }}>{formattedDate}</span>
          </div>
        </div>

        {/* Tombol Aksi Sejajar & Responsif */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePantauTiket}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '11px',
              border: 'none',
              backgroundColor: '#0F6B54',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(15, 107, 84, 0.22)',
            }}
          >
            Pantau Linimasa Status Tiket →
          </button>

          <button
            type="button"
            onClick={handleLaporkanLain}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '11px',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Laporkan Fasilitas Lain
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessScreen;