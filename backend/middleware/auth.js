/**
 * ميدلوير للتحقق من مفتاح واجهة الـ Backend عبر رأس الطلب أو Authorization.
 * يجب تمرير المفتاح في رأس x-api-key أو Authorization: Bearer <key>.
 */
export default function authMiddleware(req, res, next) {
  try {
    const configuredKey = process.env.BACKEND_API_KEY;
    if (!configuredKey) {
      return res.status(500).json({
        error: true,
        message: 'BACKEND_API_KEY غير مضبوط في متغيرات البيئة',
      });
    }
    const headerKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    const bearerKey =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7)
        : undefined;

    const incomingKey = headerKey || bearerKey;
    if (!incomingKey || incomingKey !== configuredKey) {
      return res.status(401).json({
        error: true,
        message: 'غير مصرح: مفتاح API غير صحيح أو مفقود',
      });
    }
    return next();
  } catch (e) {
    return next(e);
  }
}

