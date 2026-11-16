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

// 1. INFERENSI MODEL MACHINE LEARNING TERLATIH LOKAL (Python)
export const predictWithLocalML = (text) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'predict_severity.py');
    
    execFile('python', [scriptPath, text], (error, stdout, stderr) => {
      if (error || !stdout) {
        console.warn('⚠️ Fallback ke Rule Engine Lokal:', stderr || error?.message);
        return resolve(null);
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        resolve(null);
      }
    });
  });
};

// 2. ANALISIS DENGAN GOOGLE GEMINI API (LLM)
export const analyzeWithGemini = async (kode_lokasi, nama_fasilitas, deskripsi) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  // Jika model kustom tidak valid di publik, gunakan model flash aktif
  if (modelName.includes('hydrogen') || modelName.includes('tunedModels')) {
    modelName = 'gemini-1.5-flash';
  }

  if (!apiKey || apiKey.startsWith('AIzaSy_masukkan')) {
    console.log('ℹ️ Menggunakan Engine ML Terlatih Lokal (API Key belum diisi).');
    return null;
  }

  const promptText = `
${SYSTEM_PROMPT}

CONTOH REFERENSI:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}

ANALISIS LAPORAN BERIKUT:
Lokasi: ${kode_lokasi}
Fasilitas: ${nama_fasilitas}
Deskripsi Masalah: ${deskripsi}

Balas HANYA dengan JSON valid sesuai skema yang diminta:
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      },
      { timeout: 7000 }
    );

    const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      return JSON.parse(candidate);
    }
  } catch (error) {
    console.warn('⚠️ Gemini API tidak merespons, beralih ke Model Terlatih Lokal:', error.message);
  }
  return null;
};

// 3. HYBRID ANALYZER: PENGGABUNGAN GEMINI + MODEL ML TERLATIH + FALLBACK
export const analyzeReportPriority = async (kode_lokasi, nama_fasilitas, deskripsi) => {
  // Coba Gemini API terlebih dahulu
  const geminiResult = await analyzeWithGemini(kode_lokasi, nama_fasilitas, deskripsi);
  if (geminiResult && geminiResult.prioritas) {
    return {
      source: 'Google Gemini LLM',
      ...geminiResult,
    };
  }

  // Jika Gemini offline/kuota habis, gunakan Model Machine Learning Terlatih lokal
  const combinedText = `${nama_fasilitas} ${deskripsi}`;
  const mlResult = await predictWithLocalML(combinedText);
  if (mlResult && mlResult.prioritas) {
    const ruleFallback = analyzeWithRuleEngine(nama_fasilitas, deskripsi);
    return {
      source: 'Trained Machine Learning Model (Local)',
      prioritas: mlResult.prioritas,
      skor_keyakinan: mlResult.skor_keyakinan || 0.90,
      kata_kunci_utama: ruleFallback.kata_kunci_utama,
      alasan_ringkas: ruleFallback.alasan_ringkas,
      rekomendasi_tindakan: ruleFallback.rekomendasi_tindakan,
    };
  }

  // Fallback terakhir: Rule Engine Matriks Kata Kunci Bab 6.1
  const ruleResult = analyzeWithRuleEngine(nama_fasilitas, deskripsi);
  return {
    source: 'Fallback Rule Engine',
    ...ruleResult,
  };
};

// 4. LOGIKA CLUSTERING LAPORAN SERUPA (PENGELOMPOKAN LAPORAN DUPLIKAT)
export const groupSimilarReports = (reports) => {
  const clusters = [];
  const processedIds = new Set();

  for (let i = 0; i < reports.length; i++) {
    const rep = reports[i];
    if (processedIds.has(rep.report_id)) continue;

    // Buat kelompok baru untuk ruangan & fasilitas yang sama
    const cluster = {
      parent: rep,
      children: [],
    };
    processedIds.add(rep.report_id);

    // Cari laporan lain di ruangan yang sama dengan fasilitas identik/mirip
    for (let j = i + 1; j < reports.length; j++) {
      const other = reports[j];
      if (processedIds.has(other.report_id)) continue;

      const sameLocation = rep.kode_lokasi.trim().toLowerCase() === other.kode_lokasi.trim().toLowerCase();
      const sameFacility = rep.nama_fasilitas.trim().toLowerCase() === other.nama_fasilitas.trim().toLowerCase();

      if (sameLocation && sameFacility) {
        cluster.children.push(other);
        processedIds.add(other.report_id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

// 5. TASK SCHEDULER BATCH (CRON 03.00 PAGI ATAU MANUAL TRIGGER ADMIN)
export const processDailyBatch = async () => {
  console.log('🤖 Menjalankan Modul Batch AI Sarpras...');

  // Ambil semua laporan yang berstatus 'Menunggu Analisis AI'
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

      // Hubungkan laporan anak ke Parent Report
      for (const child of children) {
        await child.update(
          {
            parent_report_id: parent.report_id,
            status: 'Diterima',
          },
          { transaction }
        );
      }

      // Analisis prioritas untuk Laporan Induk
      const aiResult = await analyzeReportPriority(
        parent.kode_lokasi,
        parent.nama_fasilitas,
        parent.deskripsi_kerusakan
      );

      // Simpan hasil analisis AI ke tabel ai_analysis_results
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

      // Perbarui status Laporan Induk menjadi 'Diterima'
      await parent.update(
        {
          status: 'Diterima',
        },
        { transaction }
      );

      // Catat log status
      await ReportStatusLog.create(
        {
          report_id: parent.report_id,
          status_sebelum: 'Menunggu Analisis AI',
          status_sesudah: 'Diterima',
          catatan_petugas: `Dianalisis otomatis oleh AI (${aiResult.source}). Ditetapkan prioritas ${aiResult.prioritas}. Menampung ${totalCount} laporan serupa.`,
          updated_by_user_id: null, // Oleh Sistem AI
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
