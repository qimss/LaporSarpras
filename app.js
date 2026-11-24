import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';

import { testConnection } from './config/database.js';
import { initCronJobs } from './config/cron.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.APP_PORT || 3000;

// Trust Proxy untuk deployment di Cloud (Render, Railway, Nginx, Cloudflare)
app.set('trust proxy', 1);

// 1. CORS & Security
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan permintaan tanpa origin (seperti mobile apps, curl, server-to-server) atau domain mana pun
      callback(null, true);
    },
    credentials: true,
  })
);

// 2. Parsing Body Request
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. Static Files (Uploads, Public)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// 4. Konfigurasi Sesi (Session & RBAC)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'laporsarpras_umy_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 Hari
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

// 5. REST API Routes
app.use('/api', apiRoutes);

// 6. Serve React Production Build if exists
const reactDistPath = path.join(__dirname, 'dist');
if (fs.existsSync(reactDistPath)) {
  app.use(express.static(reactDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(reactDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'LaporSarpras AI Backend API Server',
      endpoints: {
        auth: '/api/auth/login',
        reports: '/api/reports',
        admin: '/api/admin/dashboard',
        tracking: '/api/reports/:ticketNumber',
      },
    });
  });
}

// 7. Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server.' });
});

// 8. Inisialisasi Database & Start Server
const startServer = async () => {
  console.log('====================================================');
  console.log('🚀 SERVER SISTEM LAPORSARPRAS AI - API ENGINE');
  console.log('====================================================');

  const dbConnected = await testConnection();
  if (dbConnected) {
    try {
      // Auto-Sync model database (Sangat krusial agar deploy pertama kali langsung berhasil)
      const { default: models } = await import('./models/index.js');
      await models.sequelize.sync();
      console.log('✅ Struktur tabel database siap (auto-sync).');

      // Cek apakah tabel pengguna masih kosong, jika ya otomatis isi data awal
      const userCount = await models.User.count();
      if (userCount === 0) {
        console.log('🌱 Database baru terdeteksi. Menjalankan auto-seeder akun...');
        const { runSeeder } = await import('./data/seeders.js');
        await runSeeder();
      }
    } catch (syncErr) {
      console.warn('⚠️ Auto-sync / seeder database:', syncErr.message);
    }
  } else {
    console.warn('⚠️ Server tetap berjalan, namun koneksi database mengalami kendala.');
  }

  // Aktifkan Task Scheduler (Cron 03.00 Pagi)
  initCronJobs();

  app.listen(PORT, () => {
    console.log(`✅ Server Backend API berhasil berjalan aktif pada port ${PORT}!`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`🌐 Base API: http://localhost:${PORT}/api`);
    console.log(`👤 Auth Me:  http://localhost:${PORT}/api/auth/me`);
    console.log('====================================================');
  });
};

startServer();

export default app;
