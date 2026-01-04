# Supabase Storage Buckets Setup

## المطلوب: إنشاء Storage Buckets

يجب إنشاء الـ buckets التالية في Supabase Storage:

### 1. Bucket: `files` (أو `resumes`)
- **الاسم:** `files` أو `resumes`
- **الوصف:** لتخزين ملفات السيرة الذاتية والملفات المرفوعة
- **Public:** نعم (للوصول العام للملفات)
- **File size limit:** حسب الحاجة (مثلاً 10MB)
- **Allowed MIME types:** 
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `image/*`
  - `text/*`

### 2. Bucket: `voice-recordings`
- **الاسم:** `voice-recordings`
- **الوصف:** لتخزين تسجيلات الصوت
- **Public:** نعم
- **File size limit:** حسب الحاجة (مثلاً 50MB)
- **Allowed MIME types:**
  - `audio/webm`
  - `audio/mp4`
  - `audio/*`

## خطوات الإنشاء:

1. افتح Supabase Dashboard
2. اذهب إلى **Storage** في القائمة الجانبية
3. اضغط على **New bucket**
4. أدخل اسم الـ bucket (مثلاً `files`)
5. اختر **Public bucket** إذا كنت تريد الوصول العام
6. اضغط **Create bucket**

## ملاحظات:

- إذا كان الـ bucket `files` غير موجود، سيحاول النظام استخدام `resumes`
- إذا كان كلا الـ buckets غير موجودة، سيحاول استخدام `voice-recordings` كـ fallback
- إذا فشلت كل المحاولات، سيظهر رسالة خطأ واضحة للمستخدم

## RLS Policies (Row Level Security):

تأكد من إضافة Policies للـ buckets:

```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'files');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'files' AND auth.role() = 'authenticated'
);

-- Allow public upload (if needed)
CREATE POLICY "Public upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'files');
```















