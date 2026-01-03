# AI Server (Flask)

## المتطلبات
- Python 3.10+
- إنشاء ملف البيئة `ai-server/.env` (انسخ من `.env.example`)

## الإعداد
1. إنشاء بيئة افتراضية وتثبيت الاعتمادات:
   ```bash
   cd ai-server
   python -m venv .venv
   # Windows:
   .venv\\Scripts\\activate
   # macOS/Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. إنشاء ملف البيئة:
   ```bash
   cp .env.example .env
   # ثم عدّل القيم حسب بيئتك
   ```

## التشغيل
```bash
python server.py
```

## نقاط النهاية
- `GET /health` فحص الصحة.
- جميع المسارات الأخرى تتطلب مفتاح API عبر الرأس `x-api-key` أو `Authorization: Bearer <key>`.

### تحويل الصوت إلى نص
- `POST /api/transcribe`
  - الحقول:
    - ملف `audio` (multipart/form-data)
  - الاستجابة:
    ```json
    {
      "success": true,
      "raw_transcript": "...",
      "clean_transcript": "...",
      "segments": [
        { "start": 0.0, "end": 2.5, "text": "..." }
      ],
      "metadata": {
        "duration": 120.5,
        "language": "ar",
        "model": "medium",
        "processing_time": 15.2
      }
    }
    ```

## ملاحظات
- إذا كنت تستخدم Ollama محليًا، تأكد من تشغيله وإعداد `OLLAMA_HOST` و`OLLAMA_MODEL` في ملف البيئة.
- تأكد من تثبيت FFmpeg ليعمل التفريغ الصوتي.
- يحتاج faster-whisper إلى نماذج مناسبة وبيئة متوافقة، وقد يتطلب CUDA/ONNXRuntime للأداء الأفضل.
