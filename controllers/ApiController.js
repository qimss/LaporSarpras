import { User, Report, EmergencyVerification, AIAnalysisResult, ReportStatusLog } from '../models/index.js';
import aiService from '../services/aiService.js';
import { Op } from 'sequelize';

function validateMeaningfulText(text, minLetters = 2) {
  if (!text || typeof text !== 'string') {
    return { valid: false, message: 'Wajib diisi.' };
  }

  const trimmed = text.trim();
  const lettersOnly = trimmed.replace(/[^a-zA-Z\u00C0-\u024F]/g, '');

  if (lettersOnly.length < minLetters) {
    return {
      valid: false,
      message: `Minimal harus mengandung ${minLetters} huruf yang jelas (tidak boleh hanya angka atau simbol).`,
    };
  }

  if (/(.)\1{4,}/.test(trimmed)) {
    return {
      valid: false,
      message: 'Input terdeteksi tidak valid (pengulangan karakter berlebihan).',
    };
  }

  return { valid: true };
}

function normalizePriorityForDb(val, fallback = 'Sedang') {
  const clean = String(val || fallback).trim().toLowerCase();
  if (['rendah', 'low'].includes(clean)) return 'Rendah';
  if (['tinggi', 'high', 'kritis', 'critical', 'darurat', 'emergency', 'urgent'].includes(clean)) {
    return 'Tinggi';
  }
  return 'Sedang';
}

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

      // Verifikasi kata sandi murni hanya dari basis data
      if (user.password_hash !== password) {
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
      // Ambil file baik dari req.file maupun req.files (untuk uploadPhoto.any())
      const uploadedFile =
        req.file ||
        (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);

      const {
        kode_lokasi,
        nama_fasilitas,
        deskripsi_kerusakan,
        is_urgent,
        is_urgent_claimed,
        jenis_bahaya,
        durasi_masalah,
        skor_risiko,
      } = req.body;

      // Sanitasi anti-XSS pada lokasi
      let lokasiSanitized = (kode_lokasi || '').replace(/[<>"'/`]/g, '').trim();
      if (lokasiSanitized.length > 60) {
        lokasiSanitized = lokasiSanitized.substring(0, 60);
      }

      if (!lokasiSanitized) {
        return res.status(400).json({ success: false, message: 'Lokasi ruangan/titik fasilitas wajib dipilih.' });
      }

      // Sanitasi & validasi kebenaran teks nama_fasilitas (minimal 2 huruf bermakna)
      const fasilitasSanitized = (nama_fasilitas || '').replace(/[<>"'/`]/g, '').trim();
      const validFasilitas = validateMeaningfulText(fasilitasSanitized, 2);
      if (!validFasilitas.valid) {
        return res.status(400).json({
          success: false,
          message: `Jenis Fasilitas tidak valid: ${validFasilitas.message}`,
        });
      }

      // Sanitasi & validasi kebenaran teks deskripsi_kerusakan (minimal 10 huruf bermakna)
      const deskripsiSanitized = (deskripsi_kerusakan || '').replace(/[<>"'/`]/g, '').trim();
      const validDeskripsi = validateMeaningfulText(deskripsiSanitized, 10);
      if (!validDeskripsi.valid) {
        return res.status(400).json({
          success: false,
          message: `Deskripsi Kerusakan tidak valid: ${validDeskripsi.message}`,
        });
      }

      const rawUrgent = is_urgent_claimed ?? is_urgent;
      const isUrgent =
        rawUrgent === 'true' || rawUrgent === true || rawUrgent === 'on' || rawUrgent === '1';

      const jenisBahayaValue = (jenis_bahaya || durasi_masalah || '').trim();

      if (isUrgent && !jenisBahayaValue) {
        return res.status(400).json({
          success: false,
          message: 'Jenis risiko bahaya wajib dipilih saat mode Kondisi Mendesak diaktifkan.',
        });
      }

      if (isUrgent && !uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'Bukti foto fisik wajib dilampirkan untuk laporan Kondisi Mendesak / Berbahaya.',
        });
      }

      let userId = req.session?.user?.user_id;
      if (!userId) {
        const defaultStudent = await User.findOne({ where: { role: 'mahasiswa' } });
        userId = defaultStudent ? defaultStudent.user_id : 1;
      }

      // Cegah 1 pengguna mengirim laporan ganda untuk fasilitas & lokasi yang sama saat masih aktif
      const existingActiveReport = await Report.findOne({
        where: {
          user_id: userId,
          kode_lokasi: lokasiSanitized,
          nama_fasilitas: { [Op.iLike]: fasilitasSanitized },
          status: { [Op.ne]: 'Selesai' },
        },
      });

      if (existingActiveReport) {
        return res.status(409).json({
          success: false,
          message: `Anda sudah memiliki laporan aktif untuk "${fasilitasSanitized}" di "${lokasiSanitized}" (Tiket #${existingActiveReport.ticket_number}).`,
        });
      }

      const fotoUrl = uploadedFile ? `/uploads/${uploadedFile.filename}` : '/uploads/default_damaged.jpg';

      // Generate Ticket Number berbasis report_id agar unik saat 2 akun mengirim bersamaan
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const tempTicketNumber = `TKT-${datePart}-${Date.now().toString().slice(-6)}`;

      const initialStatus = isUrgent ? 'Dugaan Mendesak' : 'Menunggu Analisis AI';

      const report = await Report.create({
        ticket_number: tempTicketNumber,
        user_id: userId,
        kode_lokasi: lokasiSanitized,
        nama_fasilitas: fasilitasSanitized,
        deskripsi_kerusakan: deskripsiSanitized,
        foto_url: fotoUrl,
        is_urgent_claimed: isUrgent,
        status: initialStatus,
      });

      const finalTicketNumber = `TKT-${datePart}-${String(report.report_id).padStart(4, '0')}`;
      await report.update({ ticket_number: finalTicketNumber });

      if (isUrgent) {
        await EmergencyVerification.create({
          report_id: report.report_id,
          jenis_bahaya: jenisBahayaValue,
          durasi_masalah: durasi_masalah || jenisBahayaValue || '< 1 jam',
          status_verifikasi: 'Pending',
        });
      }

      await ReportStatusLog.create({
        report_id: report.report_id,
        status_sebelum: 'Dibuat',
        status_sesudah: initialStatus,
        catatan_petugas: isUrgent
          ? `Laporan dibuat dengan klaim darurat (${jenisBahayaValue}${skor_risiko ? ` - Skor ${skor_risiko}` : ''} - SLA 1-2 Jam). Menunggu verifikasi tim Sarpras.`
          : 'Laporan berhasil terkirim ke dalam antrean sistem LaporSarpras AI.',
        updated_by_user_id: userId,
      });

      // ========================================================
      // FIKSASI ANALISIS AI SEGERA SAAT LAPORAN DIBUAT (INSTANT AI)
      // ========================================================
      let aiAnalysisRecord = null;
      try {
        const aiResult = await aiService.analyzeReportPriority(
          lokasiSanitized,
          fasilitasSanitized,
          deskripsiSanitized
        );

        const assignedPriority = isUrgent
          ? 'Tinggi'
          : normalizePriorityForDb(aiResult?.prioritas, 'Sedang');
        const assignedConfidence = isUrgent ? 0.98 : Number(aiResult?.skor_keyakinan ?? 0.88);
        const rawKeywords = aiResult?.kata_kunci_utama ?? fasilitasSanitized;
        const assignedKeywords = Array.isArray(rawKeywords)
          ? rawKeywords.join(', ')
          : String(rawKeywords).trim() || fasilitasSanitized;
        const assignedAlasan = isUrgent
          ? `Laporan ditandai mahasiswa sebagai Kondisi Mendesak (${jenisBahayaValue}). ${aiResult?.alasan_ringkas || ''}`.trim()
          : String(aiResult?.alasan_ringkas || 'Laporan kerusakan fasilitas memerlukan peninjauan teknis.').trim();
        const assignedTindakan = isUrgent
          ? 'Segera tugaskan teknisi tanggap darurat (SLA 1-2 Jam) ke lokasi.'
          : String(aiResult?.rekomendasi_tindakan || 'Jadwalkan inspeksi petugas sarana dan prasarana ke lokasi terkait.').trim();

        aiAnalysisRecord = await AIAnalysisResult.create({
          report_id: report.report_id,
          rekomendasi_prioritas: assignedPriority,
          skor_keyakinan: assignedConfidence,
          kata_kunci_utama: assignedKeywords,
          alasan_ringkas: assignedAlasan,
          rekomendasi_tindakan: assignedTindakan,
          jumlah_laporan_serupa: 1,
        });

        await ReportStatusLog.create({
          report_id: report.report_id,
          status_sebelum: initialStatus,
          status_sesudah: initialStatus,
          catatan_petugas: `Analisis AI (${aiResult?.source || 'AI Engine'}): Prioritas '${assignedPriority}' (Keyakinan: ${Math.round(assignedConfidence * 100)}%). Saran: ${assignedTindakan}`,
          updated_by_user_id: null,
        });
      } catch (aiErr) {
        console.warn('⚠️ Analisis AI otomatis saat pembuatan laporan terkendala:', aiErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Laporan berhasil dibuat dan dianalisis AI.',
        report: {
          ...report.toJSON(),
          aiAnalysis: aiAnalysisRecord,
        },
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
  // 3. ADMIN SARPRAS (Control Center & Anggota)
  // ==========================================
  static async getUsers(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Memerlukan hak akses Admin Sarpras.',
        });
      }

      const users = await User.findAll({
        attributes: ['user_id', 'nim', 'nama_lengkap', 'email', 'role'],
        order: [['user_id', 'DESC']],
      });

      return res.json({ success: true, users });
    } catch (error) {
      console.error('API getUsers Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createUser(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Memerlukan hak akses Admin Sarpras.',
        });
      }

      const nim = String(req.body.nim || '').trim();
      const nama_lengkap = String(req.body.nama_lengkap || '').replace(/[<>"'/`]/g, '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '').trim();
      const role = req.body.role === 'admin' ? 'admin' : 'mahasiswa';

      if (!nim || !nama_lengkap || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'NIM/ID, Nama Lengkap, Email, dan Kata Sandi wajib diisi.',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Kata sandi minimal 6 karakter.',
        });
      }

      const existing = await User.findOne({
        where: {
          [Op.or]: [{ nim }, { email }],
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'NIM/ID atau Email sudah terdaftar dalam sistem.',
        });
      }

      const newUser = await User.create({
        nim,
        nama_lengkap,
        email,
        role,
        password_hash: password,
      });

      return res.status(201).json({
        success: true,
        message: 'Anggota baru berhasil ditambahkan.',
        user: {
          user_id: newUser.user_id,
          nim: newUser.nim,
          nama_lengkap: newUser.nama_lengkap,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error('API createUser Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal menambahkan anggota: ' + error.message,
      });
    }
  }

  static async updateUser(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Memerlukan hak akses Admin Sarpras.',
        });
      }

      const { userId } = req.params;
      const member = await User.findByPk(userId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Anggota tidak ditemukan.',
        });
      }

      const nim = String(req.body.nim ?? member.nim).trim();
      const nama_lengkap = String(req.body.nama_lengkap ?? member.nama_lengkap)
        .replace(/[<>"'/`]/g, '')
        .trim();
      const email = String(req.body.email ?? member.email).trim().toLowerCase();
      const role = req.body.role === 'admin' ? 'admin' : 'mahasiswa';
      const password = String(req.body.password || '').trim();

      if (!nim || !nama_lengkap || !email) {
        return res.status(400).json({
          success: false,
          message: 'NIM/ID, Nama Lengkap, dan Email wajib diisi.',
        });
      }

      const duplicate = await User.findOne({
        where: {
          user_id: { [Op.ne]: member.user_id },
          [Op.or]: [{ nim }, { email }],
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'NIM/ID atau Email sudah digunakan oleh anggota lain.',
        });
      }

      member.nim = nim;
      member.nama_lengkap = nama_lengkap;
      member.email = email;
      member.role = role;

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Kata sandi baru minimal 6 karakter.',
          });
        }
        member.password_hash = password;
      }

      await member.save();

      return res.json({
        success: true,
        message: 'Data anggota berhasil diperbarui.',
        user: {
          user_id: member.user_id,
          nim: member.nim,
          nama_lengkap: member.nama_lengkap,
          email: member.email,
          role: member.role,
        },
      });
    } catch (error) {
      console.error('API updateUser Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal memperbarui anggota: ' + error.message,
      });
    }
  }

  static async deleteUser(req, res) {
    try {
      if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Memerlukan hak akses Admin Sarpras.',
        });
      }

      const { userId } = req.params;
      if (Number(userId) === Number(req.session?.user?.user_id)) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menghapus akun admin yang sedang digunakan.',
        });
      }

      const member = await User.findByPk(userId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Anggota tidak ditemukan.',
        });
      }

      await member.destroy();

      return res.json({
        success: true,
        message: 'Anggota berhasil dihapus.',
      });
    } catch (error) {
      console.error('API deleteUser Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal menghapus anggota: ' + error.message,
      });
    }
  }

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
          {
            model: Report,
            as: 'similarReports',
            include: [{ model: User, as: 'reporter', attributes: ['nama_lengkap', 'nim'] }],
          },
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
      const { action, catatan } = req.body;

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

      return res.json({
        success: true,
        message: `Laporan berhasil di-${action === 'verify' ? 'verifikasi' : 'turunkan'}.`,
      });
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
        message: `Status berhasil diperbarui ke '${status}' dan disinkronkan ke ${report.similarReports?.length || 0} laporan serupa.`,
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