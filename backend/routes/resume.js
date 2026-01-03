/**
 * راوتر السير الذاتية مع التحقق من الملف.
 */
import { Router } from 'express';
import { validateFile } from '../utils/validation.js';
import { resumeUpload, handleMulterError } from '../middleware/upload.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'resume' });
});

router.post(
  '/validate',
  resumeUpload.single('file'),
  handleMulterError,
  (req, res) => {
    const file = req.file
      ? { originalname: req.file.originalname, size: req.file.size }
      : null;
    const result = validateFile(file);
    if (!result.valid) {
      return res.status(400).json({ error: true, message: result.error });
    }
    return res.json({ ok: true, message: 'ملف صالح' });
  }
);

export default router;

