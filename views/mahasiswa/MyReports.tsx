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

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '16px 16px 44px' }}>
      {/* Header Judul & Tombol Tambah */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
            Daftar Pengaduan Saya
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
            Riwayat pengaduan fasilitas yang telah Anda laporkan.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewReport}
          style={{
            padding: '11px 18px',
            backgroundColor: '#0F6B54',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '11px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(15, 107, 84, 0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          + Buat Laporan Baru
        </button>
      </div>

      {/* Alert Error Kontras Tinggi */}
      {error && (
        <div
          style={{
            padding: '14px 16px',
            marginBottom: '18px',
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

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#334155',
          }}
        >
          Memuat laporan Anda…
        </div>
      ) : reports.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
          }}
        >
          <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>📋</span>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            Belum Ada Pengaduan
          </h2>
          <p style={{ margin: '0 auto 20px', maxWidth: '360px', fontSize: '14.5px', color: '#475569', lineHeight: 1.5 }}>
            Anda belum pernah mengirim laporan kerusakan fasilitas kampus.
          </p>
          <button
            type="button"
            onClick={onNewReport}
            style={{
              padding: '12px 22px',
              backgroundColor: '#0F6B54',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '11px',
              cursor: 'pointer',
            }}
          >
            Mulai Melapor Sekarang
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((rep) => {
            const badgeStyle = getStatusBadgeStyle(rep.status);
            return (
              <div
                key={rep.report_id}
                onClick={() => onSelectTicket(rep.ticket_number)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#0F6B54',
                        display: 'block',
                        marginBottom: '3px',
                      }}
                    >
                      #{rep.ticket_number}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                      {rep.nama_fasilitas}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: '999px',
                      ...badgeStyle,
                    }}
                  >
                    {rep.status}
                  </span>
                </div>

                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: '14.5px',
                    color: '#334155',
                    lineHeight: 1.55,
                  }}
                >
                  {rep.deskripsi_kerusakan}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#475569',
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: '10px',
                  }}
                >
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyReports;