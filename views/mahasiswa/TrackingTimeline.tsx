import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface TrackingTimelineProps {
  initialTicket?: string;
  onBack?: () => void;
}

export function TrackingTimeline({ initialTicket = '', onBack }: TrackingTimelineProps) {
  const [ticketInput, setTicketInput] = useState(initialTicket);
  const [report, setReport] = useState<Report | any>(null);
  const [stepIndex, setStepIndex] = useState(1);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchTracking(ticket: string) {
    const cleanTicket = ticket.replace(/^#/, '').trim().toUpperCase();
    if (!cleanTicket) {
      setError('Ketik nomor tiket terlebih dahulu (contoh: TKT-20261124-0011).');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.getTracking(cleanTicket);
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
      setTicketInput(initialTicket);
      fetchTracking(initialTicket);
    }
  }, [initialTicket]);

  const steps = [
    { title: 'Terkirim', desc: 'Laporan Masuk' },
    { title: 'Diterima', desc: 'Terverifikasi' },
    { title: 'Diproses', desc: 'Teknisi Bekerja' },
    { title: 'Selesai', desc: 'Tuntas' },
  ];

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'Selesai') {
      return { backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
    }
    if (status === 'Diproses') {
      return { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };
    }
    if (status === 'Dugaan Mendesak') {
      return { backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
    }
    return { backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' };
  };

  const parentTicket = report?.ParentReport || report?.parentReport;

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '16px 16px 44px' }}>
      {/* Header & Tombol Kembali */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ← Kembali
          </button>
        ) : (
          <div style={{ width: '76px' }} />
        )}

        <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>
          Pelacakan Status Pengaduan
        </h1>

        <div style={{ width: '76px' }} />
      </div>

      {/* Input Pencarian Tiket */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTracking(ticketInput);
          }}
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Ketik nomor tiket: TKT-20261124-0011"
            style={{
              flex: '1 1 220px',
              height: '46px',
              padding: '0 14px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #94A3B8',
              borderRadius: '10px',
              fontSize: '15.5px',
              fontWeight: 700,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              color: '#0F172A',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              height: '46px',
              padding: '0 22px',
              backgroundColor: loading ? '#64748B' : '#0F6B54',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Mencari…' : 'Cek Status'}
          </button>
        </form>
      </div>

      {/* Alert Error Kontras Tinggi */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
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

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Card Ringkasan Tiket */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <strong style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  {report.nama_fasilitas}
                </strong>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>
                  #{report.ticket_number} • {report.kode_lokasi}
                </p>
              </div>

              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800,
                  ...getStatusBadgeStyle(report.status),
                }}
              >
                {report.status}
              </span>
            </div>

            {report.deskripsi_kerusakan && (
              <p
                style={{
                  margin: '14px 0 0',
                  paddingTop: '12px',
                  borderTop: '1px solid #E2E8F0',
                  fontSize: '14.5px',
                  color: '#1E293B',
                  lineHeight: 1.55,
                }}
              >
                {report.deskripsi_kerusakan}
              </p>
            )}

            {/* Banner Sinkronisasi Kluster AI jika terhubung dengan Induk */}
            {parentTicket && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  fontSize: '14px',
                  color: '#065F46',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontSize: '18px' }}>🔗</span>
                <span>
                  Laporan Anda digabungkan dengan tiket induk <strong>#{parentTicket.ticket_number}</strong> untuk penanganan terpadu. Status pengerjaan otomatis tersinkronisasi.
                </span>
              </div>
            )}

            {/* Panel Hasil Fiksasi Analisis AI */}
            {(report.aiAnalysis || report.AIAnalysisResult) && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🤖</span>
                    <strong style={{ fontSize: '12.5px', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hasil Analisis Cerdas AI
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor:
                        (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Tinggi' ||
                        (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Kritis'
                          ? '#FEE2E2'
                          : (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Sedang'
                          ? '#FEF3C7'
                          : '#DCFCE7',
                      color:
                        (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Tinggi' ||
                        (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Kritis'
                          ? '#B91C1C'
                          : (report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas === 'Sedang'
                          ? '#92400E'
                          : '#15803D',
                    }}
                  >
                    Prioritas {(report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_prioritas} ({Math.round(((report.aiAnalysis || report.AIAnalysisResult)?.skor_keyakinan || 0.88) * 100)}%)
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#1E293B', lineHeight: 1.5 }}>
                  {(report.aiAnalysis || report.AIAnalysisResult)?.alasan_ringkas}
                </p>
                <div style={{ fontSize: '12.5px', color: '#15803D', fontWeight: 700 }}>
                  💡 Rekomendasi: {(report.aiAnalysis || report.AIAnalysisResult)?.rekomendasi_tindakan}
                </div>
              </div>
            )}
          </div>

          {/* 4-Step Stepper Progress Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
            }}
          >
            <h2
              style={{
                margin: '0 0 18px',
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Tahapan Progres Penanganan
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              {steps.map((st, idx) => {
                const stepNum = idx + 1;
                const isPassed = stepIndex >= stepNum;
                const isCurrent = stepIndex === stepNum;

                return (
                  <div key={st.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                        marginBottom: '8px',
                        backgroundColor: isCurrent ? '#0F6B54' : isPassed ? '#DCFCE7' : '#F1F5F9',
                        color: isCurrent ? '#FFFFFF' : isPassed ? '#166534' : '#475569',
                        border: isCurrent
                          ? '2px solid #064E3B'
                          : isPassed
                          ? '1.5px solid #86EFAC'
                          : '1.5px solid #CBD5E1',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(15, 107, 84, 0.18)' : 'none',
                      }}
                    >
                      {isPassed && !isCurrent ? '✓' : stepNum}
                    </div>
                    <strong
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        display: 'block',
                        color: isCurrent ? '#0F6B54' : isPassed ? '#0F172A' : '#475569',
                      }}
                    >
                      {st.title}
                    </strong>
                    <small style={{ fontSize: '12px', fontWeight: 500, color: '#475569', marginTop: '2px' }}>
                      {st.desc}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linimasa Catatan Petugas */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Linimasa Audit & Catatan Petugas
            </h2>

            {statusLogs.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                Belum ada catatan pembaruan status.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  paddingLeft: '18px',
                  borderLeft: '2.5px solid #CBD5E1',
                  marginLeft: '6px',
                }}
              >
                {statusLogs.map((log, i) => (
                  <div key={log.log_id || i} style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '-25px',
                        top: '4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#0F6B54',
                        border: '2px solid #FFFFFF',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        {log.status_sesudah || log.status}
                      </span>
                      <time style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                      {log.catatan_petugas || log.keterangan}
                    </p>
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

export default TrackingTimeline;