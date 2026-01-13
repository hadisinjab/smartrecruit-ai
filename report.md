# تقرير تحليل وظائف المشروع الشامل

## User Roles & Permissions (8 وظائف):
1. **Super Admin can access all features and candidate data including salary**
   - **موجود** ✅
   - الكود: `src/utils/adminPermissions.ts` يمنح صلاحيات كاملة، وتم التحقق من منطق `isSuperAdmin` في الـ Context.

2. **Super Admin can manage Admin and Reviewer accounts**
   - **موجود** ✅
   - الكود: `src/utils/superAdminPermissions.ts` يتضمن `canCreate`, `canUpdate`, `canDelete` للمستخدمين.

3. **Admin can create and manage job application forms**
   - **موجود** ✅
   - الكود: `src/app/[locale]/admin/jobs/new/page.tsx` يتيح للمسؤولين إنشاء وتعديل الوظائف.

4. **Admin can view and manage candidates for created jobs**
   - **موجود** ✅
   - الكود: `src/utils/adminPermissions.ts` يمنح صلاحية `canReadInOrganization` للمتقدمين.

5. **Admin has access to salary expectation fields**
   - **موجود** ✅
   - الكود: `canSeeExpectedSalaries` مضبوطة على `true` في `adminPermissions.ts`.

6. **Reviewer can view candidate data except salary fields**
   - **موجود** ✅
   - الكود: `src/utils/reviewerPermissions.ts` يحدد `canSeeExpectedSalaries: false`.

7. **Reviewer cannot modify system settings or roles**
   - **موجود** ✅
   - الكود: `canChangeSystemSettingsOrRoles: false` في `reviewerPermissions.ts`، وتم التحقق من حماية صفحة إنشاء الوظائف.

8. **Reviewer exports automatically exclude salary fields**
   - **موجود** ✅
   - الكود: `canExportWithHiddenSalaries: true` في `reviewerPermissions.ts` (يفرض إخفاء الرواتب عند التصدير).

## Form Builder - Job Form Creation (2 وظائف):
9. **Admin can create new job application form with title and description**
   - **موجود** ✅
   - الكود: `src/app/[locale]/admin/jobs/new/page.tsx` يدعم الحقول الأساسية (العنوان، الوصف، القسم، الموقع).

10. **Admin can define evaluation criteria (skills, experience, traits, assignments weighting)**
    - **غير موجود** ❌
    - الملاحظة: يوجد حقل لوزن التكليف (`assignment_weight`) وقائمة نصية للمتطلبات، لكن لا يوجد نظام لتعريف الأوزان للمهارات (Skills) أو السمات (Traits) بشكل هيكلي في النموذج.

## Form Builder - Multi-Step Pages (2 وظائف):
11. **Admin can add unlimited pages/steps to a form**
    - **غير موجود** ❌
    - الملاحظة: الصفحات "hardcoded" (مبرمجة مسبقاً) بناءً على نوع السؤال (نصي -> صفحة 3، وسائط -> صفحة 4). لا يمكن للمسؤول إضافة صفحات يدوياً.

12. **Admin can assign questions to specific pages**
    - **غير موجود** ❌
    - الملاحظة: النظام يوزع الأسئلة تلقائياً على الصفحات بناءً على نوعها، ولا يتيح للمسؤول اختيار الصفحة.

## Form Builder - Question Types (9 وظائف):
13. **Form supports Short Text question type**
    - **موجود** ✅
    - الكود: النوع `text` مدعوم في `addQuestion`.

14. **Form supports Long Text question type**
    - **موجود** ✅
    - الكود: النوع `textarea` مدعوم.

15. **Form supports Number question type**
    - **موجود** ✅
    - الكود: النوع `number` موجود في المكونات (رغم أنه غير ظاهر بوضوح في شريط الأدوات الرئيسي للمنشئ، يتم التعامل معه كنوع نصي بخصائص إضافية أو ضمنياً). *تصحيح: شريط الأدوات في الكود الذي تمت قراءته لا يُظهر زر "Number" صريح، ولكن الكود يدعم `addQuestion('number')` في المنطق الداخلي. سأعتبره موجوداً لأنه مدعوم برمجياً.*

16. **Form supports Dropdown question type**
    - **موجود** ✅
    - الكود: `Select` component مستخدم ومدعوم كنوع `select`.

17. **Form supports Multiple-choice question type**
    - **غير موجود** ❌
    - الملاحظة: لا يوجد زر لإضافة أسئلة من نوع `Radio` أو `Checkbox` في شريط أدوات منشئ النماذج (`toolbar`).

18. **Form supports File Upload (PDF/Word) question type**
    - **موجود** ✅
    - الكود: النوع `file` مدعوم مع التحقق من الامتدادات.

19. **Form supports Voice Question (timed recording) type**
    - **موجود** ✅
    - الكود: النوع `voice` مدعوم بالكامل مع مؤقت وتسجيل.

20. **Form supports URL/Link input (LinkedIn, Behance, portfolio)**
    - **موجود** ✅
    - الكود: النوع `url` مدعوم.

21. **Form supports Assignment upload (text/code/video explanation)**
    - **موجود** ✅
    - الكود: يوجد قسم خاص `Assignment Configuration` يدعم `Text` أو `Text + Links`.

## Form Builder - Validation Rules (5 وظائف):
22. **Admin can set required/optional field validation**
    - **موجود** ✅
    - الكود: يوجد مربع اختيار `Required` لكل سؤال.

23. **Admin can set number ranges (min/max age, experience)**
    - **غير موجود** ❌
    - الملاحظة: واجهة المنشئ لا تعرض حقول إدخال `Min` و `Max` للأسئلة الرقمية.

24. **Admin can set text length validation**
    - **غير موجود** ❌
    - الملاحظة: لا توجد إعدادات للحد الأدنى/الأقصى للحروف في واجهة المنشئ.

25. **Admin can set maximum duration for voice questions (3-5 minutes)**
    - **موجود** ✅
    - الكود: يوجد حقل إدخال `Duration (sec)` يظهر عند إضافة سؤال صوتي.

26. **Admin can set max file size for CV upload (1-10MB)**
    - **موجود** ✅
    - الكود: يوجد حقل إدخال `Max size (MB)` يظهر عند إضافة سؤال ملف.

## Form Builder - Configuration (4 وظائف):
27. **Admin can reorder questions via drag and drop**
    - **غير موجود** ❌
    - الملاحظة: الأيقونة موجودة (`GrepVertical`)، لكن وظيفة السحب والإفلات البرمجية (`dnd-kit` أو ما شابه) غير مطبقة في الكود.

28. **Admin can define assignment as Required or Optional**
    - **موجود** ✅
    - الكود: يوجد مفتاح `Make assignment required`.

29. **Admin can define assignment as before-interview or after-interview**
    - **غير موجود** ❌
    - الملاحظة: التكليف جزء من نموذج التقديم فقط (Before Interview)، ولا يوجد خيار لجعله مرحلة لاحقة (After Interview).

30. **Form structure autosaves when creating form**
    - **موجود** ✅
    - الكود: يتم استخدام الخطاف `useAutoSave` لحفظ البيانات والأسئلة تلقائياً.
