import { FormEvent, useRef, useState } from 'react';
import { api } from '../services/api';
import { Report } from '../types';

interface ReportFormProps {
  onSuccess: (report: Report) => void;
}

export function ReportForm({ onSuccess }: ReportFormProps) {
  const [urgent, setUrgent] = useState(false);
  const [location, setLocation] = useState('Gedung F6 L2 R.204');
  const [facility, setFacility] = useState('Pendingin Ruangan (AC)');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [risk, setRisk] = useState('Bahaya listrik');
  const [duration, setDuration] = useState('< 1 jam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLocationChange(val: string) {
    // Sanitasi karakter berbahaya (anti-XSS)
    const sanitized = val.replace(/[<>"'/`]/g, '');
    if (sanitized.length <= 35) {
      setLocation(sanitized);
    }
  }

  function handleFileChange(selectedFile: File | undefined) {
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('Ukuran file melebihi batas 5 MB!');
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!location.trim()) {
      setError('Lokasi ruangan / titik fasilitas wajib diisi.');
      return;
    }

    if (!description.trim() && !urgent) {
      setError('Deskripsi kerusakan fasilitas wajib diisi.');
      return;
    }

    if (urgent && !file) {
      setError('Foto bukti fisik wajib diunggah untuk pelaporan kondisi darurat.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('kode_lokasi', location.trim());
      formData.append('nama_fasilitas', facility);
      formData.append('deskripsi_kerusakan', description.trim() || `[Laporan Mendesak: ${risk}] Durasi: ${duration}`);
      formData.append('is_urgent_claimed', String(urgent));
      if (urgent) {
        formData.append('jenis_bahaya', risk);
        formData.append('durasi_masalah', duration);
      }
      if (file) {
        formData.append('foto', file);
      }

      const res = await api.createReport(formData);
      if (res.success && res.report) {
        onSuccess(res.report);
      } else {
        setError(res.message || 'Gagal mengirim laporan. Silakan coba kembali.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="report-content max-w-xl mx-auto py-4">
      {/* Universal QR Info Banner */}
      <div className="bg-[#EDF7F4] border border-[#DDEFEA] rounded-[14px] p-3.5 mb-5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📱</span>
          <div>
            <div className="text-[11px] font-bold text-[#0F6B5C] uppercase tracking-wider">Universal QR Code</div>
            <div className="text-xs font-semibold text-[#14201E]">Portal Pelaporan Fasilitas Kampus Terpadu</div>
          </div>
        </div>
        <span className="text-[11px] font-medium bg-white px-2 py-0.5 rounded-full border border-[#DDEFEA] text-[#0F6B5C]">
          1 QR Semua Ruangan
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Lokasi dengan batasan 35 huruf dan security anti-XSS */}
        <label className="field block">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-[#2B3B38]">Lokasi Ruangan / Titik Fasilitas</span>
            <small className={`font-mono text-xs ${location.length >= 35 ? 'text-amber-600 font-bold' : 'text-[#8A9692]'}`}>
              {location.length}/35 huruf
            </small>
          </div>
          <div className="input-count relative">
            <input
              value={location}
              maxLength={35}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="Contoh: Gedung F6 L2 R.204"
              className="w-full h-[42px] px-3.5 bg-white border border-[#DCE1DC] rounded-[10px] text-sm text-[#14201E] placeholder-[#8A9692] focus:outline-none focus:border-[#0F6B5C] focus:ring-1 focus:ring-[#0F6B5C]"
            />
          </div>
          <small className="text-[#8A9692] text-[11px] mt-1 block">
            Maksimal 35 karakter. Karakter tag berbahaya dibersihkan secara otomatis (anti-XSS).
          </small>
        </label>

        {/* Jenis Fasilitas */}
        <label className="field block">
          <span className="text-xs font-semibold text-[#2B3B38] mb-1 block">Jenis Fasilitas</span>
          <select
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            className="w-full h-[42px] px-3 bg-white border border-[#DCE1DC] rounded-[10px] text-sm text-[#14201E] focus:outline-none focus:border-[#0F6B5C]"
          >
            <option>Pendingin Ruangan (AC)</option>
            <option>Kelistrikan / Stopkontak</option>
            <option>Kursi Mahasiswa / Meja Kuliah</option>
            <option>Toilet / Sanitasi</option>
            <option>Proyektor / LCD</option>
            <option>Pintu / Jendela / Plafon</option>
            <option>Fasilitas Lainnya</option>
          </select>
        </label>

        {/* Mode Mendesak Triage */}
        {urgent ? (
          <section className="urgent-panel bg-[#F9E1DE] border border-[#A8261D]/30 rounded-[14px] p-4 space-y-3">
            <button
              type="button"
              className="urgent-title flex items-center gap-2 text-[#A8261D] font-bold text-sm w-full text-left"
              onClick={() => setUrgent(false)}
            >
              <span className="checked-box bg-[#A8261D] text-white w-5 h-5 rounded flex items-center justify-center text-xs">✓</span>
              <span>⚠️ Mode Kondisi Mendesak / Berbahaya Aktif (Klik untuk matikan)</span>
            </button>

            <div>
              <strong className="field-label text-xs text-[#2B3B38] block mb-1.5">Jenis risiko (pilih yang sesuai):</strong>
              <div className="chips flex gap-2">
                {['Bahaya listrik', 'Banjir air', 'Risiko fisik'].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      risk === item ? 'bg-[#A8261D] text-white border-[#A8261D]' : 'bg-white text-[#2B3B38] border-[#DCE1DC]'
                    }`}
                    onClick={() => setRisk(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="field block">
              <span className="text-xs font-semibold text-[#2B3B38] mb-1 block">Sudah berlangsung berapa lama?</span>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-[38px] px-3 bg-white border border-[#DCE1DC] rounded-[8px] text-xs text-[#14201E]"
              >
                <option value="< 1 jam">Baru saja terjadi (&lt; 1 jam)</option>
                <option value="1-24 jam">1 s.d. 24 jam</option>
                <option value="> 1 hari">Lebih dari 1 hari</option>
              </select>
            </label>

            <p className="urgent-note text-xs text-[#A8261D] font-medium">
              🚨 Laporan bahaya yang terverifikasi ditangani tim tanggap darurat dengan SLA respons 1–2 jam.
            </p>
          </section>
        ) : (
          <label className="field block">
            <span className="text-xs font-semibold text-[#2B3B38] mb-1 block">Deskripsi Kerusakan</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: AC meneteskan air ke meja mahasiswa dan hembusan angin tidak dingin sejak kuliah pagi..."
              className="w-full h-[90px] p-3 bg-white border border-[#DCE1DC] rounded-[10px] text-sm text-[#14201E] placeholder-[#8A9692] focus:outline-none focus:border-[#0F6B5C]"
            />
          </label>
        )}

        {/* Unggah Foto Bukti */}
        <div className="field block">
          <span className="text-xs font-semibold text-[#2B3B38] mb-1 block">
            Foto Bukti Fisik {urgent ? <span className="text-red-600 font-bold">(Wajib)</span> : <span className="text-gray-400 font-normal">(Opsional, maks 5 MB)</span>}
          </span>
          <input
            ref={inputRef}
            className="file-input hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`dropzone w-full py-4 border-2 border-dashed rounded-[12px] flex flex-col items-center justify-center transition-colors ${
              urgent ? 'border-[#A8261D] bg-red-50/40' : 'border-[#DCE1DC] hover:border-[#0F6B5C] bg-white'
            }`}
            onClick={() => inputRef.current?.click()}
          >
            <span className="text-2xl mb-1">📸</span>
            <strong className="text-xs text-[#2B3B38]">
              {urgent && !fileName ? 'Foto bukti fisik wajib diunggah untuk triage darurat' : 'Pilih foto atau ambil gambar dari kamera'}
            </strong>
            <small className="text-[11px] text-[#8A9692]">Format JPG, PNG, WEBP • Maks 5 MB</small>
          </button>

          {fileName && (
            <div className="file-card mt-2 p-2.5 bg-white border border-[#DCE1DC] rounded-[10px] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-md border" />
                ) : (
                  <span className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-xs">🖼️</span>
                )}
                <div>
                  <strong className="text-xs text-[#14201E] block truncate max-w-[200px]">{fileName}</strong>
                  <small className="text-[10px] text-[#8A9692]">Siap diunggah</small>
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50"
                onClick={() => {
                  setFile(null);
                  setFileName('');
                  setPreviewUrl(null);
                }}
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Toggle Mode Mendesak jika belum aktif */}
        {!urgent && (
          <button
            type="button"
            className="urgent-toggle w-full p-3 border border-red-200 bg-red-50/50 hover:bg-red-50 rounded-[12px] flex items-center gap-2.5 text-left transition-colors"
            onClick={() => {
              setUrgent(true);
            }}
          >
            <span className="empty-box w-4 h-4 border-2 border-red-500 rounded flex-shrink-0" />
            <strong className="text-xs text-red-700">
              ⚠️ Tandai sebagai Kondisi Mendesak / Berbahaya (SLA Cepat 1–2 Jam)
            </strong>
          </button>
        )}

        {error && (
          <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Tombol Kirim */}
        <button
          type="submit"
          disabled={loading}
          className={`primary-button w-full h-[48px] rounded-[10px] font-semibold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all ${
            urgent ? 'bg-[#A8261D] hover:bg-[#8e1f18]' : 'bg-[#0F6B5C] hover:bg-[#0c574a]'
          } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span>Mengirim Laporan…</span>
          ) : (
            <>
              <span>{urgent ? 'Kirim Laporan Mendesak' : 'Kirim Laporan Kerusakan'}</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
