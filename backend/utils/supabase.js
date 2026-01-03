/**
 * إعداد عميل Supabase وتقديم دوال مساعدة للتعامل مع التخزين وقواعد البيانات.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'resumes';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'تحذير: متغيرات Supabase غير مكتملة (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

/**
 * رفع ملف إلى التخزين.
 * @param {string} bucket
 * @param {string} filePath
 * @param {Buffer|Uint8Array} body
 * @param {{contentType?: string, upsert?: boolean}} [options]
 * @returns {Promise<{path: string}>}
 */
export async function storageUpload(bucket = DEFAULT_BUCKET, filePath, body, options = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, body, {
      contentType: options.contentType || 'application/octet-stream',
      upsert: options.upsert ?? true,
    });
  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }
  return data;
}

/**
 * تنزيل ملف من التخزين.
 * @param {string} bucket
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
export async function storageDownload(bucket = DEFAULT_BUCKET, filePath) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error) {
    throw Object.assign(new Error(error.message), { status: 404 });
  }
  // في Node قد يكون data عبارة عن ReadableStream أو Blob حسب الإصدارات
  if (typeof data.arrayBuffer === 'function') {
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  }
  // محاولة عامة
  return Buffer.from(await data.text());
}

/**
 * حذف ملف من التخزين.
 * @param {string} bucket
 * @param {string|string[]} filePath
 * @returns {Promise<void>}
 */
export async function storageRemove(bucket = DEFAULT_BUCKET, filePath) {
  const files = Array.isArray(filePath) ? filePath : [filePath];
  const { error } = await supabase.storage.from(bucket).remove(files);
  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }
}

/**
 * استعلام عام من جدول.
 * @param {string} table
 * @param {string} [columns]
 * @param {Record<string, any>} [match]
 */
export async function dbSelect(table, columns = '*', match = {}) {
  let query = supabase.from(table).select(columns);
  if (match && Object.keys(match).length) {
    query = query.match(match);
  }
  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

/**
 * إدراج سجل.
 * @param {string} table
 * @param {Record<string, any>|Record<string, any>[]} payload
 */
export async function dbInsert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

/**
 * تحديث سجل.
 * @param {string} table
 * @param {Record<string, any>} match
 * @param {Record<string, any>} payload
 */
export async function dbUpdate(table, match, payload) {
  const { data, error } = await supabase.from(table).update(payload).match(match).select();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

/**
 * حذف سجل.
 * @param {string} table
 * @param {Record<string, any>} match
 */
export async function dbDelete(table, match) {
  const { data, error } = await supabase.from(table).delete().match(match).select();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

