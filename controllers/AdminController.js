import {
  sequelize,
  Report,
  User,
  EmergencyVerification,
  AIAnalysisResult,
  ReportStatusLog,
} from '../models/index.js';
import { processDailyBatch } from '../services/aiService.js';

export class AdminController {
  // 1. Tampilkan Dashboard Utama Admin Sarpras (Desktop Viewport)
  static async dashboard(req, res) {
    try {
      // Ringkasan KPI
      const totalReports = await Report.count();
      const pendingUrgent = await Report.count({ where: { status: 'Dugaan Mendesak' } });
      const inProgress = await Report.count({ where: { status: 'Diproses' } });
      const completed = await Report.count({ where: { status: 'Selesai' } });

      // Laporan Darurat yang Membutuhkan Verifikasi Cepat (SLA 1-2 Jam)
      const emergencyList = await Report.findAll({
        where: { status: 'Dugaan Mendesak' },
        include: [
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
          { model: EmergencyVerification, as: 'emergencyVerification' },
        ],
        order: [['created_at', 'ASC']],
      });

      // Laporan Mentah (Belum Dianalisis AI)
      const rawReports = await Report.findAll({
        where: { status: 'Menunggu Analisis AI', parent_report_id: null },
        include: [{ model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] }],
        order: [['created_at', 'DESC']],
      });

      // Laporan Hasil Clustering & Prioritas AI (Master Reports)
      const clusteredReports = await Report.findAll({
        where: { parent_report_id: null },
        include: [
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
          { model: AIAnalysisResult, as: 'aiAnalysis' },
          {
            model: Report,
            as: 'similarReports',
            include: [{ model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] }],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      res.render('admin/index', {
        title: 'Dashboard Sarpras UMY - AI Complaint Management',
        user: req.session.user,
        kpi: { totalReports, pendingUrgent, inProgress, completed },
        emergencyList,
        rawReports,
        clusteredReports,
        message: req.query.msg || null,
        error: req.query.error || null,
      });
    } catch (error) {
      console.error('Error saat memuat dashboard admin:', error);
      res.render('error', {
        title: 'Error Dashboard',
        message: 'Gagal memuat data dashboard admin.',
        user: req.session.user,
      });
    }
  }

  // 2. Verifikasi Laporan Darurat (SLA 1-2 Jam - Human in the Loop)
  static async verifyEmergency(req, res) {
    const { report_id, action } = req.body; // action: 'confirm' atau 'downgrade'
    const adminUser = req.session.user;

    const transaction = await sequelize.transaction();
    try {
      const report = await Report.findByPk(report_id, { transaction });
      if (!report) {
        await transaction.rollback();
        return res.redirect('/admin?error=Laporan tidak ditemukan.');
      }

      if (action === 'confirm') {
        // Konfirmasi darurat -> Prioritas Tinggi
        await report.update({ status: 'Diterima' }, { transaction });

        await EmergencyVerification.update(
          {
            status_verifikasi: 'Terkonfirmasi Darurat',
            admin_id: adminUser.user_id,
            verified_at: new Date(),
          },
          { where: { report_id }, transaction }
        );

        // Buat/Update rekam analisis AI darurat
        await AIAnalysisResult.upsert(
          {
            report_id,
            rekomendasi_prioritas: 'Tinggi',
            skor_keyakinan: 1.0,
            kata_kunci_utama: ['darurat_terkonfirmasi', 'bahaya_keselamatan'],
            alasan_ringkas: 'Dikonfirmasi langsung oleh Admin Sarpras sebagai insiden darurat keselamatan.',
            rekomendasi_tindakan: 'Penanganan tanggap darurat teknisi segera di lokasi ruangan.',
            jumlah_laporan_serupa: 1,
          },
          { transaction }
        );

        await ReportStatusLog.create(
          {
            report_id,
            status_sebelum: 'Dugaan Mendesak',
            status_sesudah: 'Diterima',
            catatan_petugas: 'Dugaan mendesak terverifikasi BENAR oleh Admin Sarpras. Penanganan darurat dijadwalkan.',
            updated_by_user_id: adminUser.user_id,
          },
          { transaction }
        );
      } else {
        // Turunkan ke biasa -> Masuk antrean batch AI
        await report.update({ status: 'Menunggu Analisis AI' }, { transaction });

        await EmergencyVerification.update(
          {
            status_verifikasi: 'Diturunkan ke Biasa',
            admin_id: adminUser.user_id,
            verified_at: new Date(),
          },
          { where: { report_id }, transaction }
        );

        await ReportStatusLog.create(
          {
            report_id,
            status_sebelum: 'Dugaan Mendesak',
            status_sesudah: 'Menunggu Analisis AI',
            catatan_petugas: 'Dugaan mendesak ditolak oleh admin (tidak membahayakan jiwa), dialihkan ke antrean reguler.',
            updated_by_user_id: adminUser.user_id,
          },
          { transaction }
        );
      }

      await transaction.commit();
      res.redirect('/admin?msg=Verifikasi darurat berhasil diproses.');
    } catch (error) {
      await transaction.rollback();
      console.error('Error saat verifikasi darurat:', error);
      res.redirect('/admin?error=Gagal memproses verifikasi darurat.');
    }
  }

  // 3. Trigger Batch AI On-Demand (Demo UAS / Pengujian Cepat)
  static async triggerAIBatch(req, res) {
    try {
      const batchResult = await processDailyBatch();
      res.redirect(
        `/admin?msg=Batch AI berhasil dijalankan! ${batchResult.count} kelompok laporan telah dianalisis.`
      );
    } catch (error) {
      console.error('Error trigger batch AI:', error);
      res.redirect('/admin?error=Gagal menjalankan batch AI.');
    }
  }

  // 4. Update Status Laporan (Cascading Update Otomatis ke Laporan Serupa - FR-08)
  static async updateStatus(req, res) {
    const { report_id, status_sesudah, catatan_petugas } = req.body;
    const adminUser = req.session.user;

    const transaction = await sequelize.transaction();
    try {
      const parentReport = await Report.findByPk(report_id, {
        include: [{ model: Report, as: 'similarReports' }],
        transaction,
      });

      if (!parentReport) {
        await transaction.rollback();
        return res.redirect('/admin?error=Laporan tidak ditemukan.');
      }

      const statusSebelum = parentReport.status;

      // 1. Update Laporan Induk
      await parentReport.update({ status: status_sesudah }, { transaction });

      // Catat log status laporan induk
      await ReportStatusLog.create(
        {
          report_id: parentReport.report_id,
          status_sebelum: statusSebelum,
          status_sesudah,
          catatan_petugas: catatan_petugas || `Status diperbarui menjadi ${status_sesudah}.`,
          updated_by_user_id: adminUser.user_id,
        },
        { transaction }
      );

      // 2. CASCADING UPDATE: Perbarui semua laporan serupa anak di bawahnya secara otomatis!
      if (parentReport.similarReports && parentReport.similarReports.length > 0) {
        for (const child of parentReport.similarReports) {
          const childStatusSebelum = child.status;
          await child.update({ status: status_sesudah }, { transaction });

          await ReportStatusLog.create(
            {
              report_id: child.report_id,
              status_sebelum: childStatusSebelum,
              status_sesudah,
              catatan_petugas: `Status tersinkron otomatis via tiket gabungan (#${parentReport.ticket_number}): ${catatan_petugas || status_sesudah}`,
              updated_by_user_id: adminUser.user_id,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      res.redirect(
        `/admin?msg=Status tiket #${parentReport.ticket_number} dan ${parentReport.similarReports?.length || 0} laporan duplikat berhasil diperbarui menjadi ${status_sesudah}!`
      );
    } catch (error) {
      await transaction.rollback();
      console.error('Error saat update status cascading:', error);
      res.redirect('/admin?error=Gagal memperbarui status laporan.');
    }
  }

  // 5. Fitur Unlink Laporan (Pisahkan Laporan jika AI False Clustering - FR-10)
  static async unlinkReport(req, res) {
    const { child_report_id } = req.body;
    const adminUser = req.session.user;

    const transaction = await sequelize.transaction();
    try {
      const childReport = await Report.findByPk(child_report_id, { transaction });
      if (!childReport || !childReport.parent_report_id) {
        await transaction.rollback();
        return res.redirect('/admin?error=Laporan anak tidak ditemukan atau sudah mandiri.');
      }

      const parentId = childReport.parent_report_id;

      // Lepaskan ikatan relasi parent_report_id
      await childReport.update(
        {
          parent_report_id: null,
          status: 'Diterima', // Berdiri mandiri
        },
        { transaction }
      );

      // Kurangi jumlah laporan serupa pada Laporan Induk
      const parentAI = await AIAnalysisResult.findOne({
        where: { report_id: parentId },
        transaction,
      });
      if (parentAI && parentAI.jumlah_laporan_serupa > 1) {
        await parentAI.decrement('jumlah_laporan_serupa', { by: 1, transaction });
      }

      // Catat log pelepasan
      await ReportStatusLog.create(
        {
          report_id: childReport.report_id,
          status_sebelum: 'Tergabung dalam Kluster',
          status_sesudah: 'Mandiri (Unlinked)',
          catatan_petugas: `Laporan dipisahkan secara manual oleh admin dari kluster induk (#${parentId}) karena perbedaan kerusakan fisik.`,
          updated_by_user_id: adminUser.user_id,
        },
        { transaction }
      );

      await transaction.commit();
      res.redirect('/admin?msg=Laporan berhasil dipisahkan dari kluster menjadi tiket mandiri.');
    } catch (error) {
      await transaction.rollback();
      console.error('Error unlink report:', error);
      res.redirect('/admin?error=Gagal memisahkan laporan.');
    }
  }
}

export default AdminController;
