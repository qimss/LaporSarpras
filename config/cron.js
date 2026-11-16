import cron from 'node-cron';
import { processDailyBatch } from '../services/aiService.js';

export const initCronJobs = () => {
  // Jadwal otomatis setiap hari pukul 03.00 Pagi (FR-06 & Bab 1.2 Dokumen)
  cron.schedule('0 3 * * *', async () => {
    console.log('⏰ [CRON 03.00 PAGI] Menjalankan batch clustering AI sarpras harian...');
    try {
      await processDailyBatch();
    } catch (error) {
      console.error('❌ Kesalahan saat cron job 03.00 pagi:', error);
    }
  });

  console.log('⏰ Task Scheduler cron job pukul 03.00 pagi telah diaktifkan.');
};

export default initCronJobs;
