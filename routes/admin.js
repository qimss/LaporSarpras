import express from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authorizeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Seluruh rute admin wajib memiliki role 'admin' (RBAC)
router.use(authorizeRole(['admin']));

// Dashboard Utama
router.get('/', AdminController.dashboard);

// Verifikasi Laporan Darurat (SLA 1-2 jam)
router.post('/emergency/verify', AdminController.verifyEmergency);

// Trigger Manual Siklus AI Batch
router.post('/ai-batch', AdminController.triggerAIBatch);

// Perbarui Status Laporan (Cascading Update ke Laporan Duplikat)
router.post('/reports/status', AdminController.updateStatus);

// Pisahkan Laporan Duplikat dari Kluster (Unlink)
router.post('/reports/unlink', AdminController.unlinkReport);

export default router;
