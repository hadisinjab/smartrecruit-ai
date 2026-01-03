/**
 * راوتر للتكاملات الخارجية (مثلاً فحص صحة خادم الذكاء الاصطناعي).
 */
import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'external' });
});

router.get('/health/ai', async (req, res, next) => {
  try {
    const url = `${process.env.AI_SERVER_URL || 'http://localhost:5001'}/health`;
    const apiKey = process.env.BACKEND_API_KEY;
    const r = await axios.get(url, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
      timeout: 5000,
    });
    return res.json({ upstream: r.data });
  } catch (e) {
    return next(Object.assign(e, { status: 502 }));
  }
});

export default router;

