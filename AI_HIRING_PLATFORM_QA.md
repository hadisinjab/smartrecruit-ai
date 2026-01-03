# دليل أسئلة وأجوبة لمنصة التوظيف المعزّزة بالذكاء الاصطناعي

## القسم 1: الربط بين Frontend وBackend وAI Server

- أفضل بنية: Frontend يتواصل مع Backend فقط. Backend يكون وسيطًا مؤمنًا يتعامل مع التخزين ومع AI Server عبر شبكة داخلية.
- لماذا Backend وسيط:
  - أمن: يمنع كشف AI Server مباشرة ويطبق مصادقة وترخيص وRate Limiting.
  - إدارة الملفات: يستقبل الملفات، يتحقق من النوع والحجم، يحفظ في التخزين، يمرّر المراجع فقط لـ AI Server.
  - تنظيم التدفق: يدير عمليات غير متزامنة، صفوف معالجة، وإشعارات الحالة للواجهة الأمامية.
- إدارة الملفات:
  - استلام عبر Backend باستخدام Multer.
  - حفظ في Supabase Storage مع مفاتيح مسار ومعرّفات.
  - تمرير رابط التحميل المؤقت أو مسار التخزين إلى AI Server للمعالجة.
  - الاحتفاظ بالأصل بحسب سياسة الاحتفاظ ثم الحذف إذا لزم.
- التدفق الأمثل للبيانات:
  1. المستخدم يرفع الملفات ويكمل النموذج.
  2. Backend يتحقق ويخزن في Supabase ويُسجّل ميتاداتا.
  3. Backend يطلق مهام المعالجة:
     - AI Server: تحويل صوت إلى نص وإنتاج Raw وClean.
     - Backend: استخراج نص من PDF/Word ثم Ollama لاستخراج JSON منظم.
     - Backend: Puppeteer لجلب بيانات عامة من الروابط وتحليلها عبر Ollama.
  4. Backend يدمج النتائج ويحسب درجات وتوصيات.
  5. Frontend يعرض الحالة والنتائج عبر polling أو WebSocket.

## القسم 2: Voice Transcription Module

### Endpoint Flask يستقبل ملف صوتي ويعالجه باستخدام openai-whisper

```python
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import requests

app = Flask(__name__)
CORS(app)

os.makedirs("uploads", exist_ok=True)

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "medium")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
DELETE_INPUT = os.getenv("DELETE_INPUT", "true").lower() == "true"

def normalize_text(text: str) -> str:
    t = text.strip()
    t = t.replace(" ،", "،").replace(" !", "!").replace(" ؟", "؟")
    fillers = ["اممم", "يعني", "آآ", "ممم"]
    for f in fillers:
        t = t.replace(f, " ")
    return " ".join(t.split())

def ollama_refine(text: str) -> str:
    prompt = (
        "حسّن هذا النص العربي مع وجود مصطلحات إنجليزية. "
        "أعد صياغته ليكون واضحًا وبدون حشو أو تكرار، مع الحفاظ على المعنى والمصطلحات التقنية. "
        "أخرج النص المنقح فقط:\n\n" + text
    )
    r = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt}
    )
    data = r.json()
    return data.get("response", "").strip()

@app.post("/transcribe")
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "empty filename"}), 400
    ext = os.path.splitext(f.filename)[1].lower() or ".webm"
    fn = f"{uuid.uuid4()}{ext}"
    path = os.path.join("uploads", fn)
    f.save(path)

    model = whisper.load_model(WHISPER_MODEL)
    result = model.transcribe(
        path,
        language="ar",
        task="transcribe",
        fp16=False
    )
    raw = result.get("text", "")
    clean_local = normalize_text(raw)
    clean_llm = ollama_refine(clean_local)

    if DELETE_INPUT and os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass

    return jsonify({
        "raw_transcript": raw,
        "clean_transcript": clean_llm,
        "segments": result.get("segments", []),
        "model": WHISPER_MODEL
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")), debug=False)
```

### تحسين الـ Clean Transcript باستخدام Ollama
- إرسال النص الخام إلى نموذج محلي مثل llama3.2:3b لتنقية الأسلوب، إزالة الحشو، الحفاظ على المصطلحات التقنية، وإخراج نص واضح.
- يمكن إضافة تعليمات خاصة: إزالة التكرار، توحيد المصطلحات، توليد علامات ترقيم مناسبة.

### أفضل إعدادات Whisper للعربية
- language="ar"
- task="transcribe"
- fp16=False على CPU
- يفضل نموذج كبير للجودة مثل large-v3 إذا كان العتاد يسمح، وإلا medium أو small لتوازن السرعة.
- initial_prompt بالنطاق إذا كانت هناك مصطلحات قطاعية ثابتة.

### التعامل مع ملفات صوتية كبيرة
- تقسيم الملف إلى أجزاء زمنية ومعالجتها على التوالي.
- أو استخدام faster-whisper لمزايا الأداء على CPU.
- تحديد مهلة ومعالجة بالخلفية مع صفوف ورسائل حالة.

### الاحتفاظ بالملف الصوتي أم حذفه
- الاحتفاظ القصير للتحقق والتدقيق ثم حذف وفق سياسة احتفاظ.
- إن كانت هناك متطلبات قانونية أو تدقيقية، احفظ مع تحكم وصول واضح وMetadata.

## القسم 3: Resume Parsing Module

### Prompt دقيق لـ Ollama لاستخراج بيانات منظمة

```
أنت محلل سير ذاتية. استخرج بيانات منظمة بصيغة JSON فقط بدون نص إضافي:
{
  "personal_info": { "name": "", "email": "", "phone": "" },
  "work_experience": [
    { "company": "", "role": "", "start_date": "", "end_date": "", "description": "" }
  ],
  "education": [
    { "institution": "", "degree": "", "start_date": "", "end_date": "" }
  ],
  "skills": [],
  "certifications": [],
  "languages": [
    { "language": "", "level": "" }
  ],
  "meta": { "confidence": 0.0 }
}
التواريخ بصيغة ISO-8601 إن أمكن. إذا لم تتوفر معلومة ضع قيمة فارغة. لا تُرجع إلا JSON صالح.
النص:\n
```

### ضمان إخراج JSON دائمًا
- استخدم خاصية format في Ollama API إن كانت متاحة.
- نفّذ التحقق بعد الاستجابة، وإن فشل التحليل أعد طلب إصلاح بصيغة JSON فقط.

### التعامل مع تنسيقات CV مختلفة
- تحويل PDF إلى نص باستخدام pdf-parse.
- تحويل DOCX إلى نص باستخدام mammoth.
- تمرير النص الكامل إلى النموذج مع تعليمات حول الجداول والأعمدة وتنبّه للفصل بين الأقسام.

### تحسين دقة التواريخ والأرقام
- تنفيذ مرحلة تحقق لاحقة بقواعد Regex وتطبيع.
- تمرير موجه ثانوي للنموذج لضبط القيم غير المتسقة.

### كود كامل لـ Endpoint في Node.js

```javascript
import express from "express";
import multer from "multer";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { Ollama } from "ollama";

const app = express();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://localhost:11434" });

app.post("/resume/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });
    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    let text = "";
    if (ext === "pdf") {
      const data = await pdf(req.file.buffer);
      text = data.text || "";
    } else if (ext === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = value || "";
    } else {
      return res.status(400).json({ error: "unsupported format" });
    }
    const prompt = `النص:\n${text}\n\nأخرج JSON فقط كما هو محدد سابقًا.`;
    const result = await ollama.generate({
      model: process.env.OLLAMA_MODEL || "llama3.2:3b",
      prompt,
      format: "json"
    });
    return res.json(JSON.parse(result.response));
  } catch (e) {
    return res.status(500).json({ error: "parse failed" });
  }
});

app.listen(process.env.PORT || 5002);
```

## القسم 4: External Links Parsing (LinkedIn/Behance)

### كود كامل لـ Scraping LinkedIn عام باستخدام Puppeteer

```javascript
import puppeteer from "puppeteer";

export async function scrapePublicProfile(url) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const html = await page.content();
  await browser.close();
  return html;
}
```

### التعامل مع صفحات تتطلب تسجيل دخول
- يفضّل عدم الاعتماد على صفحات تتطلب تسجيل دخول لأسباب قانونية وتقنية.
- إن كان لابد، استخدم جلسة قانونية يدوية أو بيانات مستخدم موثوقة مع موافقة صريحة.

### Headless أم Headed
- Headless كافٍ غالبًا. استخدم Headed عند الحاجة إلى تفاعل يدوي أو تجاوزات محلية.

### تجنب الحظر
- تحديد سرعة معقولة، تدوير User-Agent إن لزم، واحترام شروط الخدمة.
- التخزين المؤقت للنتائج وتقليل الطلبات.

### Prompt لتحليل HTML عبر Ollama

```
حلل هذا المحتوى المستخرج من صفحة عامة. استخرج معلومات منظمة عن الخبرات والمهارات والروابط بصيغة JSON فقط. تجاهل الأقسام غير المهمة. أخرج JSON صالح.
النص:\n
```

### التعامل مع "Profile not accessible"
- أعد نتيجة بحالة غير متاحة مع سبب، ولا تحاول التجاوز.

## القسم 5: Assignment Evaluation Module

### Prompt لتقييم كود برمجي

``+
قيّم الكود وفق المعايير التالية وأخرج JSON فقط:
{
  "code_quality": 0,
  "problem_solving": 0,
  "clarity": 0,
  "notes": []
}
قِيم من 0 إلى 100 لكل معيار، وأضف ملاحظات مركزة وقابلة للتنفيذ. لا تُخرج إلا JSON.
```

### وزن المعايير
- استخدم أوزان قابلة للتكوين مثل:
  - code_quality: 0.4
  - problem_solving: 0.4
  - clarity: 0.2
- احسب المجموع: مجموع(النتيجة × الوزن).

### التعامل مع روابط فيديو
- احصل على النص عبر واجهات عامة أو من المستخدم مباشرة، وحلّله بنفس معيار التوضيح والهيكلة.

### تحليل لغات مختلفة
- اذكر اللغة في السياق واطلب قواعد محددة للتقييم لكل لغة إذا لزم.

### إعطاء تقييم رقمي
- أخرج هيكل JSON ثم احسب الدرجة النهائية وفق الأوزان، وخزّنها مع الميتاداتا.

## القسم 6: Interview Analysis Module

### استخراج الصوت من فيديو

```bash
ffmpeg -i input.mp4 -vn -acodec libmp3lame -ac 1 -ar 16000 -b:a 64k output.mp3
```

### Prompt لتحليل Transcript مقابلة

```
حلل النص كمقابلة وظيفية. أخرج JSON فقط:
{
  "clarity": 0,
  "confidence": 0,
  "tone": "",
  "stress_indicators": [],
  "strengths": [],
  "weaknesses": [],
  "key_timestamps": []
}
اعتمد على مؤشرات لغوية، واذكر أسباب موجزة لكل نتيجة دون نص حر إضافي.
```

### تقدير الثقة ومؤشرات التوتر من النص
- مؤشرات لغوية مثل التردد، التكرار، تجنب الإجابات، واللغة السلبية.

### تحليل النبرة مباشرة من الصوت
- يحتاج نماذج صوتية مخصصة. إن لم تكن متاحة، اعتمد على النص فقط.

### ربط التحليل بـ timestamps
- استخدم Segments من Whisper وإلصاق المؤشرات بزمن بدء ونهاية كل جزء مهم.

## القسم 7: Comprehensive Evaluation Engine

### Prompt شامل لدمج البيانات

```
ادمج بيانات المرشح وأخرج JSON:
{
  "overall_score": 0,
  "subscores": {
    "skills_match": 0,
    "experience_fit": 0,
    "education_fit": 0,
    "communication": 0,
    "assignment_quality": 0,
    "interview_performance": 0
  },
  "strengths": [],
  "weaknesses": [],
  "missing_requirements": [],
  "recommendation": "",
  "suggested_questions": []
}
استخدم معايير الوظيفة المعطاة وأخرج أرقامًا من 0 إلى 100 لكل عنصر.
```

### حساب الأوزان
- اعتمد أوزانًا من إدارة الوظائف، واحسب النتيجة النهائية كمجموع مرجّح.

### ضمان نفس الصيغة دائمًا
- استخدم format: "json" مع Ollama، ثم تحقّق JSON عند الاستقبال.

### تقسيم التقييم أم Prompt واحد
- يفضل تعدد المراحل: تحليل كل مصدر على حدة ثم دمج نهائي لضبط الاتساق.

### توليد أسئلة مقابلة
- أنشئ أسئلة بناءً على نقاط الضعف والمفقودات، وأعدها في JSON محدد.

### ترتيب المرشحين
- احسب Ranking Score بناءً على overall_score ومعايير كالتفضيلات والخبرة الحرجة.

## القسم 8: Performance & Optimization

- زمن المعالجة المتوقع:
  - Whisper: يعتمد على الطول والنموذج.
  - PDF/Word parsing: عادة سريع.
  - Ollama: يعتمد على حجم النص والنموذج.
- اجعل العمليات غير متزامنة.
- استخدم صفوف مثل BullMQ وRedis للمهام الثقيلة.
- أعِد المحاولة عند الفشل مع حدود عليا.
- خزّن نتائج scraping مؤقتًا.
- راقب AI Server عبر سجلات وهيئات مراقبة.

## القسم 9: Security & Error Handling

- أمّن الاتصالات بين Backend وAI Server داخل الشبكة فقط.
- تحقق من نوع وحجم الملفات، واستخدم فحص التواقيع الثنائية عند الإمكان.
- طبّق Rate Limiting وAuth.
- في Flask استخدم معالجات أخطاء عامة مع رسائل JSON واضحة.
- اضبط مهلات للعمليات الطويلة وعمليات الإلغاء.

## القسم 10: Deployment & Environment

### متغيرات البيئة
- Backend:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_STORAGE_BUCKET
  - AI_SERVER_URL
  - OLLAMA_HOST
  - OLLAMA_MODEL
  - MAX_UPLOAD_SIZE
  - ALLOWED_FILE_TYPES
- AI Server:
  - WHISPER_MODEL
  - OLLAMA_HOST
  - OLLAMA_MODEL
  - PORT
  - DELETE_INPUT

### Dockerfile للـ AI Server

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV WHISPER_MODEL=medium
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV OLLAMA_MODEL=llama3.2:3b
EXPOSE 5001
CMD ["python", "server.py"]
```

### ضمان توفر نماذج Ollama عند البدء
- نفّذ تحميل النموذج مسبقًا على البيئة الإنتاجية وتحقق قبل التشغيل.

### إعدادات موصى بها للإنتاج
- فصل الشبكات الداخلية، سجلات منهجية، مراقبة الموارد، والنسخ الاحتياطي للتخزين.
