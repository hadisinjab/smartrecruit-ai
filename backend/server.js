/**
 * نقطة دخول خادم الـ Backend لمنصة التوظيف المعزّزة بالذكاء الاصطناعي.
 * يشغّل Express مع CORS والميدلوير القياسية، ويربط الراوترات، ويقدّم معالجة أخطاء موحّدة.
 *
 * يعتمد على متغيرات البيئة من ملف .env الموجود داخل مجلد backend أو الجذر.
 */
import './config.js';
import express from 'express';
import cors from 'cors';

import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import authMiddleware from './middleware/auth.js';

import transcriptionRouter from './routes/transcription.js';
import resumeRouter from './routes/resume.js';
import externalRouter from './routes/external.js';
import assignmentRouter from './routes/assignment.js';
import interviewRouter from './routes/interview.js';
import evaluationRouter from './routes/evaluation.js';

const app = express();

/**
 * إعداد CORS والميدلوير الأساسية
 */
const corsOrigin = process.env.CORS_ORIGIN || true; // Default to reflecting origin
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// تحديد حجم الجسم وفق إعدادات الرفع
const jsonLimit = Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024);
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

/**
 * Route: Health للتحقق السريع
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

/**
 * حماية الراوترات بميدلوير المفتاح السري
 */
app.use('/api', authMiddleware);

/**
 * ربط الراوترات
 */
app.use('/api/transcription', transcriptionRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/external', externalRouter);
app.use('/api/assignment', assignmentRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/evaluation', evaluationRouter);

/**
 * معالجات 404 والأخطاء
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * تشغيل الخادم
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
