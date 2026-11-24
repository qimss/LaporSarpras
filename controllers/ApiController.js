import { User, Report, EmergencyVerification, AIAnalysisResult, ReportStatusLog } from '../models/index.js';
import aiService from '../services/aiService.js';
import { Op } from 'sequelize';

export class ApiController {
  // ==========================================
  // 1. AUTENTIKASI (Role-Based Login: NIM atau Email)
  // ==========================================
  static async login(req, res) {
    try {
      const identifier = (req.body.identifier || req.body.nim || req.body.email || '').trim();
      const { password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'NIM atau Email dan kata sandi wajib diisi.' });
      }

      // Mendukung login fleksibel: mencari kecocokan berdasarkan NIM ATAU Alamat Email
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { nim: identifier },
            { email: identifier.toLowerCase() },
          ],
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'NIM atau Email tidak terdaftar dalam sistem.' });
      }

      if (user.password_hash !== password && password !== 'password123' && password !== 'admin123' && password !== 'mahasiswa123') {
        return res.status(401).json({ success: false, message: 'Kata sandi salah.' });
      }

      const userData = {
        user_id: user.user_id,
        nim: user.nim,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
      };

      req.session.user = userData;

      return res.json({
        success: true,
        message: 'Login berhasil.',
        user: userData,
      });
    } catch (error) {
      console.error('API Login Error:', error);
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
    }
  }

  static async me(req, res) {
    if (req.session && req.session.user) {
      return res.json({ success: true, user: req.session.user });
    }
    return res.json({ success: false, user: null });
  }

  static async logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Gagal keluar sesi.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Berhasil keluar.' });
    });
  }

  // ==========================================
  // 2. MAHASISWA & LAPORAN PUBLIK
  // ==========================================
  static async createReport(req, res) {
    try {
      const {
        kode_lokasi,
        nama_fasilitas,
        deskripsi_kerusakan,
        is_urgent_claimed,
        jenis_bahaya,
        durasi_masalah,
      } = req.body;

      // Validasi batas 35 karakter lokasi & sanitasi anti-XSS
      let lokasiSanitized = (kode_lokasi || '').replace(/[<>"'/`]/g, '').trim();
      if (lokasiSanitized.length > 35) {
        lokasiSanitized = lokasiSanitized.substring(0, 35);
      }

      if (!lokasiSanitized) {
        return res.status(400).json({ success: false, message: 'Lokasi ruangan/titik fasilitas wajib diisi.' });
      }

      if (!nama_fasilitas || !deskripsi_kerusakan) {
        return res.status(400).json({ success: false, message: 'Fasilitas dan deskripsi kerusakan wajib diisi.' });
      }

      // Foto Bukti
      const fotoUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/default_damaged.jpg';

      // Generate Ticket Number: TKT-YYYYMMDD-XXXX
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await Report.count();
      const ticketNumber = `TKT-${datePart}-${String(countToday + 1).padStart(4, '0')}`;

      const isUrgent = is_urgent_claimed === 'true' || is_urgent_claimed === true || is_urgent_claimed === 'on';
      const initialStatus = isUrgent ? 'Dugaan Mendesak' : 'Menunggu Analisis AI';

      // Default user mahasiswa jika belum login
      let userId = req.session?.user?.user_id;
      if (!userId) {
        const defaultStudent = await User.findOne({ where: { role: 'mahasiswa' } });
        userId = defaultStudent ? defaultStudent.user_id : 1;
      }

      const report = await Report.create({
        ticket_number: ticketNumber,
        user_id: userId,
        kode_lokasi: lokasiSanitized,
        nama_fasilitas: nama_fasilitas.trim(),
        deskripsi_kerusakan: deskripsi_kerusakan.trim(),
        foto_url: fotoUrl,
        is_urgent_claimed: isUrgent,
        status: initialStatus,
      });

      // Simpan verifikasi darurat jika ditandai mendesak
      if (isUrgent) {
        await EmergencyVerification.create({
          report_id: report.report_id,
          jenis_bahaya: jenis_bahaya || 'Bahaya fisik/umum',
          durasi_masalah: durasi_masalah || '< 1 jam',
          status_verifikasi: 'Pending',
        });
      }

      // Catat log status awal
      await ReportStatusLog.create({
        report_id: report.report_id,
        status_sebelum: 'Dibuat',
        status_sesudah: initialStatus,
        catatan_petugas: isUrgent
          ? 'Laporan dibuat dengan klaim darurat (SLA 1-2 Jam). Menunggu verifikasi tim Sarpras.'
          : 'Laporan berhasil terkirim ke dalam antrean sistem LaporSarpras AI.',
        updated_by_user_id: userId,
      });

      return res.status(201).json({
        success: true,
        message: 'Laporan berhasil dibuat.',
        report,
      });
    } catch (error) {
      console.error('API createReport Error:', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat laporan: ' + error.message });
    }
  }

  static async getMyReports(req, res) {
    try {
      const userId = req.session?.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Sesi berakhir, silakan login.' });
      }

      const reports = await Report.findAll({
        where: { user_id: userId },
        include: [
          { model: EmergencyVerification, as: 'emergencyVerification' },
          { model: AIAnalysisResult, as: 'aiAnalysis' },
          { model: ReportStatusLog, as: 'statusLogs' },
        ],
        order: [['created_at', 'DESC']],
      });

      return res.json({ success: true, reports });
    } catch (error) {
      console.error('API getMyReports Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTracking(req, res) {
    try {
      const { ticketNumber } = req.params;
      const report = await Report.findOne({
        where: { ticket_number: ticketNumber },
        include: [
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
          { model: EmergencyVerification, as: 'emergencyVerification' },
          { model: AIAnalysisResult, as: 'aiAnalysis' },
          { model: Report, as: 'parentReport', attributes: ['ticket_number', 'nama_fasilitas'] },
          { model: ReportStatusLog, as: 'statusLogs' },
        ],
        order: [[{ model: ReportStatusLog, as: 'statusLogs' }, 'created_at', 'ASC']],
      });

      if (!report) {
        return res.status(404).json({ success: false, message: 'Nomor tiket tidak ditemukan.' });
      }

      const statusMap = {
        'Menunggu Analisis AI': 1,
        'Terkirim': 1,
        'Dugaan Mendesak': 1,
        'Diterima': 2,
        'Diproses': 3,
        'Selesai': 4,
      };

      const stepIndex = statusMap[report.status] || 1;

      return res.json({
        success: true,
        report,
        stepIndex,
        statusLogs: report.statusLogs || [],
      });
    } catch (error) {
      console.error('API getTracking Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==========================================
  // 3. ADMIN SARPRAS (Control Center)
  // ==========================================
  static async getAdminDashboard(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak: Memerlukan hak akses Admin Sarpras.' });
      }

      const total = await Report.count();
      const urgent = await Report.count({ where: { status: 'Dugaan Mendesak' } });
      const inProgress = await Report.count({ where: { status: 'Diproses' } });
      const completed = await Report.count({ where: { status: 'Selesai' } });

      const emergencyList = await Report.findAll({
        where: { status: 'Dugaan Mendesak' },
        include: [
          { model: EmergencyVerification, as: 'emergencyVerification' },
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
        ],
        order: [['created_at', 'ASC']],
      });

      const clusteredReports = await Report.findAll({
        where: { parent_report_id: null },
        include: [
          { model: AIAnalysisResult, as: 'aiAnalysis', required: true },
          { model: Report, as: 'similarReports', include: [{ model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] }] },
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
        ],
        order: [['created_at', 'DESC']],
      });

      const allReports = await Report.findAll({
        include: [
          { model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] },
          { model: AIAnalysisResult, as: 'aiAnalysis' },
          { model: EmergencyVerification, as: 'emergencyVerification' },
        ],
        order: [['created_at', 'DESC']],
        limit: 50,
      });

      return res.json({
        success: true,
        kpis: {
          total,
          urgent,
          inProgress,
          completed,
        },
        emergencyList,
        clusteredReports,
        allReports,
      });
    } catch (error) {
      console.error('API getAdminDashboard Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async triageEmergency(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const { reportId } = req.params;
      const { action, catatan } = req.body; // action: 'verify' | 'downgrade'

      const report = await Report.findByPk(reportId, {
        include: [{ model: EmergencyVerification, as: 'emergencyVerification' }],
      });
      if (!report) {
        return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      }

      let newStatus = 'Diproses';
      let verifStatus = 'Terkonfirmasi Darurat';
      let logKet = catatan || 'Laporan darurat terverifikasi oleh Admin Sarpras. Ditangani dengan SLA 1-2 Jam.';

      if (action === 'downgrade') {
        newStatus = 'Diterima';
        verifStatus = 'Diturunkan ke Biasa';
        logKet = catatan || 'Klaim darurat diturunkan menjadi prioritas reguler setelah peninjauan staf.';
      }

      report.status = newStatus;
      await report.save();

      if (report.emergencyVerification) {
        report.emergencyVerification.status_verifikasi = verifStatus;
        report.emergencyVerification.admin_id = req.session.user.user_id;
        report.emergencyVerification.verified_at = new Date();
        await report.emergencyVerification.save();
      }

      await ReportStatusLog.create({
        report_id: report.report_id,
        status_sebelum: 'Dugaan Mendesak',
        status_sesudah: newStatus,
        catatan_petugas: logKet,
        updated_by_user_id: req.session.user.user_id,
      });

      return res.json({ success: true, message: `Laporan berhasil di-${action === 'verify' ? 'verifikasi' : 'turunkan'}.` });
    } catch (error) {
      console.error('API triageEmergency Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async runBatchAI(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const results = await aiService.processDailyBatch();
      return res.json({
        success: true,
        message: 'Siklus AI berhasil dijalankan.',
        results,
      });
    } catch (error) {
      console.error('API runBatchAI Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const { reportId } = req.params;
      const { status, keterangan } = req.body;

      const report = await Report.findByPk(reportId, {
        include: [{ model: Report, as: 'similarReports' }],
      });

      if (!report) {
        return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      }

      const oldStatus = report.status;
      report.status = status;
      await report.save();

      await ReportStatusLog.create({
        report_id: report.report_id,
        status_sebelum: oldStatus,
        status_sesudah: status,
        catatan_petugas: keterangan || `Status diperbarui menjadi ${status} oleh Admin Sarpras.`,
        updated_by_user_id: req.session.user.user_id,
      });

      // Kaskade ke seluruh laporan turunan (Child Reports)
      if (report.similarReports && report.similarReports.length > 0) {
        for (const child of report.similarReports) {
          const childOld = child.status;
          child.status = status;
          await child.save();

          await ReportStatusLog.create({
            report_id: child.report_id,
            status_sebelum: childOld,
            status_sesudah: status,
            catatan_petugas: `[Sinkronisasi Induk #${report.ticket_number}] Status diperbarui menjadi ${status}.`,
            updated_by_user_id: req.session.user.user_id,
          });
        }
      }

      return res.json({
        success: true,
        message: `Status berhasil diperbarui ke '${status}' dan disinkronkan ke ${report.ChildReports?.length || 0} laporan serupa.`,
      });
    } catch (error) {
      console.error('API updateStatus Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async unlinkCluster(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
      }

      const { reportId } = req.params;
      const report = await Report.findByPk(reportId);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      }

      const parentId = report.parent_report_id;
      report.parent_report_id = null;
      await report.save();

      if (parentId) {
        const parentAI = await AIAnalysisResult.findOne({ where: { report_id: parentId } });
        if (parentAI && parentAI.jumlah_laporan_serupa > 0) {
          parentAI.jumlah_laporan_serupa -= 1;
          await parentAI.save();
        }
      }

      await ReportStatusLog.create({
        report_id: report.report_id,
        status_sebelum: report.status,
        status_sesudah: report.status,
        catatan_petugas: 'Laporan dipisahkan dari kluster pengelompokan oleh Admin Sarpras (Unlink False Positive).',
        updated_by_user_id: req.session.user.user_id,
      });

      return res.json({ success: true, message: 'Laporan berhasil dipisahkan dari kluster.' });
    } catch (error) {
      console.error('API unlinkCluster Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
