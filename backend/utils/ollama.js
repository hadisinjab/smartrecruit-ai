/**
 * واجهة بديلة لـ Ollama تستخدم AI Server (Hugging Face) للتوليد.
 * تم استبدال مكتبة Ollama المحلية بطلبات HTTP للخادم البعيد.
 */
import axios from 'axios';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5001';
const API_KEY = process.env.BACKEND_API_KEY || process.env.AI_API_KEY;

if (!API_KEY) {
  console.error('[Ollama] Warning: BACKEND_API_KEY (or AI_API_KEY) is not set! AI requests will likely fail with 401.');
} else {
  console.log('[Ollama] API Key is configured (Length:', API_KEY.length, ')');
}

/**
 * توليد نص عام باستخدام AI Server.
 * @param {string} prompt
 * @param {{system?: string, temperature?: number, max_tokens?: number}} [options]
 * @returns {Promise<string>}
 */
export async function generateText(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw Object.assign(new Error('Prompt غير صالح'), { status: 400 });
  }

  try {
    const fullPrompt = options.system ? `${options.system}\n\n${prompt}` : prompt;
    
    const response = await axios.post(`${AI_SERVER_URL}/api/generate`, {
      prompt: fullPrompt,
      options: {
        temperature: options.temperature,
        max_new_tokens: options.max_tokens
      }
    }, {
      headers: API_KEY ? { 'x-api-key': API_KEY } : {},
      timeout: 60000 // 60 seconds timeout for generation
    });

    if (response.data && response.data.success) {
      return response.data.response;
    } else {
      throw new Error(response.data?.message || 'AI Server Error');
    }

  } catch (e) {
    console.error('AI Generation Error:', e.message);
    const err = e instanceof Error ? e : new Error(String(e));
    err.status = (e.response && e.response.status) || 500;
    throw err;
  }
}

/**
 * توليد مخرجات بصيغة JSON باستخدام AI Server.
 * يقوم بتعديل الـ Prompt لطلب JSON صريح.
 * @param {string} prompt
 * @param {{schema?: Record<string, any>, temperature?: number, max_tokens?: number}} [options]
 * @returns {Promise<any>}
 */
export async function generateJSON(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw Object.assign(new Error('Prompt غير صالح'), { status: 400 });
  }

  // تحسين الـ Prompt لضمان خروج JSON
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return only a valid JSON object. Do not include markdown formatting like \`\`\`json.`;

  try {
    const text = await generateText(jsonPrompt, {
      ...options,
      temperature: options.temperature ?? 0.1 // حرارة منخفضة للدقة
    });

    // محاولة تنظيف النص من أي زيادات (مثل Markdown code blocks)
    let cleanText = (text || '').trim();
    if (!cleanText) {
       console.warn('[Ollama] Received empty text from generation');
       return {}; // Return empty object instead of failing
    }
    
    if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
    else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
    
    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.warn('JSON Parse failed, attempting to fix...', cleanText);
      // محاولة استخراج JSON إذا كان مضمناً في نص
      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) { /* ignore nested parse error */ }
      }
      
      // Last resort: try to fix common JSON errors (e.g. trailing commas)
      // For now, just return partial if possible or empty
      return { raw_output: cleanText, error: "JSON Parse Failed" };
    }
  } catch (e) {
    console.error('JSON Generation Failed:', e.message);
    // إرجاع كائن فارغ أو رمي الخطأ حسب الحاجة، هنا نرمي الخطأ ليتم التعامل معه في evaluation.js
    throw Object.assign(new Error('فشل توليد JSON'), { status: 502, details: e.message });
  }
}
