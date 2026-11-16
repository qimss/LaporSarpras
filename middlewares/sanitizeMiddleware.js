// ============================================================
// MIDDLEWARE SANITASI & PENCEGAHAN XSS (CROSS-SITE SCRIPTING)
// ============================================================

/**
 * Membersihkan karakter berbahaya untuk mencegah serangan XSS
 * Menghilangkan tag HTML, script, dan karakter berbahaya
 */
export const sanitizeInput = (text, maxLength = 255) => {
  if (typeof text !== 'string') return '';
  
  let cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Hapus tag <script>...</script>
    .replace(/<[^>]+>/g, '') // Hapus seluruh tag HTML lainnya
    .replace(/[&<>"'/]/g, (char) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
      };
      return map[char] || char;
    })
    .trim();

  // Batasi panjang karakter
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  return cleaned;
};

/**
 * Middleware express untuk membersihkan seluruh string dalam req.body
 */
export const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        const maxLimit = key === 'kode_lokasi' ? 35 : (key === 'deskripsi_kerusakan' ? 1000 : 100);
        req.body[key] = sanitizeInput(req.body[key], maxLimit);
      }
    }
  }
  next();
};

export default {
  sanitizeInput,
  xssSanitizer,
};
