import {
  Report,
  ReportStatusLog,
  AIAnalysisResult,
  EmergencyVerification,
} from '../models/index.js';

export class TrackingController {
  // 1. Tampilkan Linimasa Status Berdasarkan Nomor Tiket (Modul 3 Bab 4.3)
  static async trackByTicket(req, res) {
    const { ticket_number } = req.params;

    try {
      const report = await Report.findOne({
        where: { ticket_number: ticket_number.trim() },
        include: [
          { model: Report, as: 'parentReport' },
          { model: AIAnalysisResult, as: 'aiAnalysis' },
          { model: EmergencyVerification, as: 'emergencyVerification' },
          {
            model: ReportStatusLog,
            as: 'statusLogs',
            order: [['created_at', 'ASC']],
          },
        ],
      });

      if (!report) {
        return res.render('tracking/search', {
          title: 'Pelacakan Status - LaporSarpras AI',
          user: req.session.user,
          error: `Nomor tiket "${ticket_number}" tidak ditemukan dalam sistem.`,
          searchedTicket: ticket_number,
        });
      }

      // Pemetaan Stepper 4 Tahap
      // 1. Terkirim
      // 2. Diterima / Terjadwal
      // 3. Sedang Ditangani Teknisi (Diproses)
      // 4. Selesai (atau Ditolak)
      const currentStatus = report.status;
      let stepIndex = 1;
      if (currentStatus === 'Diterima') stepIndex = 2;
      else if (currentStatus === 'Diproses') stepIndex = 3;
      else if (currentStatus === 'Selesai' || currentStatus === 'Ditolak') stepIndex = 4;

      res.render('tracking/status', {
        title: `Status Tiket ${report.ticket_number} - LaporSarpras`,
        user: req.session.user,
        report,
        stepIndex,
      });
    } catch (error) {
      console.error('Error saat pelacakan tiket:', error);
      res.render('error', {
        title: 'Error Pelacakan',
        message: 'Gagal memuat status pelacakan laporan.',
        user: req.session.user,
      });
    }
  }

  // 2. Halaman Pencarian Tiket Publik
  static showSearch(req, res) {
    res.render('tracking/search', {
      title: 'Lacak Pengaduan Fasilitas Kampus UMY',
      user: req.session.user,
      error: null,
      searchedTicket: '',
    });
  }

  // 3. Halaman Daftar Laporan Saya (Khusus Mahasiswa)
  static async myReports(req, res) {
    const user = req.session.user;

    try {
      const reports = await Report.findAll({
        where: { user_id: user.user_id },
        include: [{ model: AIAnalysisResult, as: 'aiAnalysis' }],
        order: [['created_at', 'DESC']],
      });

      res.render('tracking/my_reports', {
        title: 'Riwayat Pengaduan Saya - LaporSarpras UMY',
        user,
        reports,
      });
    } catch (error) {
      console.error('Error myReports:', error);
      res.redirect('/lapor');
    }
  }
}

export default TrackingController;
