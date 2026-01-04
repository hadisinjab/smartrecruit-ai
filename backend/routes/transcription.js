/**
 * راوتر transcription: استقبال صوت، رفعه للتخزين، إرسال للـ AI Server، وحفظ النتيجة.
 */
import { Router } from 'express';
import { audioUpload, handleMulterError } from '../middleware/upload.js';
import { supabase, storageUpload } from '../utils/supabase.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'transcription' });
});

router.post(
  '/voice',
  audioUpload.single('audio'),
  handleMulterError,
  async (req, res, next) => {
    try {
      const bypassSupabase = String(process.env.BYPASS_SUPABASE || '').toLowerCase() === 'true';
      const apiKey = process.env.BACKEND_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: true, message: 'BACKEND_API_KEY is not set' });
      }
      // تحقق من الملف
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: true, message: 'Audio file is missing' });
      }
      const { application_id, question_id } = req.body || {};
      if (!application_id || !question_id) {
        return res.status(400).json({ error: true, message: 'application_id and question_id are required' });
      }

      // إرسال الملف إلى AI Server
      const aiUrl = `${process.env.AI_SERVER_URL || 'http://localhost:5001'}/api/transcribe`;
      const form = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype || 'audio/wav' });
      form.append('audio', blob, file.originalname);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000); // 60s
      const r = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!r.ok) {
        const msg = await r.text();
        return res.status(502).json({ error: true, message: `AI Server error: ${msg}` });
      }
      const resp = await r.json();
      if (!resp?.success) {
        return res.status(500).json({ error: true, message: resp?.message || 'Processing failed' });
      }

      // في وضع التجربة: إرجاع النتيجة فقط بدون Supabase
      if (bypassSupabase) {
        return res.json({
          success: true,
          transcription_id: null,
          audio_url: null,
          raw_transcript: resp.raw_transcript,
          clean_transcript: resp.clean_transcript,
          processing_time: resp?.metadata?.processing_time ?? null,
        });
      }

      const bucket = process.env.SUPABASE_AUDIO_BUCKET || 'audio-recordings';
      const timestamp = Date.now();
      const ext = (file.originalname.includes('.') ? file.originalname.split('.').pop() : 'wav').toLowerCase();
      const storagePath = `${application_id}/${question_id}/${timestamp}.${ext}`;
      await storageUpload(bucket, storagePath, file.buffer, {
        contentType: file.mimetype || 'audio/wav',
        upsert: true,
      });

      // الحصول على رابط عام
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const audioUrl = pub?.publicUrl || storagePath;

      // حفظ النتيجة في قاعدة البيانات
      const insertPayload = {
        application_id,
        question_id,
        audio_url: audioUrl,
        raw_transcript: resp.raw_transcript,
        clean_transcript: resp.clean_transcript,
        segments: resp.segments,
        metadata: resp.metadata,
        created_at: new Date().toISOString(),
      };
      const saved = await supabase.from('transcriptions').insert(insertPayload).select();
      if (saved.error) {
        return res.status(500).json({ error: true, message: saved.error.message });
      }
      const rec = Array.isArray(saved.data) ? saved.data[0] : saved.data;

      return res.json({
        success: true,
        transcription_id: rec?.id || null,
        audio_url: audioUrl,
        raw_transcript: resp.raw_transcript,
        clean_transcript: resp.clean_transcript,
        processing_time: resp?.metadata?.processing_time ?? null,
      });
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
