import { supabase } from '../utils/supabase.js';

/**
 * ميدلوير للتحقق من الصلاحيات.
 * يقبل:
 * 1. مفتاح x-api-key (للاتصالات الداخلية بين الخوادم)
 * 2. رمز Authorization: Bearer <token> (للاتصالات من الواجهة الأمامية عبر Supabase Auth)
 */
export default async function authMiddleware(req, res, next) {
  try {
    // 1. التحقق من مفتاح API (Server-to-Server)
    const configuredKey = process.env.BACKEND_API_KEY;
    const headerKey = req.headers['x-api-key'];
    
    if (configuredKey && headerKey === configuredKey) {
      return next();
    }

    // 2. التحقق من توكن Supabase (Frontend-to-Backend)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7);
      
      // نستخدم getUser للتحقق من صحة التوكن
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user; // إرفاق المستخدم بالطلب للاستخدام لاحقاً
        return next();
      }
    }

    // 3. فشل التحقق
    return res.status(401).json({
      error: true,
      message: 'غير مصرح: مفتاح API غير صحيح أو مفقود',
    });
  } catch (e) {
    return next(e);
  }
}

