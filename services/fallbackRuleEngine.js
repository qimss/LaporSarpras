// ============================================================
// LOCAL FALLBACK RULE ENGINE (BAB 6.1 & 6.2 DOKUMEN)
// ============================================================

// Kata kunci bahaya darurat / keselamatan jiwa (Prioritas Tinggi)
const CRITICAL_KEYWORDS = [
  'meletup', 'api', 'terbakar', 'gosong', 'hangus', 'nyetrum', 'sengatan',
  'konslet', 'korslet', 'kabel terbuka', 'plafon jebol', 'plafon runtuh',
  'pipa pecah', 'banjir', 'asap', 'sparks', 'exposed wire'
];

// Kata kunci gangguan kenyamanan kuliah (Prioritas Sedang)
const MEDIUM_KEYWORDS = [
  'panas', 'gerah', 'pengap', 'bocor', 'menetes', 'netes', 'tidak dingin',
  'mati sendiri', 'buram', 'kuning', 'layar macet', 'mati lampu', 'air mati',
  'mampet', 'tersumbat', 'speaker dengung', 'mic mati', 'audio'
];

export const analyzeWithRuleEngine = (nama_fasilitas, deskripsi) => {
  const combinedText = `${nama_fasilitas || ''} ${deskripsi || ''}`.toLowerCase();
  
  let prioritas = 'Rendah';
  let matchedKeywords = [];
  let alasan = 'Masalah fasilitas minor yang tidak mengganggu kegiatan belajar secara langsung.';
  let tindakan = 'Jadwalkan pemeliharaan berkala sarpras.';

  // Cek kasus kritis
  for (const kw of CRITICAL_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
      prioritas = 'Tinggi';
    }
  }

  if (prioritas === 'Tinggi') {
    alasan = 'Terdeteksi potensi bahaya keselamatan fisik atau kerusakan fatal pada fasilitas kampus.';
    tindakan = 'Segera lakukan isolasi area/fasilitas dan tugaskan teknisi tanggap darurat (SLA 1-2 jam).';
    return {
      prioritas,
      skor_keyakinan: 0.95,
      kata_kunci_utama: matchedKeywords,
      alasan_ringkas: alasan,
      rekomendasi_tindakan: tindakan
    };
  }

  // Cek kasus sedang
  for (const kw of MEDIUM_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
      prioritas = 'Sedang';
    }
  }

  if (prioritas === 'Sedang') {
    alasan = 'Gangguan fasilitas menurunkan kenyamanan belajar mengajar secara signifikan.';
    tindakan = 'Jadwalkan perbaikan oleh teknisi terkait dalam batas waktu operasional (SLA <= 3 hari).';
  } else {
    matchedKeywords.push('minor');
  }

  return {
    prioritas,
    skor_keyakinan: 0.88,
    kata_kunci_utama: matchedKeywords,
    alasan_ringkas: alasan,
    rekomendasi_tindakan: tindakan
  };
};

export default {
  analyzeWithRuleEngine,
};
