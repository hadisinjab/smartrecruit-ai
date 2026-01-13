# تقرير تحليل وظائف المشروع (الجزء الثاني)

## Applicant Form - Multi-Step Navigation (3 وظائف):
1. **Applicants can move forward between steps only (no backward navigation)**
   - **غير موجود** ❌
   - الملاحظة: الكود يحتوي على زر `handlePrevious` مما يسمح بالعودة للخلف.

2. **Each page saves data instantly when 'Next' is clicked**
   - **غير موجود** ❌
   - الملاحظة: يتم حفظ التقدم (Tracking) ولكن إجابات النموذج لا تُحفظ في قاعدة البيانات إلا عند الإرسال النهائي (`submitApplication`). لا يوجد حفظ تدريجي للإجابات.

3. **Applicant progress is saved even if form is not completed**
   - **موجود** ✅
   - الكود: يتم تسجيل أحداث التقدم عبر `recordProgress` ويمكن للمسؤولين رؤية أين توقف المتقدم في صفحة "Incomplete Applications".

## Applicant Form - Incomplete Applications (2 وظائف):
4. **Incomplete applications are labeled with Status: Incomplete**
   - **غير موجود** ❌
   - الملاحظة: التطبيقات غير المكتملة تظهر بحالة `new` أو `duplicate` مع عدم وجود تاريخ تسليم (`submitted_at: null`). لا توجد حالة صريحة باسم "Incomplete" في قاعدة البيانات.

5. **Incomplete applications are visible in dedicated 'Incomplete Applications' section**
   - **موجود** ✅
   - الكود: الصفحة `src/app/[locale]/admin/incomplete/page.tsx` مخصصة لعرض هذه الطلبات.

## Applicant Form - Voice Questions (5 وظائف):
6. **Recording starts before candidate sees the question**
   - **موجود** ✅
   - الكود: السؤال مخفي (`isRevealed = false`) ويظهر فقط عند استدعاء `startRecording`.

7. **Candidate can click 'Show Question' button while recording continues**
   - **غير موجود** ❌
   - الملاحظة: السؤال يظهر تلقائياً بمجرد بدء التسجيل، ولا يوجد زر يدوي لإظهاره.

8. **Recording is automatically limited by configured timer**
   - **موجود** ✅
   - الكود: المؤقت يوقف التسجيل تلقائياً عند انتهاء الوقت (`stopAndFinalize(true)`).

9. **Candidate cannot redo or repeat a voice question**
   - **موجود** ✅
   - الكود: يتم تعطيل زر التسجيل بعد المحاولة الأولى، وتظهر رسالة تحذير "You cannot re-record once you stop".

10. **Clear UI warning displayed: 'Recording will begin immediately...'**
    - **موجود** ✅
    - الكود: تظهر رسالة "The question will appear when you start recording" و "timer will start automatically".

## Applicant Form - Notifications & Messaging (2 وظائف):
11. **System shows lightweight success notifications that don't interrupt flow**
    - **غير موجود** ❌
    - الملاحظة: لا يتم استخدام نظام التنبيهات (Toast) أثناء التنقل بين خطوات النموذج.

12. **System displays: 'Completing more pages increases your chances'**
    - **غير موجود** ❌
    - الملاحظة: النص غير موجود في ملفات المشروع.

## Resume Upload (4 وظائف):
13. **Applicants can upload resume in PDF format**
    - **موجود** ✅
    - الكود: `questions.tsx` يقبل `application/pdf`.

14. **Applicants can upload resume in Word (.doc, .docx) format**
    - **موجود** ✅
    - الكود: `questions.tsx` يقبل صيغ Word.

15. **System rejects files larger than configured max size**
    - **موجود** ✅
    - الكود: يتم التحقق من حجم الملف ومقارنته بـ `maxFileSize`.

16. **System rejects non-PDF/Word files with error message**
    - **موجود** ✅
    - الكود: يتم عرض رسالة تنبيه عند اختيار نوع ملف غير مدعوم.

## Resume Parsing - Data Extraction (9 وظائف):
17. **System extracts work experience from resume**
    - **موجود** ✅
    - الكود: `backend/utils/parseResume.js` يستخرج `work_experience`.

18. **System extracts education from resume**
    - **موجود** ✅
    - الكود: يستخرج `education`.

19. **System extracts skills from resume**
    - **موجود** ✅
    - الكود: يستخرج `skills`.

20. **System extracts tools and technologies from resume**
    - **موجود** ✅
    - الكود: تندرج تحت `technologies` في الخبرات والمشاريع.

21. **System extracts certifications from resume**
    - **موجود** ✅
    - الكود: يستخرج `certifications`.

22. **System extracts languages from resume**
    - **موجود** ✅
    - الكود: يستخرج `languages`.

23. **System extracts achievements from resume**
    - **غير موجود** ❌
    - الملاحظة: هيكلية البيانات (`validateParsedData`) لا تتضمن حقلاً مخصصاً للإنجازات (Achievements).

24. **Extracted resume data is stored in structured form**
    - **موجود** ✅
    - الكود: البيانات تحفظ بتنسيق JSON.

25. **Raw extracted resume data is saved for fallback**
    - **غير موجود** ❌
    - الملاحظة: يتم حفظ الملف الأصلي والبيانات المهيكلة، ولكن النص الخام المستخرج لا يُحفظ في قاعدة البيانات.

## Voice Processing (5 وظائف):
26. **System transcribes voice answers to raw transcript**
    - **موجود** ✅
    - الكود: يتم تحويل الصوت لنص باستخدام Whisper.

27. **System generates cleaned transcript with improved punctuation and clarity**
    - **موجود** ✅
    - الكود: يتم تحسين النص (`clean_transcript`).

28. **System supports Arabic and English speech recognition**
    - **موجود** ✅
    - الكود: يدعم تعدد اللغات.

29. **System handles embedded English terms in Arabic speech**
    - **موجود** ✅
    - الكود: نموذج Whisper يتعامل مع الـ Code-switching بكفاءة.

30. **Both raw and cleaned transcripts are stored in database**
    - **موجود** ✅
    - الكود: يتم حفظ النسختين في جدول `transcriptions` أو `answers`.
