/**
 * دوال عامة للتعامل مع Ollama: توليد نص وتوليد JSON باستخدام النموذج المحدد.
 */
import ollama from 'ollama';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

/**
 * توليد نص عام من Ollama.
 * @param {string} prompt
 * @param {{system?: string, temperature?: number, max_tokens?: number}} [options]
 * @returns {Promise<string>}
 */
export async function generateText(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw Object.assign(new Error('Prompt غير صالح'), { status: 400 });
  }
  try {
    const res = await ollama.generate({
      host: OLLAMA_HOST,
      model: OLLAMA_MODEL,
      prompt,
      system: options.system,
      options: {
        temperature: options.temperature ?? 0.2,
        num_predict: options.max_tokens ?? 512,
      },
      stream: false,
    });
    if (!res || typeof res.response !== 'string') {
      throw Object.assign(new Error('استجابة غير متوقعة من Ollama'), { status: 502 });
    }
    return res.response.trim();
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    err.status = err.status || 500;
    throw err;
  }
}

/**
 * توليد مخرجات بصيغة JSON من Ollama عبر format: "json".
 * @param {string} prompt
 * @param {{schema?: Record<string, any>, temperature?: number, max_tokens?: number}} [options]
 * @returns {Promise<any>}
 */
export async function generateJSON(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw Object.assign(new Error('Prompt غير صالح'), { status: 400 });
  }
  try {
    const res = await ollama.generate({
      host: OLLAMA_HOST,
      model: OLLAMA_MODEL,
      prompt,
      format: 'json',
      options: {
        temperature: options.temperature ?? 0,
        num_predict: options.max_tokens ?? 512,
      },
      stream: false,
    });
    const raw = typeof res?.response === 'string' ? res.response : '';
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      throw Object.assign(new Error('فشل تحليل JSON من استجابة Ollama'), { status: 502 });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    err.status = err.status || 500;
    throw err;
  }
}
