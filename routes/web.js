import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { ReportController } from '../controllers/ReportController.js';
import { TrackingController } from '../controllers/TrackingController.js';
import { uploadPhoto } from '../middlewares/uploadMiddleware.js';
import { xssSanitizer } from '../middlewares/sanitizeMiddleware.js';
import { ensureAuthenticated, authorizeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. Beranda / Landing (Scan QR Simulator)
router.get('/', (req, res) => {
  res.render('landing', {
    title: 'LaporSarpras AI - Sistem Pengaduan Fasilitas Kampus UMY',
    user: req.session.user || null,
  });
});

// 2. Rute Autentikasi
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

// 3. Rute Pelaporan Mahasiswa (Modul 1)
router.get('/lapor', ensureAuthenticated, ReportController.showForm);
router.post(
  '/lapor',
  ensureAuthenticated,
  uploadPhoto.single('foto_bukti'),
  xssSanitizer,
  ReportController.submitReport
);
router.get('/lapor/sukses/:ticket_number', ensureAuthenticated, ReportController.showSuccess);

// 4. Rute Pelacakan Tiket (Modul 3)
router.get('/tracking/cari', TrackingController.showSearch);
router.get('/tracking/saya', ensureAuthenticated, TrackingController.myReports);
router.get('/tracking/:ticket_number', TrackingController.trackByTicket);

export default router;
