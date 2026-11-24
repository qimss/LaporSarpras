import { Router } from 'express';
import { ApiController } from '../controllers/ApiController.js';
import { uploadPhoto } from '../middlewares/uploadMiddleware.js';

const router = Router();

// ==========================================
// 1. Auth Endpoints
// ==========================================
router.post('/auth/login', ApiController.login);
router.get('/auth/me', ApiController.me);
router.post('/auth/logout', ApiController.logout);

// ==========================================
// 2. Mahasiswa & Tracking Endpoints
// ==========================================
// Menerima nama field file bebas (foto_bukti, foto, dll.)
router.post('/reports', uploadPhoto.any(), ApiController.createReport);
router.get('/reports/my', ApiController.getMyReports);
router.get('/reports/:ticketNumber', ApiController.getTracking);

// ==========================================
// 3. Admin Endpoints
// ==========================================
router.get('/admin/dashboard', ApiController.getAdminDashboard);
router.post('/admin/triage/:reportId', ApiController.triageEmergency);
router.post('/admin/batch-ai', ApiController.runBatchAI);
router.post('/admin/reports/:reportId/status', ApiController.updateStatus);
router.post('/admin/reports/:reportId/unlink', ApiController.unlinkCluster);

// ==========================================
// 4. Manajemen Anggota (Admin)
// ==========================================
router.get('/users', ApiController.getUsers);
router.post('/users', ApiController.createUser);

export default router;