// ============================================================
// LOCAL INTELLIGENT RULE ENGINE (FIKSASI KLASIFIKASI AI SARPRAS)
// ============================================================

// 1. Kategori Risiko Tinggi / Kritis (SLA Tanggap Darurat: 1–2 Jam)
const CRITICAL_KEYWORDS = [
  'meletup', 'api', 'terbakar', 'gosong', 'hangus', 'nyetrum', 'sengatan',
  'konslet', 'korslet', 'kabel terbuka', 'kabel terkelupas', 'kabel putus',
  'plafon jebol', 'plafon runtuh', 'plafon roboh', 'ambruk', 'roboh',
  'pipa pecah', 'banjir', 'meluap deras', 'asap', 'asap tebal', 'sparks',
  'exposed wire', 'kaca pecah', 'kaca retak parah', 'jatuh menimpa',
  'bau kabel terbakar', 'bau gas', 'bahaya listrik', 'risiko fisik'
];

// 2. Kategori Gangguan Signifikan / Kenyamanan Belajar (SLA: <= 3 Hari)
const MEDIUM_KEYWORDS = [
  'panas', 'gerah', 'pengap', 'bocor', 'menetes', 'netes', 'tidak dingin',
  'kurang dingin', 'mati sendiri', 'buram', 'kuning', 'layar macet',
  'mati lampu', 'air mati', 'air tidak mengalir', 'mampet', 'tersumbat',
  'speaker dengung', 'mic mati', 'mikrofon', 'audio', 'sound system',
  'ac mati', 'proyektor mati', 'proyektor rusak', 'hdmi tidak connect',
  'rembes', 'kran patah', 'pintu macet', 'kunci rusak', 'terkunci dari dalam',
  'lampu mati', 'saklar rusak', 'wastafel mampet', 'kloset rusak'
];

// 3. Kategori Minor / Estetika (SLA: <= 7 Hari)
const LOW_KEYWORDS = [
  'kursi goyang', 'baut lepas', 'baut copot', 'cat terkelupas', 'meja lecet',
  'papan tulis kotor', 'gagang pintu longgar', 'gorden lepas', 'kusam',
  'noda dinding', 'stopkontak longgar', 'kursi patah sedikit', 'minor'
];

export const analyzeWithRuleEngine = (nama_fasilitas = '', deskripsi = '') => {
  const combinedText = `${nama_fasilitas} ${deskripsi}`.toLowerCase();

  let prioritas = 'Rendah';
  let matchedKeywords = [];
  let alasan = 'Masalah fasilitas minor estetika yang tidak mengganggu kegiatan belajar secara langsung.';
  let tindakan = 'Jadwalkan pemeliharaan berkala sarpras sesuai antrean reguler (SLA 7 hari).';
  let confidence = 0.86;

  // 1. Periksa kecocokan Kritis / Tinggi
  for (const kw of CRITICAL_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
      prioritas = 'Tinggi';
    }
  }

  if (prioritas === 'Tinggi') {
    confidence = Math.min(0.98, 0.90 + matchedKeywords.length * 0.02);
    alasan = `Terdeteksi indikasi bahaya keselamatan fisik atau kerusakan fatal pada fasilitas (${matchedKeywords.slice(0, 3).join(', ')}).`;
    tindakan = 'Segera lakukan isolasi area/fasilitas dan tugaskan teknisi tanggap darurat (SLA 1-2 Jam).';
    return {
      prioritas,
      skor_keyakinan: Number(confidence.toFixed(2)),
      kata_kunci_utama: matchedKeywords.length ? matchedKeywords : ['bahaya mendesak'],
      alasan_ringkas: alasan,
      rekomendasi_tindakan: tindakan,
    };
  }

  // 2. Periksa kecocokan Sedang
  for (const kw of MEDIUM_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
      prioritas = 'Sedang';
    }
  }

  if (prioritas === 'Sedang') {
    confidence = Math.min(0.95, 0.88 + matchedKeywords.length * 0.015);
    alasan = `Gangguan fasilitas menurunkan kenyamanan proses belajar mengajar secara signifikan (${matchedKeywords.slice(0, 3).join(', ')}).`;
    tindakan = 'Jadwalkan perbaikan oleh tim teknisi terkait dalam batas waktu operasional (SLA <= 3 hari).';
    return {
      prioritas,
      skor_keyakinan: Number(confidence.toFixed(2)),
      kata_kunci_utama: matchedKeywords,
      alasan_ringkas: alasan,
      rekomendasi_tindakan: tindakan,
    };
  }

  // 3. Prioritas Rendah
  for (const kw of LOW_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length === 0) {
    // Ambil kata benda fasilitas sebagai kata kunci
    const facWords = nama_fasilitas.trim().split(/\s+/).filter((w) => w.length > 2);
    matchedKeywords = facWords.length ? facWords : ['pemeliharaan umum'];
  }

  return {
    prioritas: 'Rendah',
    skor_keyakinan: 0.85,
    kata_kunci_utama: matchedKeywords,
    alasan_ringkas: alasan,
    rekomendasi_tindakan: tindakan,
  };
};

export default {
  analyzeWithRuleEngine,
};
