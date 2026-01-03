# Backend (Node.js/Express)

## المتطلبات
- Node.js 18+
- إعداد ملف البيئة `backend/.env` (انسخ من `.env.example`)

## الإعداد
1. تثبيت الاعتمادات:
   ```bash
   cd backend
   npm install
   ```
2. إنشاء ملف البيئة:
   ```bash
   cp .env.example .env
   # ثم عدّل القيم حسب بيئتك
   ```

## التشغيل
- تشغيل الخادم:
  ```bash
  node server.js
  # أو:
  npm run dev
  ```

## نقاط النهاية
- فحص الصحة:
  - `GET /api/health`
- فحص تكامل خادم الذكاء الاصطناعي:
  - `GET /api/external/health/ai` (يتطلب رأس `x-api-key`)
- تحقق ملف السيرة الذاتية:
  - `POST /api/resume/validate` مع الحقل `file`
- تحويل الصوت إلى نص:
  - `POST /api/transcription/voice` (يتطلب رأس `x-api-key`)
    - الحقول:
      - ملف `audio` (multipart/form-data)
      - `application_id` نصي
      - `question_id` نصي
    - الاستجابة:
      ```json
      {
        "success": true,
        "transcription_id": "...",
        "audio_url": "...",
        "raw_transcript": "...",
        "clean_transcript": "...",
        "processing_time": 15.2
      }
      ```

## ملاحظات أمنية
- اضبط المتغير `BACKEND_API_KEY` وتأكد من إرساله في الطلب عبر الرأس `x-api-key` أو `Authorization: Bearer <key>`.
- لا تقم أبداً بوضع المفاتيح في الكود أو السجلات.

## اختبار سريع
```bash
# من داخل مجلد backend:
./test_transcription.sh path/to/audio.wav
```
