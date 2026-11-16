// ============================================================
// MIDDLEWARE AUTENTIKASI & RBAC (ROLE-BASED ACCESS CONTROL)
// ============================================================

export const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  // Simpan URL yang ingin dituju agar bisa redirect balik setelah login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
};

export const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/login');
    }

    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Jika role tidak diizinkan, kembalikan 403 Forbidden
    return res.status(403).render('error', {
      title: 'Akses Ditolak (403 Forbidden)',
      message: `Peran Anda (${userRole}) tidak memiliki wewenang untuk mengakses halaman ini. Halaman ini khusus untuk: ${allowedRoles.join(', ')}.`,
      user: req.session.user,
    });
  };
};

export default {
  ensureAuthenticated,
  authorizeRole,
};
