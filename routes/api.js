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
router.post('/reports', uploadPhoto.single('foto'), ApiController.createReport);
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

export default router;
