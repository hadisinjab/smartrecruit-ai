/**
 * إعداد رفع الملفات باستخدام multer مع تحقّق من الأنواع والأحجام، وواجهة سهلة للاستخدام.
 */
import multer from 'multer';

/**
 * يحوّل قائمة الأنواع المسموحة من متغير البيئة إلى مجموعة امتدادات.
 */
function getAllowedExtensions() {
  const raw = (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,doc')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return new Set(raw);
}

/**
 * فلتر التحقق من نوع الملف وفق الامتداد فقط (آمن وأكثر ثباتًا من MIME).
 */
function makeFileFilter(allowed = getAllowedExtensions()) {
  return (req, file, cb) => {
    try {
      const name = file.originalname || '';
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      if (!allowed.has(ext)) {
        return cb(
          new multer.MulterError(
            'LIMIT_UNEXPECTED_FILE',
            `نوع الملف غير مسموح: .${ext}`
          ),
          false
        );
      }
      return cb(null, true);
    } catch (e) {
      return cb(e, false);
    }
  };
}

/**
 * ينشئ رافع ملفات بذاكرة لتفادي التعامل مع نظام الملفات في هذه المرحلة.
 */
function createUploader({ maxFileSize, allowed }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Number(maxFileSize || 10 * 1024 * 1024) },
    fileFilter: makeFileFilter(allowed),
  });
}

/**
 * رافع للسير الذاتية وفق حدود وحالات المشروع.
 */
export const resumeUpload = createUploader({
  maxFileSize: Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024),
  allowed: getAllowedExtensions(),
});

/**
 * رافع للملفات الصوتية.
 */
export const audioUpload = createUploader({
  maxFileSize: Number(process.env.MAX_AUDIO_SIZE || 50 * 1024 * 1024),
  allowed: new Set(['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'webm']),
});

/**
 * ميدلوير مساعد لالتقاط أخطاء multer وإرجاعها بصيغة JSON موحّدة.
 */
export function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const mapCodeToStatus = {
      LIMIT_FILE_SIZE: 413,
      LIMIT_PART_COUNT: 400,
      LIMIT_FILE_COUNT: 400,
      LIMIT_FIELD_KEY: 400,
      LIMIT_FIELD_VALUE: 400,
      LIMIT_FIELD_COUNT: 400,
      LIMIT_UNEXPECTED_FILE: 415,
    };
    const status = mapCodeToStatus[err.code] || 400;
    return res.status(status).json({
      error: true,
      message: err.message || 'خطأ في رفع الملف',
      code: err.code,
    });
  }
  return next(err);
}

