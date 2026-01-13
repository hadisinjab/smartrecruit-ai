# تقرير تحليل وظائف المشروع (الجزء الرابع)

## AI Evaluation Engine - Evaluation Criteria (5 وظائف):
1. **HR can define required skills for evaluation**
   - **موجود** ✅
   - الكود: `job_forms.evaluation_criteria.required_skills` مستخدم في `evaluation.js`.

2. **HR can define required experience for evaluation**
   - **غير موجود** ❌
   - الملاحظة: لا يوجد حقل مخصص لسنوات الخبرة في `evaluation_criteria` في صفحة إنشاء الوظيفة، فقط `requirements` كنص عام.

3. **HR can define personality traits for evaluation**
   - **غير موجود** ❌
   - الملاحظة: لا يوجد مدخلات لتحديد السمات الشخصية (Traits) في واجهة إنشاء الوظيفة.

4. **HR can define required responsibilities for evaluation**
   - **موجود** ✅
   - الكود: يتم استنتاجها من `job_description` والـ `requirements` النصية.

5. **HR can set weighting for assignments in evaluation**
   - **موجود** ✅
   - الكود: حقل `assignment_weight` موجود ويتم تمريره لعملية التقييم.

## AI Evaluation Engine - Match Scoring (1 وظيفة):
6. **System generates Match Score (0-100%) for each candidate**
   - **موجود** ✅
   - الكود: `match_score` و `overall_score` يتم حسابها في `evaluation.js` و `analyzeInterview.js`.

## AI Evaluation Engine - Scoring Details (6 وظائف):
7. **System provides detailed reasoning for each score**
   - **موجود** ✅
   - الكود: مخرجات الـ JSON من الذكاء الاصطناعي تتضمن `specific_feedback` و `answer_evaluation`.

8. **System lists candidate strengths in evaluation**
   - **موجود** ✅
   - الكود: مصفوفة `strengths` مستخرجة.

9. **System lists candidate weaknesses in evaluation**
   - **موجود** ✅
   - الكود: مصفوفة `weaknesses` مستخرجة.

10. **System identifies missing requirements in evaluation**
    - **موجود** ✅
    - الكود: `missing_critical_skills` يتم استخراجها في تحليل السيرة الذاتية.

11. **System provides timestamps of hesitation or weak answers**
    - **غير موجود** ❌
    - الملاحظة: التحليل يقيس وقت البدء (`time_to_answer`) ولكنه لا يحدد لحظات التردد داخل الإجابة نفسها (Timestamps of hesitation).

12. **System automatically ranks candidates for interview prioritization**
    - **غير موجود** ❌
    - الملاحظة: لا توجد وظيفة ترتيب تلقائي (Ranking/Sorting) بناءً على النتيجة في واجهة المرشحين (يتم الفرز حسب التاريخ افتراضياً).

## AI Evaluation Engine - Assignment Evaluation (4 وظائف):
13. **System evaluates code quality for coding assignments**
    - **موجود** ✅
    - الكود: `evaluateAssignment.js` يدعم نوع `code` ويقيم `code_quality`.

14. **System evaluates solution accuracy for assignments**
    - **موجود** ✅
    - الكود: يقيم `problem_solving` و `correctness`.

15. **System evaluates explanation clarity from assignment videos**
    - **موجود** ✅
    - الكود: يقيم `communication` و `clarity` للفيديو.

16. **System evaluates speed and reasoning in assignments**
    - **موجود جزئياً** ⚠️
    - الملاحظة: يقيم المنطق (`reasoning`) لكنه لا يستطيع قياس السرعة (`speed`) لأن التكليف يُرفع كملف/رابط ولا يتم تتبع وقت التنفيذ الفعلي.

## AI Evaluation Engine - Re-evaluation (2 وظائف):
17. **Admin can trigger re-evaluation of candidate scores**
    - **غير موجود** ❌
    - الملاحظة: لا يوجد زر أو مسار API مكشوف في الواجهة لإعادة تشغيل التقييم (`re-evaluate`).

18. **Re-evaluation overwrites previous AI evaluation (no history kept)**
    - **غير موجود** ❌
    - الملاحظة: بما أن وظيفة إعادة التقييم غير مفعلة، فإن سلوك الكتابة الفوقية غير موجود أيضاً.

## Interview Question Generator (6 وظائف):
19. **System generates adaptive interview questions for each candidate**
    - **غير موجود** ❌
    - الملاحظة: لا يوجد كود لتوليد أسئلة مقابلة مستقبلية بناءً على تحليل المرشح.

20. **Questions are based on resume data and missing information**
    - **غير موجود** ❌

21. **Questions are based on job key skill requirements**
    - **غير موجود** ❌

22. **Questions are based on employer-defined evaluation criteria**
    - **غير موجود** ❌

23. **System avoids basic questions if skill already mentioned in resume**
    - **غير موجود** ❌

24. **System generates probing questions for missing skills**
    - **غير موجود** ❌

## Recommendations (5 وظائف):
25. **System recommends 'Proceed to Interview' for candidates**
    - **موجود** ✅
    - الكود: حقل `recommendation` في نتيجة التقييم يعيد قيم مثل 'Pass'.

26. **System recommends 'Make Offer' for candidates**
    - **موجود** ✅
    - الكود: مدعوم كجزء من منطق التوصية.

27. **System recommends 'Reject' for candidates**
    - **موجود** ✅
    - الكود: مدعوم.

28. **Recommendations are customizable per job role**
    - **غير موجود** ❌
    - الملاحظة: منطق التوصية ثابت في الكود ولا يمكن تخصيص عتبات النجاح (Thresholds) لكل وظيفة.

29. **Recommendations include detailed reasoning**
    - **موجود** ✅
    - الكود: التوصية مصحوبة بملخص (`summary`) ومبررات.

## Admin Dashboard - Job Display & Management (6 وظائف):
30. **Dashboard displays all job postings separately**
    - **موجود** ✅
    - الكود: صفحة `src/app/[locale]/admin/jobs/page.tsx` تعرض قائمة الوظائف.

31. **Each job has its own isolated candidate list**
    - **موجود** ✅
    - الكود: يمكن تصفية المرشحين حسب الوظيفة (`selectedJobId`).

32. **Candidates are not mixed across different job posts**
    - **موجود** ✅
    - الكود: الفرز الافتراضي يفصل القوائم عند الاختيار.

33. **Admin can create new job application forms from dashboard**
    - **موجود** ✅
    - الكود: زر `Create Job` يعمل.

34. **Admin can edit job application forms from dashboard**
    - **موجود** ✅
    - الكود: زر `Edit` موجود.

35. **Admin can delete job application forms from dashboard**
    - **موجود** ✅
    - الكود: زر `Trash` (حذف) موجود.

## Admin Dashboard - Applicant List (1 وظيفة):
36. **Dashboard displays list of applicants per job**
    - **موجود** ✅
    - الكود: صفحة `CandidatesPage` تعرض القائمة مع خيارات الفلترة.
