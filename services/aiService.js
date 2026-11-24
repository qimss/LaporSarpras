import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  sequelize,
  Report,
  AIAnalysisResult,
  ReportStatusLog,
} from '../models/index.js';
import { SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../config/aiPrompt.js';
import { analyzeWithRuleEngine } from './fallbackRuleEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_PRIORITIES = ['Rendah', 'Sedang', 'Tinggi'];

function normalizeAIOutput(raw = {}, fallbackData = {}, source = 'Fallback Rule Engine') {
  const rawPrio = String(raw.prioritas || fallbackData.prioritas || 'Sedang').trim().toLowerCase();
  let fixedPriority = 'Sedang';
  if (['rendah', 'low'].includes(rawPrio)) fixedPriority = 'Rendah';
  else if (['sedang', 'medium', 'normal'].includes(rawPrio)) fixedPriority = 'Sedang';
  else if (['tinggi', 'high', 'kritis', 'critical', 'darurat', 'emergency', 'urgent'].includes(rawPrio)) {
    fixedPriority = 'Tinggi';
  }

  if (!VALID_PRIORITIES.includes(fixedPriority)) {
    fixedPriority = 'Sedang';
  }

  let confidence = Number(raw.skor_keyakinan ?? fallbackData.skor_keyakinan ?? 0.85);
  if (Number.isNaN(confidence)) confidence = 0.85;
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.min(1, Math.max(0.1, Number(confidence.toFixed(2))));

  let keywords = raw.kata_kunci_utama ?? fallbackData.kata_kunci_utama ?? 'kerusakan fasilitas';
  if (Array.isArray(keywords)) {
    keywords = keywords.join(', ');
  }
  keywords = String(keywords).trim().slice(0, 250) || 'kerusakan fasilitas';

  const alasan =
    String(raw.alasan_ringkas || fallbackData.alasan_ringkas || 'Laporan kerusakan fasilitas memerlukan peninjauan teknis.').trim();

  const rekomendasi =
    String(raw.rekomendasi_tindakan || fallbackData.rekomendasi_tindakan || 'Jadwalkan inspeksi petugas sarana dan prasarana ke lokasi terkait.').trim();

  return {
    source,
    prioritas: fixedPriority,
    skor_keyakinan: confidence,
    kata_kunci_utama: keywords,
    alasan_ringkas: alasan,
    rekomendasi_tindakan: rekomendasi,
  };
}

export const predictWithLocalML = (text) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'predict_severity.py');

    execFile('python', [scriptPath, text], { timeout: 5000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        console.warn('⚠️ Fallback ke Rule Engine Lokal:', stderr || error?.message);
        return resolve(null);
      }
      try {
        const cleaned = stdout.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
        const result = JSON.parse(cleaned);
        resolve(result);
      } catch {
        resolve(null);
      }
    });
  });
};

export const analyzeWithGemini = async (kode_lokasi, nama_fasilitas, deskripsi) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (modelName === 'gemini-1.5-flash' || modelName === 'gemini-2.5-flash') {
    modelName = 'gemini-3.8-flash';
  }

  const isGoogleKey = apiKey && (apiKey.startsWith('AQ.') || apiKey.startsWith('AIzaSy'));

  if (!isGoogleKey || apiKey.startsWith('AIzaSy_masukkan')) {
    console.log('ℹ️ Menggunakan Engine ML Terlatih Lokal / Rule Engine (API Key Gemini belum diset valid).');
    return null;
  }

  const promptText = `
${SYSTEM_PROMPT}

CONTOH REFERENSI:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}

ATURAN WAJIB OUTPUT JSON:
- Nilai "prioritas" HANYA boleh salah satu dari: "Rendah", "Sedang", "Tinggi".
- Nilai "skor_keyakinan" berupa angka desimal antara 0.50 sampai 0.99.
- Semua field ("prioritas", "skor_keyakinan", "kata_kunci_utama", "alasan_ringkas", "rekomendasi_tindakan") wajib diisi dalam Bahasa Indonesia yang formal dan jelas.

ANALISIS LAPORAN BERIKUT:
Lokasi: ${kode_lokasi}
Fasilitas: ${nama_fasilitas}
Deskripsi Masalah: ${deskripsi}

Balas HANYA dengan JSON valid sesuai skema yang diminta:
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 3000,
      }
    );

    const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      const cleanJson = candidate.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleanJson);
    }
  } catch (error) {
    const errDetails = error.response?.data?.error?.message || error.message;
    if (error.response?.status === 403) {
      console.warn(`⚠️ Google Gemini Cloud 403 (Permission Denied: "${errDetails}").`);
    } else {
      console.warn('⚠️ Gemini API tidak merespons, beralih ke Model Terlatih Lokal:', errDetails);
    }
  }
  return null;
};

// 3. HYBRID ANALYZER: PENGGABUNGAN GEMINI + MODEL ML TERLATIH + FALLBACK TERKUNCI
export const analyzeReportPriority = async (kode_lokasi, nama_fasilitas, deskripsi) => {
  const ruleFallback = analyzeWithRuleEngine(nama_fasilitas, deskripsi);

  const lettersCount = `${nama_fasilitas} ${deskripsi}`.replace(/[^a-zA-Z]/g, '').length;
  if (lettersCount < 6) {
    return normalizeAIOutput(
      {
        prioritas: 'Rendah',
        skor_keyakinan: 0.65,
        kata_kunci_utama: 'perlu verifikasi manual',
        alasan_ringkas: 'Deskripsi laporan terlalu singkat atau minim informasi teks.',
        rekomendasi_tindakan: 'Admin Sarpras perlu menghubungi pelapor untuk konfirmasi detail kerusakan.',
      },
      ruleFallback,
      'Validation Guardrail'
    );
  }

  const geminiResult = await analyzeWithGemini(kode_lokasi, nama_fasilitas, deskripsi);
  if (geminiResult && geminiResult.prioritas) {
    return normalizeAIOutput(geminiResult, ruleFallback, 'Google Gemini LLM');
  }

  const combinedText = `${nama_fasilitas} ${deskripsi}`;
  const mlResult = await predictWithLocalML(combinedText);
  if (mlResult && mlResult.prioritas) {
    return normalizeAIOutput(
      {
        ...ruleFallback,
        prioritas: mlResult.prioritas,
        skor_keyakinan: mlResult.skor_keyakinan || 0.90,
      },
      ruleFallback,
      'Trained Machine Learning Model (Local)'
    );
  }

  return normalizeAIOutput(ruleFallback, ruleFallback, 'Fallback Rule Engine');
};

export const groupSimilarReports = (reports) => {
  const clusters = [];
  const processedIds = new Set();

  const normalizeFacility = (str) =>
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  for (let i = 0; i < reports.length; i++) {
    const rep = reports[i];
    if (processedIds.has(rep.report_id)) continue;

    const cluster = {
      parent: rep,
      children: [],
    };
    processedIds.add(rep.report_id);

    const repLoc = rep.kode_lokasi.trim().toLowerCase();
    const repFac = normalizeFacility(rep.nama_fasilitas);

    for (let j = i + 1; j < reports.length; j++) {
      const other = reports[j];
      if (processedIds.has(other.report_id)) continue;

      const otherLoc = other.kode_lokasi.trim().toLowerCase();
      const otherFac = normalizeFacility(other.nama_fasilitas);

      const sameLocation = repLoc === otherLoc;
      const sameFacility =
        repFac === otherFac ||
        (repFac.length >= 3 && otherFac.includes(repFac)) ||
        (otherFac.length >= 3 && repFac.includes(otherFac));

      if (sameLocation && sameFacility) {
        cluster.children.push(other);
        processedIds.add(other.report_id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

export const processDailyBatch = async () => {
  console.log('🤖 Menjalankan Modul Batch AI Sarpras...');

  const pendingReports = await Report.findAll({
    where: {
      status: 'Menunggu Analisis AI',
      parent_report_id: null,
    },
    order: [['created_at', 'ASC']],
  });

  if (pendingReports.length === 0) {
    console.log('ℹ️ Tidak ada laporan baru yang menunggu analisis AI.');
    return { count: 0, clusters: [] };
  }

  console.log(`📋 Memproses ${pendingReports.length} laporan masuk...`);
  const clusters = groupSimilarReports(pendingReports);
  const results = [];

  const transaction = await sequelize.transaction();
  try {
    for (const cluster of clusters) {
      const parent = cluster.parent;
      const children = cluster.children;
      const totalCount = 1 + children.length;

      for (const child of children) {
        await child.update(
          {
            parent_report_id: parent.report_id,
            status: 'Diterima',
          },
          { transaction }
        );
      }

      const aiResult = await analyzeReportPriority(
        parent.kode_lokasi,
        parent.nama_fasilitas,
        parent.deskripsi_kerusakan
      );

      await AIAnalysisResult.create(
        {
          report_id: parent.report_id,
          rekomendasi_prioritas: aiResult.prioritas,
          skor_keyakinan: aiResult.skor_keyakinan,
          kata_kunci_utama: aiResult.kata_kunci_utama,
          alasan_ringkas: aiResult.alasan_ringkas,
          rekomendasi_tindakan: aiResult.rekomendasi_tindakan,
          jumlah_laporan_serupa: totalCount,
        },
        { transaction }
      );

      await parent.update(
        {
          status: 'Diterima',
        },
        { transaction }
      );

      await ReportStatusLog.create(
        {
          report_id: parent.report_id,
          status_sebelum: 'Menunggu Analisis AI',
          status_sesudah: 'Diterima',
          catatan_petugas: `Dianalisis otomatis oleh AI (${aiResult.source}). Ditetapkan prioritas ${aiResult.prioritas}. Menampung ${totalCount} laporan serupa.`,
          updated_by_user_id: null,
        },
        { transaction }
      );

      results.push({
        parent_id: parent.report_id,
        ticket: parent.ticket_number,
        fasilitas: parent.nama_fasilitas,
        lokasi: parent.kode_lokasi,
        prioritas: aiResult.prioritas,
        jumlah_serupa: totalCount,
        engine: aiResult.source,
      });
    }

    await transaction.commit();
    console.log(`✅ Sukses memproses ${clusters.length} kluster laporan AI!`);
    return { count: clusters.length, results };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Terjadi kesalahan saat batch AI:', error);
    throw error;
  }
};

export default {
  predictWithLocalML,
  analyzeWithGemini,
  analyzeReportPriority,
  groupSimilarReports,
  processDailyBatch,
};