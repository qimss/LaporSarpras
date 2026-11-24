import React, { useState, useRef, useEffect } from 'react';

interface ReportFormProps {
  onSuccess: (reportData: any) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const DAFTAR_LOKASI_RUANGAN = [
  'Gedung F6 L1 - F6.101 (Ruang Kuliah)',
  'Gedung F6 L1 - F6.102 (Ruang Kuliah)',
  'Gedung F6 L2 - F6.201 (Ruang Kuliah)',
  'Gedung F6 L2 - F6.204 (Lab Komputer & Multimedia)',
  'Gedung F6 L3 - F6.301 (Ruang Sidang Teknik)',
  'Gedung F6 L3 - F6.305 (Studio Gambar Arsitektur)',
];

const DAFTAR_RISIKO_DARURAT = [
  { id: 'listrik', label: '⚡ Korsleting / Percikan Listrik', skor: 95 },
  { id: 'kebakaran', label: '🔥 Potensi Kebakaran / Asap Tebal', skor: 100 },
  { id: 'air', label: '💧 Kebocoran Pipa / Banjir Ruangan', skor: 85 },
  { id: 'struktur', label: '🧱 Plafon / Kaca / Struktur Hampir Roboh', skor: 90 },
];

export const ReportForm: React.FC<ReportFormProps> = ({ onSuccess, showToast }) => {
  const [kodeLokasi, setKodeLokasi] = useState<string>('');
  const [namaFasilitas, setNamaFasilitas] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [selectedRisiko, setSelectedRisiko] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localPopup, setLocalPopup] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urgentSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localPopup) return;
    const timer = setTimeout(() => setLocalPopup(null), 5000);
    return () => clearTimeout(timer);
  }, [localPopup]);

  useEffect(() => {
    if (isUrgent && urgentSectionRef.current) {
      const timer = setTimeout(() => {
        urgentSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [isUrgent]);

  const notify = (msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    if (showToast) {
      showToast(msg, type);
    } else {
      setLocalPopup({ msg, type: type === 'warning' ? 'error' : type });
    }
  };

  const validateMeaningfulText = (text: string, fieldName: string, minLen: number, minLetters: number): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return `${fieldName} wajib diisi.`;
    if (trimmed.length < minLen) return `${fieldName} minimal ${minLen} karakter.`;

    if (/^[0-9\s.,-]+$/.test(trimmed)) {
      return `${fieldName} tidak boleh hanya angka.`;
    }
    if (/^[^a-zA-Z0-9]+$/.test(trimmed)) {
      return `${fieldName} tidak boleh hanya simbol.`;
    }

    const letterCount = (trimmed.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
    if (letterCount < minLetters) {
      return `${fieldName} minimal harus mengandung ${minLetters} huruf yang jelas.`;
    }
    if (/(.)\1{4,}/i.test(trimmed)) {
      return `${fieldName} mengandung pengulangan karakter tidak wajar.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notify('Format foto harus JPG, PNG, atau WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Ukuran foto maksimal 5 MB.', 'error');
      return;
    }

    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalPopup(null);

    if (!kodeLokasi) {
      notify('Silakan pilih Lokasi Ruangan terlebih dahulu.', 'error');
      return;
    }

    const fasilitasErr = validateMeaningfulText(namaFasilitas, 'Jenis Fasilitas', 2, 2);
    if (fasilitasErr) {
      notify(fasilitasErr, 'error');
      return;
    }

    const deskripsiErr = validateMeaningfulText(deskripsi, 'Deskripsi Kerusakan', 10, 8);
    if (deskripsiErr) {
      notify(deskripsiErr, 'error');
      return;
    }

    if (isUrgent && !foto) {
      notify('Foto bukti fisik wajib dilampirkan untuk Kondisi Mendesak.', 'error');
      return;
    }

    if (isUrgent && !selectedRisiko) {
      notify('Pilih salah satu Jenis Risiko Bahaya untuk Kondisi Mendesak.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('kode_lokasi', kodeLokasi);
      formData.append('nama_fasilitas', namaFasilitas.trim());
      formData.append('deskripsi_kerusakan', deskripsi.trim());
      if (foto) {
        formData.append('foto_bukti', foto);
      }

      if (isUrgent) {
        const risikoObj = DAFTAR_RISIKO_DARURAT.find((r) => r.id === selectedRisiko);
        const labelBahaya = risikoObj ? risikoObj.label : 'Kondisi Mendesak';
        formData.append('is_urgent', 'on');
        formData.append('is_urgent_claimed', 'true');
        formData.append('jenis_bahaya', labelBahaya);
        formData.append('durasi_masalah', labelBahaya);
        formData.append('skor_risiko', String(risikoObj ? risikoObj.skor : 90));
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify(result.message || 'Gagal mengirim laporan.', 'error');
        return;
      }

      notify('Laporan berhasil dikirim!', 'success');
      setTimeout(() => {
        onSuccess(result.report);
      }, 500);
    } catch {
      notify('Gagal terhubung ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '18px 16px 40px' }}>
      {localPopup && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: 'max-content',
            minWidth: '300px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '15px 22px',
            borderRadius: '14px',
            backgroundColor: localPopup.type === 'error' ? '#DC2626' : '#0F6B54',
            color: '#FFFFFF',
            border: localPopup.type === 'error' ? '2px solid #991B1B' : '2px solid #064E3B',
            boxShadow: '0 18px 38px -8px rgba(15, 23, 42, 0.45)',
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <span>
            {localPopup.type === 'error' ? '⚠️' : '✅'} {localPopup.msg}
          </span>
          <button
            type="button"
            onClick={() => setLocalPopup(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '4px 9px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 6px 24px -4px rgba(15, 23, 42, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div>
          <label
            htmlFor="kode_lokasi"
            style={{
              display: 'block',
              fontSize: '15px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '8px',
            }}
          >
            Lokasi Ruangan / Titik Fasilitas <b style={{ color: '#DC2626' }}>*</b>
          </label>
          <select
            id="kode_lokasi"
            value={kodeLokasi}
            onChange={(e) => setKodeLokasi(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              fontWeight: 500,
              color: kodeLokasi ? '#0F172A' : '#475569',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #94A3B8',
              borderRadius: '11px',
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- Pilih Lokasi Ruangan --</option>
            {DAFTAR_LOKASI_RUANGAN.map((ruang) => (
              <option key={ruang} value={ruang}>
                {ruang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label
              htmlFor="nama_fasilitas"
              style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: 0 }}
            >
              Jenis Fasilitas <b style={{ color: '#DC2626' }}>*</b>
            </label>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              {namaFasilitas.length}/40 karakter
            </span>
          </div>
          <input
            id="nama_fasilitas"
            type="text"
            autoComplete="off"
            maxLength={40}
            value={namaFasilitas}
            onChange={(e) => setNamaFasilitas(e.target.value)}
            placeholder="Ketik jenis fasilitas (contoh: AC, Proyektor, Kursi, Stop Kontak)"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #94A3B8',
              borderRadius: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="deskripsi_kerusakan"
            style={{
              display: 'block',
              fontSize: '15px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '8px',
            }}
          >
            Deskripsi Kerusakan <b style={{ color: '#DC2626' }}>*</b>
          </label>
          <textarea
            id="deskripsi_kerusakan"
            rows={4}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Contoh: AC meneteskan air ke meja mahasiswa dan hembusan angin tidak dingin sejak kuliah pagi..."
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              lineHeight: 1.55,
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #94A3B8',
              borderRadius: '11px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.45 }}>
            Jelaskan kerusakan secara spesifik (minimal 10 huruf, tidak boleh hanya angka atau simbol).
          </p>
        </div>

        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '8px',
            }}
          >
            Foto Bukti Fisik{' '}
            {isUrgent ? (
              <b style={{ color: '#DC2626', fontSize: '13.5px' }}>
                * (Wajib untuk Kondisi Mendesak)
              </b>
            ) : (
              <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#475569' }}>
                (Opsional, maks 5 MB)
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isUrgent ? '2px dashed #DC2626' : '2px dashed #0F6B54',
              backgroundColor: isUrgent ? '#FEF2F2' : '#F0FDF4',
              borderRadius: '13px',
              padding: '18px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            {fotoPreview ? (
              <div>
                <img
                  src={fotoPreview}
                  alt="Pratinjau bukti"
                  style={{
                    maxHeight: '160px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    marginBottom: '8px',
                  }}
                />
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: isUrgent ? '#B91C1C' : '#065F46',
                  }}
                >
                  {foto?.name} (Klik untuk ganti foto)
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '26px', marginBottom: '4px' }}>📷</div>
                <div
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 700,
                    color: isUrgent ? '#B91C1C' : '#065F46',
                  }}
                >
                  {isUrgent
                    ? 'Wajib unggah foto bukti kondisi mendesak / berbahaya'
                    : 'Pilih foto atau ambil gambar dari kamera'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
                  Format JPG, PNG, WEBP • Maks 5 MB
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          ref={urgentSectionRef}
          style={{
            scrollMarginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Panel Kondisi Mendesak Simpel */}
          <div
            style={{
              border: isUrgent ? '2px solid #DC2626' : '1.5px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                fontSize: '14.5px',
                fontWeight: 700,
                color: '#B91C1C',
                marginBottom: 0,
              }}
            >
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsUrgent(checked);
                  if (!checked) setSelectedRisiko('');
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#DC2626',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span>⚠️ Tandai sebagai Kondisi Mendesak / Berbahaya (SLA Cepat 1–2 Jam)</span>
            </label>

            {isUrgent && (
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '14px',
                  borderTop: '1px solid #FECACA',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#7F1D1D',
                    marginBottom: '10px',
                  }}
                >
                  Pilih Jenis Risiko Bahaya <b style={{ color: '#DC2626' }}>*</b>:
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {DAFTAR_RISIKO_DARURAT.map((item) => {
                    const aktif = selectedRisiko === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedRisiko(item.id)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '11px',
                          border: aktif ? '2px solid #991B1B' : '1.5px solid #FCA5A5',
                          backgroundColor: aktif ? '#DC2626' : '#FFFFFF',
                          color: aktif ? '#FFFFFF' : '#7F1D1D',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: submitting ? '#64748B' : '#0F6B54',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(15, 107, 84, 0.25)',
            }}
          >
            {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan Kerusakan →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;