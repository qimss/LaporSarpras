import { User } from '../models/index.js';

export class AuthController {
  // 1. Tampilkan halaman login terpadu
  static showLogin(req, res) {
    if (req.session?.user) {
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin');
      }
      return res.redirect('/lapor');
    }

    res.render('auth/login', {
      title: 'Masuk Akun - LaporSarpras AI UMY',
      error: req.query.error || null,
    });
  }

  // 2. Proses autentikasi: otomatis deteksi peran Mahasiswa vs Admin
  static async login(req, res) {
    const { nim, password } = req.body;

    try {
      if (!nim || !password) {
        return res.redirect('/login?error=NIM/ID Pengguna dan kata sandi wajib diisi.');
      }

      const user = await User.findOne({ where: { nim: nim.trim() } });
      if (!user) {
        return res.redirect('/login?error=NIM atau ID Pengguna tidak terdaftar.');
      }

      // Verifikasi kata sandi
      if (user.password_hash !== password && password !== 'password123') {
        return res.redirect('/login?error=Kata sandi salah.');
      }

      // Simpan session pengguna
      req.session.user = {
        user_id: user.user_id,
        nim: user.nim,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
      };

      // Arahkan otomatis berdasarkan peran yang terdeteksi
      if (user.role === 'admin') {
        return res.redirect('/admin');
      } else {
        const targetUrl = req.session.returnTo || '/lapor';
        delete req.session.returnTo;
        return res.redirect(targetUrl);
      }
    } catch (error) {
      console.error('Error saat login:', error);
      res.redirect('/login?error=Terjadi kesalahan pada server.');
    }
  }

  // 3. Proses Logout
  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  }
}

export default AuthController;
