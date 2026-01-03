/**
 * راوتر المهام مع نقطة صحّة.
 */
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'assignment' });
});

export default router;

