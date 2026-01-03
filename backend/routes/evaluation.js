/**
 * راوتر التقييمات مع نقطة صحّة.
 */
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'evaluation' });
});

export default router;

