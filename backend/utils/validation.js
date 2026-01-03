/**
 * دوال التحقق العامة للملفات والبريد والهاتف والروابط.
 */

/**
 * يتحقّق من حجم ونوع الملف وفق متغيرات البيئة.
 * @param {Object} file
 * @param {string} file.originalname
 * @param {number} file.size
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file) {
  const maxSize = Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024);
  const allowed = (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,doc')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'ملف غير صالح' };
  }
  if (Number(file.size || 0) > maxSize) {
    return { valid: false, error: 'حجم الملف يتجاوز الحد المسموح' };
  }
  const name = file.originalname || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!allowed.includes(ext)) {
    return { valid: false, error: `نوع الملف غير مسموح: .${ext}` };
  }
  return { valid: true };
}

/**
 * يتحقّق من صحة البريد الإلكتروني.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email.trim());
}

/**
 * يتحقّق من صحة رقم الهاتف (دعم E.164 وبعض الأنماط الشائعة).
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const s = phone.trim();
  const e164 = /^\+?[1-9]\d{7,14}$/; // +XXXXXXXX (8-15 أرقام)
  const local = /^0\d{8,12}$/; // محلي يبدأ بـ 0 بطول معقول
  return e164.test(s) || local.test(s);
}

/**
 * يتحقّق من صحة الرابط.
 * @param {string} url
 * @returns {boolean}
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

