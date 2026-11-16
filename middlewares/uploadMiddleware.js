import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi penyimpanan disk multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bukti-${uniqueSuffix}${ext}`);
  },
});

// Whitelist tipe MIME & ekstensi gambar (NFR-04 & R-04)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error('Format berkas tidak valid! Hanya diperbolehkan berkas foto JPG, PNG, atau WebP.'),
      false
    );
  }
};

// Batasan ukuran berkas: Maksimal 5 MB (NFR-04)
export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export default uploadPhoto;
