# خطة تحليل المقابلات (Interview Analysis Plan)

بناءً على الأسئلة المطروحة، هذه هي الخطة المقترحة والعملية لنظام تحليل المقابلات.

## 1. مدخلات المقابلة (Inputs)
**الخيار المعتمد:** **C) الاثنين معاً (Upload & Links)**

سنسمح للـ HR برفع ملفات مباشرة أو وضع روابط خارجية لضمان المرونة.

**هيكلية الجدول المقترحة (Supabase):**
```sql
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) not null,
  interview_type text check (interview_type in ('video_upload', 'audio_upload', 'link')),
  file_url text,           -- رابط الملف المرفوع (Storage Bucket)
  external_link text,      -- رابط خارجي (YouTube, Zoom, etc.)
  transcript text,         -- النص المفرغ بالكامل (من Whisper)
  analysis_data jsonb,     -- نتيجة تحليل Ollama
  duration_seconds int,    -- مدة المقابلة
  status text default 'pending', -- pending, processing, completed, failed
  created_at timestamptz default now()
);
```

---

## 2. تحليل الفيديو (Analysis Scope)
**الخيار المعتمد:** **A) تحليل الصوت فقط (Audio-based Analysis)**

السبب:
1. **التكلفة والتعقيد:** تحليل الفيديو البصري (Face Detection, Body Language) يتطلب موارد هائلة ونماذج معقدة جداً.
2. **الكفاءة:** 90% من قيمة المقابلة التقنية تكمن في "ما قيل" (المحتوى) ونبرة الصوت (الثقة)، وهو ما يغطيه تحليل الصوت.

**التقنيات:**
1. **FFmpeg:** لاستخراج الصوت من الفيديو.
2. **Whisper (OpenAI Model):** لتحويل الصوت إلى نص (Transcription) بدقة عالية.
3. **Ollama (LLM):** لتحليل النص المستخرج (Content & Sentiment Analysis).

---

## 3. الأسئلة المطروحة (Questions Handling)
**الخيار المعتمد:** **B) النظام يستنتج الأسئلة من السياق (Context-aware Extraction)** مع خيار **A) إدخال مسبق** إذا توفر.

**النهج:**
1. في البداية، سنعتمد على **تحليل حر (Free-form Analysis)** للنص الكامل.
2. نطلب من Ollama تقسيم النص إلى "سؤال وجواب" بناءً على نمط الحديث (Speaker Diarization إن أمكن، أو السياق).

**مثال للتحليل:**
- **Speaker 1:** "Tell me about React." (يعتبر سؤالاً)
- **Speaker 2:** "React is a library..." (تعتبر إجابة)

---

## 4. المخرجات المطلوبة (Outputs)
**الهيكل المعتمد (JSON):**

سيكون المخرج شاملاً ومفصلاً كما طلبت:

```json
{
  "overall_score": 85,
  
  "metrics": {
    "clarity": 90,          // وضوح الكلام
    "confidence": 85,       // الثقة بالنفس (من النبرة والكلمات)
    "technical_depth": 80,  // عمق المعلومات التقنية
    "communication": 88     // مهارات التواصل
  },
  
  "segments": [
    {
      "timestamp": "00:02:15",
      "topic": "React Experience",
      "summary": "Discussed hooks and state management",
      "sentiment": "positive",
      "score": 85
    }
  ],
  
  "key_insights": {
    "strengths": [
      "Strong understanding of frontend architecture",
      "Clear communication style"
    ],
    "weaknesses": [
      "Hesitant when discussing backend scaling",
      "Used repetitive filler words"
    ]
  },
  
  "recommendation": "Strong Pass",
  "summary": "Candidate showed strong technical skills..."
}
```

---

## 5. استخراج الصوت (Audio Extraction)
**الخيار المعتمد:** **A) استخدام FFmpeg على السيرفر**

- **للملفات المرفوعة:** يتم تمرير الملف لـ FFmpeg لاستخراج `mp3` أو `wav`.
- **للروابط (YouTube/Drive):** سنحتاج مكتبة إضافية مثل `ytdl-core` (لليوتيوب) لجلب الـ Stream ثم تمريره لـ FFmpeg، لكن للبداية سنركز على **الملفات المرفوعة**.

---

## 6. خطة العمل (Action Plan)

1. **إعداد البنية التحتية:**
   - تثبيت `ffmpeg` في بيئة التطوير.
   - تجهيز نموذج `Whisper` (عبر Python script أو Node.js binding).

2. **بناء `backend/utils/transcribe.js`:**
   - وظيفة لتحويل الفيديو -> صوت.
   - وظيفة لتفريغ الصوت -> نص (Whisper).

3. **بناء `backend/utils/analyzeInterview.js`:**
   - إرسال النص لـ Ollama مع Prompt هندسي دقيق لاستخراج التحليلات.

4. **إنشاء API Endpoint:**
   - استقبال الملف، معالجته، وتخزين النتائج في Supabase.

---

### ملخص التوصية (Recommendation)

نبدأ بـ **النهج البسيط والعملي**:
1. **Input:** ملف فيديو/صوت (Upload).
2. **Process:** FFmpeg (Extract Audio) -> Whisper (Transcribe) -> Ollama (Analyze).
3. **Output:** تقرير JSON شامل (Score, Strengths, Weaknesses, Segments).

هذا النهج يضمن قيمة عالية بأقل تعقيد تقني ممكن حالياً.
