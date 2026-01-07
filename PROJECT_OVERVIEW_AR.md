# توثيق مشروع SmartRecruit AI

مرحباً بك في ملف التوثيق الشامل لمشروع **SmartRecruit AI**. هذا الملف يشرح هيكلية المشروع، التقنيات المستخدمة، كيفية تقسيمه، وما تحتاج لمعرفته لرفع المشروع على سيرفر.

---

## 1. نبذة عن المشروع
**SmartRecruit AI** هو نظام توظيف ذكي مدعوم بالذكاء الاصطناعي، يهدف إلى أتمتة وتحسين عملية التوظيف من خلال:
- **بوابة تقديم متقدمة:** تتيح للمرشحين التقديم والإجابة على أسئلة نصية، صوتية، ورفع ملفات.
- **لوحة تحكم للمسؤولين:** لإدارة الوظائف، المرشحين، والمستخدمين.
- **تحليل ذكي (AI Analysis):** تحليل السير الذاتية، الإجابات الصوتية والنصية، وتقييم المرشحين تلقائياً.

---

## 2. هيكلية المشروع (Architecture)
المشروع مقسم إلى ثلاثة أجزاء رئيسية تعمل معاً:

### أ. الواجهة الأمامية (Frontend) - المجلد الرئيسي `root`
*   **المسار:** المجلد الجذري للمشروع.
*   **التقنية:** [Next.js 14](https://nextjs.org/) (React Framework).
*   **اللغة:** TypeScript.
*   **الوظيفة:**
    *   عرض واجهات المستخدم (لوحة التحكم، بوابة التقديم).
    *   إدارة التوجيه (Routing) والتدويل (i18n) للغتين العربية والإنجليزية.
    *   التفاعل مع قاعدة البيانات (Supabase) مباشرة في بعض الأحيان لجلب البيانات.
    *   إرسال طلبات للـ Backend و AI Server عند الحاجة لمعالجة الملفات أو التحليل.

### ب. الخادم الخلفي (Backend) - المجلد `backend/`
*   **المسار:** `backend/`
*   **التقنية:** [Node.js](https://nodejs.org/) مع إطار عمل [Express](https://expressjs.com/).
*   **اللغة:** JavaScript (ES Modules).
*   **الوظيفة:**
    *   الوسيط للعمليات التي تتطلب معالجة ملفات ثقيلة (مثل رفع ملفات الصوت وتحليل ملفات PDF).
    *   التواصل مع نماذج الذكاء الاصطناعي (Ollama) إذا لزم الأمر.
    *   نقاط اتصال (API Endpoints) مخصصة لمعالجة السير الذاتية وتحليل المقابلات.

### ج. خادم الذكاء الاصطناعي (AI Server) - المجلد `ai-server/`
*   **المسار:** `ai-server/`
*   **التقنية:** [Python](https://www.python.org/) مع إطار عمل [Flask](https://flask.palletsprojects.com/).
*   **اللغة:** Python.
*   **الوظيفة:**
    *   تشغيل نماذج الذكاء الاصطناعي المتقدمة (مثل Whisper لتحويل الصوت إلى نص).
    *   تحليل النصوص واستخراج المعلومات.
    *   يوفر API داخلي يستدعيه الـ Frontend أو Backend لإجراء التحليلات المعقدة.

### د. قاعدة البيانات (Database)
*   **التقنية:** [Supabase](https://supabase.com/) (مبنية على PostgreSQL).
*   **الوظيفة:** تخزين كل بيانات المستخدمين، الوظائف، المرشحين، والتقييمات. كما تدير المصادقة (Auth) وتخزين الملفات (Storage).

---

## 3. التقنيات والمكتبات الرئيسية

### Frontend (Next.js)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS, Radix UI, Lucide React (Icons)
- **State/Forms:** React Hook Form, Zod (Validation)
- **Internationalization:** next-intl (دعم عربي/إنجليزي)
- **Database Client:** @supabase/supabase-js

### Backend (Node.js)
- **Framework:** Express.js
- **File Handling:** Multer
- **AI Integration:** Ollama (للتواصل مع نماذج اللغة المحلية)
- **Document Parsing:** pdf-parse, mammoth
- **Utilities:** Puppeteer, Axios

### AI Server (Python)
- **Framework:** Flask
- **AI Models:** OpenAI Whisper (Faster Whisper) لتحويل الصوت إلى نص.
- **Environment:** python-dotenv, flask-cors

---

## 4. تفاصيل المجلدات (Folder Structure)

```
smartrecruit-ai/
├── src/                  # كود الواجهة الأمامية (Next.js)
│   ├── app/              # صفحات الموقع (App Router)
│   ├── components/       # مكونات React القابلة لإعادة الاستخدام
│   ├── lib/              # دوال مساعدة ومكتبات
│   ├── messages/         # ملفات الترجمة (ar.json, en.json)
│   └── actions/          # Server Actions للتعامل مع البيانات
├── backend/              # كود الخادم الخلفي (Express)
│   ├── routes/           # مسارات الـ API
│   ├── utils/            # أدوات مساعدة (مثل تحليل PDF)
│   └── server.js         # نقطة الدخول للخادم
├── ai-server/            # كود خادم الذكاء الاصطناعي (Flask)
│   ├── modules/          # وحدات المعالجة (transcribe, refine)
│   └── server.py         # نقطة الدخول للخادم
├── public/               # الملفات العامة (صور، أيقونات)
└── ... (ملفات الإعدادات مثل package.json, next.config.js)
```

---

## 5. دليل النشر (Deployment Guide)

لرفع المشروع على سيرفر (VPS مثل Ubuntu)، ستحتاج لتشغيل الخدمات الثلاث بشكل متزامن.

### المتطلبات المسبقة على السيرفر:
1.  **Node.js:** إصدار 18 أو أحدث.
2.  **Python:** إصدار 3.10 أو أحدث.
3.  **مدير عمليات (Process Manager):** يفضل استخدام `PM2` لإدارة تشغيل الخدمات في الخلفية.
4.  **FFmpeg:** ضروري لمكتبة Whisper لمعالجة الصوت.

### خطوات الإعداد:

#### 1. إعداد المتغيرات البيئية (.env)
تأكد من وجود ملف `.env` في المجلد الرئيسي يحتوي على مفاتيح Supabase وإعدادات الاتصال:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:5000  # رابط الـ Backend
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:5002 # رابط الـ AI Server
```

#### 2. تشغيل الـ Frontend (Next.js)
```bash
# تثبيت المكتبات
npm install

# بناء المشروع
npm run build

# التشغيل باستخدام PM2
pm2 start npm --name "frontend" -- start
# أو إذا كنت تستخدم المنفذ الافتراضي 3000
```

#### 3. تشغيل الـ Backend (Node.js)
```bash
cd backend
npm install

# التشغيل باستخدام PM2 (تأكد من تحديد المنفذ، عادة 5000)
pm2 start server.js --name "backend"
```

#### 4. تشغيل الـ AI Server (Python)
```bash
cd ai-server

# إنشاء بيئة افتراضية (اختياري لكن مفضل)
python3 -m venv venv
source venv/bin/activate  # في Linux/Mac
# venv\Scripts\activate   # في Windows

# تثبيت المكتبات
pip install -r requirements.txt

# التشغيل باستخدام PM2 (استدعاء بايثون مباشرة)
pm2 start server.py --name "ai-server" --interpreter python3
```

### 5. إعداد Nginx (Reverse Proxy)
يفضل استخدام Nginx لتوجيه الطلبات القادمة للسيرفر إلى المنافذ الصحيحة:
- النطاق الرئيسي (example.com) -> يوجه إلى المنفذ 3000 (Frontend).
- `/api/backend` -> يوجه إلى المنفذ 5000.
- `/api/ai` -> يوجه إلى المنفذ 5002.

---

## 6. ملاحظات هامة
*   **قاعدة البيانات:** تأكد من تطبيق سياسات الأمان (RLS) في Supabase لحماية البيانات.
*   **CORS:** تأكد من إعداد سياسات CORS في الـ Backend و AI Server للسماح للـ Frontend بالاتصال بهم (تم إعدادها مسبقاً لتقبل `*` أو المتغير `CORS_ORIGIN`).
*   **النماذج:** نماذج الذكاء الاصطناعي (مثل Whisper) قد تحتاج لمساحة ذاكرة (RAM) جيدة ومعالج قوي، تأكد من مواصفات السيرفر.

---

تم إعداد هذا الملف لتوضيح بنية المشروع وتسهيل عملية النشر.
