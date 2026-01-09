
/**
 * Utility to parse resumes (PDF/DOCX) into structured JSON using Ollama.
 * - Extracts text via pdf-parse or mammoth
 * - Cleans text
 * - Sends to Ollama with strict JSON prompt
 * - Validates and normalizes structure
 * - Calculates confidence score
 * - Returns standardized result object
 */
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
// import { generateJSON, generateText } from './ollama.js'; // Replaced with Hugging Face API

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

/**
 * Extract text from PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(buffer) {
  console.log('Parsing PDF...');
  try {
    const result = await pdfParse(buffer);
    const text = typeof result?.text === 'string' ? result.text : '';
    return text;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('PDF parsing failed:', e.message);
    throw Object.assign(new Error('PDF parsing failed'), { details: e.message });
  }
}

/**
 * Extract text from DOCX buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFromDOCX(buffer) {
  console.log('Parsing DOCX...');
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = typeof result?.value === 'string' ? result.value : '';
    return text;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('DOCX parsing failed:', e.message);
    throw Object.assign(new Error('DOCX parsing failed'), { details: e.message });
  }
}

/**
 * Clean extracted text: trim and collapse excessive spaces.
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  // Preserve newlines, but normalize spaces within lines
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/\u00A0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim()
    );
  // Remove consecutive empty lines
  const normalized = lines.filter((l, idx, arr) => !(l === '' && arr[idx - 1] === '')).join('\n');
  return normalized;
}

/**
 * Parse resume text using Hugging Face AI Server CV analysis endpoint
 * @param {string} text
 * @param {number} [retries=2]
 * @returns {Promise<{ data?: any, raw?: string }>}
 */
async function parseWithAI(text, retries = 2) {
  const apiKey = process.env.BACKEND_API_KEY;
  if (!apiKey) {
    throw new Error('BACKEND_API_KEY is not set');
  }

  const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:5001';
  
  const analysisData = {
    cv_text: text,
    extract_structure: true
  };

  let lastError = '';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Sending to AI Server for CV analysis (attempt ${attempt + 1})...`);
      const tStart = Date.now();
      
      const response = await fetch(`${AI_SERVER_URL}/api/analyze-cv`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey 
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'CV analysis failed');
      }

      console.log(`AI Server responded in ${(Date.now() - tStart) / 1000}s`);
      return { data: result.analysis };

    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const connError =
        /ECONNREFUSED|ENOTFOUND|fetch failed|Failed to fetch|socket hang up/i.test(e.message);
      
      if (connError) {
        console.error('AI Server unavailable:', e.message);
        throw Object.assign(new Error('AI Server unavailable'), { details: e.message });
      }
      
      console.warn(`CV analysis failed (attempt ${attempt + 1}):`, e.message);
      lastError = e.message;
      
      if (attempt < retries) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  // Fallback to basic parsing if AI server fails
  console.warn('AI Server failed, using fallback basic parsing...');
  return {
    data: {
      personal_info: { name: null, email: null, phone: null, location: null },
      summary: "Fallback parsing - AI server unavailable",
      work_experience: [],
      education: [],
      skills: { technical: [], languages: [], soft_skills: [] },
      certifications: [],
      projects: [],
      languages: []
    }
  };
}

/**
 * Slice text to the first balanced JSON object if extra text exists.
 * @param {string} raw
 * @returns {string}
 */
function sliceToFirstJsonObject(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in response');
  }
  let balance = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') balance++;
    else if (ch === '}') balance--;
    if (balance === 0) {
      const candidate = cleaned.slice(start, i + 1);
      return candidate;
    }
  }
  throw new Error('Unbalanced JSON braces in response');
}

/**
 * Validate and normalize parsed data to the expected schema.
 * @param {any} data
 * @returns {{ valid: boolean, data: any, errors: string[] }}
 */
function validateParsedData(data) {
  const errors = [];
  const safeArr = (v) => (Array.isArray(v) ? v : []);
  const safeStr = (v) => (typeof v === 'string' ? v : v == null ? null : String(v));
  const safeNullable = (v) => (v == null ? null : v);

  const normalized = {
    personal_info: {
      name: safeStr(data?.personal_info?.name) ?? null,
      email: safeStr(data?.personal_info?.email) ?? null,
      phone: safeStr(data?.personal_info?.phone) ?? null,
      location: safeStr(data?.personal_info?.location) ?? null,
      linkedin: safeStr(data?.personal_info?.linkedin) ?? null,
      portfolio: safeStr(data?.personal_info?.portfolio) ?? null,
    },
    summary: safeStr(data?.summary) ?? null,
    work_experience: safeArr(data?.work_experience).map((w) => ({
      company: safeStr(w?.company) ?? '',
      position: safeStr(w?.position) ?? '',
      start_date: safeStr(w?.start_date) ?? '',
      end_date: safeStr(w?.end_date) ?? '',
      description: safeStr(w?.description) ?? '',
      technologies: safeArr(w?.technologies),
    })),
    education: safeArr(data?.education).map((e) => ({
      institution: safeStr(e?.institution) ?? '',
      degree: safeStr(e?.degree) ?? '',
      field: safeStr(e?.field) ?? '',
      start_date: safeStr(e?.start_date) ?? '',
      end_date: safeStr(e?.end_date) ?? '',
      gpa: safeNullable(e?.gpa),
    })),
    skills: {
      technical: safeArr(data?.skills?.technical),
      languages: safeArr(data?.skills?.languages),
      soft_skills: safeArr(data?.skills?.soft_skills),
    },
    certifications: safeArr(data?.certifications).map((c) => ({
      name: safeStr(c?.name) ?? '',
      issuer: safeStr(c?.issuer) ?? '',
      date: safeStr(c?.date) ?? '',
      credential_id: safeNullable(c?.credential_id),
    })),
    projects: safeArr(data?.projects).map((p) => ({
      name: safeStr(p?.name) ?? '',
      description: safeStr(p?.description) ?? '',
      technologies: safeArr(p?.technologies),
      url: safeNullable(p?.url),
    })),
    languages: safeArr(data?.languages).map((l) => ({
      language: safeStr(l?.language) ?? '',
      proficiency: safeStr(l?.proficiency) ?? '',
    })),
  };

  // Basic structural checks
  if (!normalized || typeof normalized !== 'object') {
    errors.push('Parsed data is not an object');
  }
  if (!('personal_info' in normalized)) errors.push('Missing personal_info');
  if (!('skills' in normalized)) errors.push('Missing skills');

  const valid = errors.length === 0;
  return { valid, data: normalized, errors };
}

/**
 * Calculate confidence score based on data completeness.
 * @param {any} parsedData
 * @returns {number} value between 0 and 1
 */
function calculateConfidence(parsedData) {
  // Weights across sections
  const weights = {
    personal_info: 0.2,
    summary: 0.1,
    work_experience: 0.35,
    education: 0.15,
    skills: 0.1,
    other: 0.1, // certifications, projects, languages
  };

  const pi = parsedData.personal_info || {};
  const piFields = ['name', 'email', 'phone', 'location', 'linkedin', 'portfolio'];
  const piFilled = piFields.reduce((acc, k) => acc + (isFilled(pi[k]) ? 1 : 0), 0) / piFields.length;

  const summaryScore = isFilled(parsedData.summary) ? 1 : 0;

  const we = Array.isArray(parsedData.work_experience) ? parsedData.work_experience : [];
  const weScore =
    we.length === 0
      ? 0
      : we
          .map((w) => {
            const fields = ['company', 'position', 'start_date', 'description'];
            const f = fields.reduce((acc, k) => acc + (isFilled(w[k]) ? 1 : 0), 0);
            return f / fields.length;
          })
          .reduce((a, b) => a + b, 0) / we.length;

  const ed = Array.isArray(parsedData.education) ? parsedData.education : [];
  const edScore =
    ed.length === 0
      ? 0
      : ed
          .map((e) => {
            const fields = ['institution', 'degree', 'field', 'start_date'];
            const f = fields.reduce((acc, k) => acc + (isFilled(e[k]) ? 1 : 0), 0);
            return f / fields.length;
          })
          .reduce((a, b) => a + b, 0) / ed.length;

  const skills = parsedData.skills || { technical: [], languages: [], soft_skills: [] };
  const skillsScore =
    ((arrayNonEmpty(skills.technical) ? 1 : 0) +
      (arrayNonEmpty(skills.languages) ? 1 : 0) +
      (arrayNonEmpty(skills.soft_skills) ? 1 : 0)) / 3;

  const otherArrays = [
    parsedData.certifications,
    parsedData.projects,
    parsedData.languages,
  ].filter(Array.isArray);
  const otherScore =
    otherArrays.length === 0
      ? 0
      : otherArrays.reduce((acc, arr) => acc + (arr.length > 0 ? 1 : 0), 0) / otherArrays.length;

  const score =
    weights.personal_info * piFilled +
    weights.summary * summaryScore +
    weights.work_experience * weScore +
    weights.education * edScore +
    weights.skills * skillsScore +
    weights.other * otherScore;

  // Bound and round to 2 decimals for metadata readability
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

/**
 * Parse resume file and extract structured data.
 * @param {Buffer} fileBuffer - Resume file buffer
 * @param {string} fileType - File type: 'pdf' or 'docx'
 * @returns {Promise<Object>} Parsed resume result object
 *
 * @example
 * import fs from 'fs';
 * const buffer = fs.readFileSync('resume.pdf');
 * const result = await parseResume(buffer, 'pdf');
 * console.log(result);
 */
export async function parseResume(fileBuffer, fileType) {
  const t0 = Date.now();
  try {
    if (!fileBuffer || !(fileBuffer instanceof Buffer)) {
      throw Object.assign(new Error('Invalid file buffer'), { details: 'fileBuffer must be a Buffer' });
    }
    const type = String(fileType || '').toLowerCase();
    if (!['pdf', 'docx'].includes(type)) {
      throw Object.assign(new Error('Unsupported file type'), { details: `fileType must be 'pdf' or 'docx', got '${fileType}'` });
    }

    // 1. Extract text
    const rawText =
      type === 'pdf' ? await extractTextFromPDF(fileBuffer) : await extractTextFromDOCX(fileBuffer);

    // 2. Clean text
    const text = cleanText(rawText);
    const textLength = text.length;
    console.log(`Extracted text length: ${textLength}`);
    if (textLength > 0) console.log('Text preview:', text.substring(0, 100).replace(/\n/g, '\\n'));
    
    if (textLength === 0) {
      console.error('No text extracted from file');
      return {
        success: false,
        error: 'No text extracted from file',
        details: 'Text extraction returned empty string',
      };
    }

    // 3. AI Server analysis
    const { data: parsed } = await parseWithAI(text, 2);

    // 4. Validate structure
    const { valid, data: normalized, errors } = validateParsedData(parsed);
    
    // Heuristic fix: If name is missing, assume the first line of text is the name
    if (!normalized.personal_info.name && textLength > 0) {
      const firstLine = text.split('\n')[0].trim();
      if (firstLine.length > 2 && firstLine.length < 50) {
        console.log(`Heuristic: Auto-filling missing name with "${firstLine}"`);
        normalized.personal_info.name = firstLine;
      }
    }

    if (!valid) {
      console.warn('Parsed data failed validation:', errors.join('; '));
    }

    // 5. Confidence score
    const confidence = calculateConfidence(normalized);

    // 6. Return
    const processingTime = Number(((Date.now() - t0) / 1000).toFixed(2));
    const result = {
      success: true,
      data: normalized,
      metadata: {
        file_type: type,
        text_length: textLength,
        processing_time: processingTime,
        confidence,
        ai_model: 'Hugging Face API',
      },
    };
    console.log('Parsing completed. Confidence:', confidence);
    return result;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    const message = e.message || 'Unknown error';
    console.error('Parsing error:', message);
    return {
      success: false,
      error: message,
      details: e.details || e.stack || String(e),
    };
  }
}

/**
 * Helper: check non-empty string/null
 * @param {any} v
 * @returns {boolean}
 */
function isFilled(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

/**
 * Helper: array has at least one non-empty element
 * @param {any} arr
 * @returns {boolean}
 */
function arrayNonEmpty(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

