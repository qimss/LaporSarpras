import {
  sequelize,
  Report,
  EmergencyVerification,
  ReportStatusLog,
} from '../models/index.js';

export class ReportController {
  // 1. Tampilkan Formulir Pelaporan (Mobile Viewport Pasca Pindai QR)
  static async showForm(req, res) {
    const locId = req.query.loc_id || 'F6-L2-204'; // Default contoh jika dibuka langsung
    const user = req.session.user;

    res.render('pelapor/form', {
      title: 'Form Pengaduan Fasilitas Kampus - UMY',
      user,
      locId,
      error: req.query.error || null,
    });
  }

  // 2. Tangani Pengiriman Form Laporan (Wajib Foto Fisik & Triage Darurat)
  static async submitReport(req, res) {
    const user = req.session.user;
    const {
      kode_lokasi,
      nama_fasilitas,
      deskripsi_kerusakan,
      is_urgent_claimed,
      skor_risiko,
      durasi_masalah,
    } = req.body;

    // Validasi Lokasi Ruangan (Maksimal 35 Karakter & Wajib Diisi)
    if (!kode_lokasi || !kode_lokasi.trim()) {
      return res.redirect('/lapor?error=Lokasi ruangan fasilitas wajib diisi!');
    }
    const cleanLocation = kode_lokasi.trim().substring(0, 35);

    // Validasi Wajib Upload Foto Fisik (FR-02 & NFR-04)
    if (!req.file) {
      return res.redirect(
        `/lapor?loc_id=${encodeURIComponent(cleanLocation)}&error=Wajib melampirkan foto bukti fisik kerusakan!`
      );
    }

    if (!nama_fasilitas || !deskripsi_kerusakan) {
      return res.redirect(
        `/lapor?loc_id=${encodeURIComponent(cleanLocation)}&error=Nama fasilitas dan deskripsi kerusakan wajib diisi!`
      );
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    const isUrgent = is_urgent_claimed === 'true' || is_urgent_claimed === 'on';

    // Evaluasi Status Awal: Darurat vs Menunggu AI
    let initialStatus = 'Menunggu Analisis AI';
    const calculatedRiskScore = Number(skor_risiko || 0);

    if (isUrgent && calculatedRiskScore >= 70) {
      initialStatus = 'Dugaan Mendesak';
    }

    // Buat Nomor Tiket Unik: TKT-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${dateStr}-${randomSuffix}`;

    const transaction = await sequelize.transaction();
    try {
      // 1. Buat Laporan di tabel reports
      const newReport = await Report.create(
        {
          ticket_number: ticketNumber,
          user_id: user.user_id,
          kode_lokasi: cleanLocation,
          nama_fasilitas: nama_fasilitas.trim(),
          deskripsi_kerusakan: deskripsi_kerusakan.trim(),
          foto_url: photoUrl,
          is_urgent_claimed: isUrgent,
          status: initialStatus,
        },
        { transaction }
      );

      // 2. Jika ditandai darurat, rekam ke tabel emergency_verifications (FR-04)
      if (isUrgent) {
        await EmergencyVerification.create(
          {
            report_id: newReport.report_id,
            skor_risiko_keselamatan: calculatedRiskScore,
            durasi_masalah: durasi_masalah || '< 1 jam',
            status_verifikasi: 'Pending',
            admin_id: null,
          },
          { transaction }
        );
      }

      // 3. Catat linimasa awal di report_status_logs
      await ReportStatusLog.create(
        {
          report_id: newReport.report_id,
          status_sebelum: 'Draft',
          status_sesudah: initialStatus,
          catatan_petugas: isUrgent
            ? 'Tiket dibuat dengan status Dugaan Mendesak (Menunggu verifikasi admin respon cepat SLA 1-2 jam).'
            : 'Laporan berhasil terkirim dan disimpan. Menunggu jadwal batch analisis AI pukul 03.00 pagi.',
          updated_by_user_id: user.user_id,
        },
        { transaction }
      );

      await transaction.commit();
      res.redirect(`/lapor/sukses/${ticketNumber}`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error saat membuat laporan:', error);
      res.redirect(
        `/lapor?loc_id=${encodeURIComponent(kode_lokasi)}&error=Gagal menyimpan laporan ke server.`
      );
    }
  }

  // 3. Tampilkan Layar Konfirmasi Sukses & Nomor Tiket
  static async showSuccess(req, res) {
    const { ticket_number } = req.params;

    try {
      const report = await Report.findOne({
        where: { ticket_number },
      });

      if (!report) {
        return res.redirect('/lapor');
      }

      res.render('pelapor/success', {
        title: 'Laporan Terkirim - LaporSarpras AI',
        user: req.session.user,
        report,
      });
    } catch (error) {
      console.error('Error success screen:', error);
      res.redirect('/lapor');
    }
  }
}

export default ReportController;
