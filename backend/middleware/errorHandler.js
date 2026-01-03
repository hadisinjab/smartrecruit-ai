/**
 * ميدلوير موحّد لمعالجة الأخطاء عبر الخادم.
 * يعيد استجابة JSON تتضمّن الرسالة ورمز الحالة والـ trace في وضع التطوير.
 */
export default function errorHandler(err, req, res, next) {
  const status = err.status || err.code || 500;
  const message = err.message || 'حدث خطأ غير متوقع';

  // تسجيل الخطأ دون طباعة أسرار
  console.error('[ERROR]', {
    path: req.path,
    method: req.method,
    status,
    message,
  });

  const response = {
    error: true,
    message,
  };

  if ((process.env.NODE_ENV || 'development') === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * ميدلوير 404 للمسارات غير الموجودة.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: true,
    message: 'المورد غير موجود',
    path: req.path,
  });
}

