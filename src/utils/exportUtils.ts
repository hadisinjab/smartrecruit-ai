import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';

let arabicFontBase64: string | null = null;
let arabicFontName: string | null = null;
let arabicFontFileName: string | null = null;
let pdfMakeExportQueue: Promise<void> = Promise.resolve();

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_FONT_SOURCES = [
  {
    name: 'Amiri',
    fileName: 'Amiri-Regular.ttf',
    urls: [
      '/fonts/Amiri-Regular.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf'
    ]
  }
];

const resolveFontUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(url, window.location.origin).toString();
  }
  return url;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  if (typeof btoa === 'function') {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
};

const initializePdfMakeFonts = async (): Promise<boolean> => {
  try {
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    const vfs =
      pdfFonts?.pdfMake?.vfs ??
      pdfFonts?.vfs ??
      pdfFonts?.default?.pdfMake?.vfs ??
      pdfFonts?.default?.vfs ??
      {};
    const existingVfs = (pdfMake as any).vfs ?? {};
    (pdfMake as any).vfs = { ...vfs, ...existingVfs };
  } catch {
    (pdfMake as any).vfs = (pdfMake as any).vfs ?? {};
  }

  (pdfMake as any).fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };

  try {
    if (!arabicFontBase64 || !arabicFontName || !arabicFontFileName) {
      let loaded = false;
      for (const source of ARABIC_FONT_SOURCES) {
        for (const url of source.urls) {
          try {
            const response = await fetch(resolveFontUrl(url), { cache: 'no-store' });
            if (!response.ok) continue;
            const contentType = response.headers.get('content-type') || '';
            const buffer = await response.arrayBuffer();
            if (contentType.includes('text/html') || buffer.byteLength < 10000) {
              continue;
            }
            arabicFontBase64 = arrayBufferToBase64(buffer);
            arabicFontName = source.name;
            arabicFontFileName = source.fileName;
            loaded = true;
            break;
          } catch {
            continue;
          }
        }
        if (loaded) break;
      }
      if (!loaded) throw new Error('font fetch failed');
    }

    if (!arabicFontBase64 || !arabicFontName || !arabicFontFileName) {
      throw new Error('font base64 empty');
    }

    (pdfMake as any).vfs[arabicFontFileName] = arabicFontBase64;
    (pdfMake as any).fonts[arabicFontName] = {
      normal: arabicFontFileName,
      bold: arabicFontFileName,
      italics: arabicFontFileName,
      bolditalics: arabicFontFileName
    };

    return true;
  } catch {
    if (arabicFontName && (pdfMake as any).fonts?.[arabicFontName]) {
      delete (pdfMake as any).fonts[arabicFontName];
    }
    return false;
  }
};

// Interface for reviewer data with complete details
export interface ReviewerExportData {
  [key: string]: any;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  status: string;
  appliedDate: string;
  experience: number;
  age?: number;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: string;
  educationLevel?: string;
  universityName?: string;
  major?: string;
  country?: string;
  city?: string;
  languages?: string;
  desiredSalary?: string;
  availableStartDate?: string;
  photoUrl?: string;
  degreeFileUrl?: string;
  resumeUrl?: string;
  voiceRecordingUrl?: string;
  location: string;
  rating: number;
  priority: string;
  nextAction: string;
  nextActionDate: string;
  hrScore: number;
  hrDecision: string;
  hrNotes: string;
  aiMatchScore: number;
  aiQualificationSummary: string;
  aiMissingSkills: string;
  aiExperienceRelevance: string;
  assignmentCount: number;
  assignmentSolutions: string;
  assignmentLinks: string;
  interviewCount: number;
  interviewDetails: string;
  organizationName?: string;
  jobOwnerName?: string;
  tags?: string;
  source?: string;
}

export const FIELD_LABELS: Record<string, string> = {
  // 1-19 Basic Info Fields
  candidateName: 'Name',
  candidateEmail: 'Email',
  candidatePhone: 'Phone',
  age: 'Age',
  experience: 'Experience',
  desiredSalary: 'Expected Salary',
  gender: 'Gender',
  dateOfBirth: 'Date of Birth',
  nationality: 'Nationality',
  maritalStatus: 'Marital Status',
  photoUrl: 'Photo URL',
  country: 'Country',
  city: 'City',
  educationLevel: 'Education',
  universityName: 'University',
  major: 'Major',
  degreeFileUrl: 'Degree File URL',
  languages: 'Languages',
  availableStartDate: 'Start Date',

  // Other Fields
  position: 'Position',
  status: 'Status',
  appliedDate: 'Applied Date',
  resumeUrl: 'Resume URL',
  voiceRecordingUrl: 'Voice Recording',
  location: 'Location',
  rating: 'Rating',
  priority: 'Priority',
  nextAction: 'Next Action',
  nextActionDate: 'Next Action Date',
  hrScore: 'HR Score',
  hrDecision: 'HR Decision',
  hrNotes: 'HR Notes',
  aiMatchScore: 'AI Match Score',
  aiQualificationSummary: 'AI Summary',
  aiMissingSkills: 'Missing Skills',
  aiExperienceRelevance: 'Experience Relevance',
  assignmentCount: 'Assignments',
  assignmentSolutions: 'Assignment Solutions',
  assignmentLinks: 'Assignment Links',
  interviewCount: 'Interviews',
  interviewDetails: 'Interview Details',
  organizationName: 'Organization',
  jobOwnerName: 'Job Owner',
  tags: 'Tags',
  source: 'Source'
};

export const ORDERED_BASIC_KEYS = [
  'candidateName',
  'candidateEmail',
  'candidatePhone',
  'age',
  'experience',
  'desiredSalary',
  'gender',
  'dateOfBirth',
  'nationality',
  'maritalStatus',
  'photoUrl',
  'country',
  'city',
  'educationLevel',
  'universityName',
  'major',
  'degreeFileUrl',
  'languages',
  'availableStartDate'
];

export const formatForExport = (data: ReviewerExportData[]): Record<string, any>[] => {
  return data.map(item => {
    const formatted: Record<string, any> = {};
    
    // 1. First ensure the 19 basic fields are present and in order
    ORDERED_BASIC_KEYS.forEach(key => {
      const label = FIELD_LABELS[key];
      const val = item[key];
      // Always include the key, even if empty, to ensure column alignment
      formatted[label] = val !== undefined && val !== null ? val : '';
    });

    // 2. Add other defined fields from FIELD_LABELS (excluding the basic ones already added)
    Object.keys(FIELD_LABELS).forEach(key => {
      if (!ORDERED_BASIC_KEYS.includes(key)) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          formatted[FIELD_LABELS[key]] = val;
        }
      }
    });

    // 3. Add any dynamic fields (like "Enable File" questions)
    // These are keys in 'item' that are NOT in FIELD_LABELS
    Object.keys(item).forEach(key => {
      // Skip internal/meta keys (used for PDF-only structures like Q&A)
      if (!FIELD_LABELS[key] && !key.startsWith('__')) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          formatted[key] = val;
        }
      }
    });

    return formatted;
  });
};

// Helper to determine header order
const getOrderedHeaders = <T extends Record<string, any>>(data: T[], providedHeaders?: string[]) => {
  if (providedHeaders) return providedHeaders;
  
  // 1. Map labels to their priority index based on ORDERED_BASIC_KEYS
  const labelPriority: Record<string, number> = {};
  ORDERED_BASIC_KEYS.forEach((key, index) => {
    labelPriority[FIELD_LABELS[key]] = index;
  });

  // 2. Collect all unique keys from data
  const allKeys = new Set<string>();
  data.forEach(d => Object.keys(d).forEach(k => allKeys.add(k)));
  
  // 3. Sort keys: Priority keys first (in order), then others
  return Array.from(allKeys).sort((a, b) => {
    const indexA = labelPriority[a] !== undefined ? labelPriority[a] : 999;
    const indexB = labelPriority[b] !== undefined ? labelPriority[b] : 999;
    
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return 0; // Keep relative order for non-priority fields
  });
};

export const transformCandidateToReviewerData = (candidate: any, assignments: any[] = [], aiEvaluation: any = null): ReviewerExportData => {
  const latestHrEval = candidate.hr_evaluations?.[0] || {};
  const aiAnalysis = aiEvaluation?.analysis || {};

  // Process assignments
  const assignmentSolutions = assignments.map((a: any) => 
    `Assignment ${assignments.indexOf(a) + 1}: ${a.text_fields || 'No solution provided'}`
  ).join('\n---\n');
  
  const assignmentLinks = assignments.map((a: any) => 
    a.link_fields?.join(', ') || ''
  ).filter(Boolean).join('; ');

  // Find voice recording
  const voiceAnswer = candidate.answers?.find((a: any) => a.type === 'voice' || a.voice_data);
  const voiceRecordingUrl = voiceAnswer?.voice_data?.audio_url || (voiceAnswer?.type === 'voice' ? voiceAnswer?.value : undefined);

  // Process interviews
  const interviews = candidate.interviews || [];
  const interviewDetails = interviews.map((i: any) => 
    `Date: ${i.start_time ? new Date(i.start_time).toLocaleString() : 'N/A'}, Type: ${i.interview_type || 'N/A'}, Status: ${i.status || 'Scheduled'}`
  ).join('; ');

  // Helper to format array/json fields
  const formatArray = (val: any) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(', ');
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(', ');
      return val;
    } catch {
      return val;
    }
  };

  const result: ReviewerExportData = {
    candidateName: `${candidate.first_name || candidate.firstName || candidate.candidate_name || ''}`,
    candidateEmail: candidate.email || candidate.candidate_email || '',
    candidatePhone: candidate.phone || candidate.candidate_phone || 'N/A',
    position: candidate.job_form?.title || candidate.position || 'N/A',
    status: candidate.status,
    appliedDate: candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A',
    experience: candidate.experience || 0,
    age: candidate.age || candidate.candidate_age,
    gender: candidate.gender,
    dateOfBirth: candidate.date_of_birth,
    nationality: candidate.nationality,
    maritalStatus: candidate.marital_status,
    educationLevel: candidate.education_level,
    universityName: candidate.university_name,
    major: candidate.major,
    country: candidate.country,
    city: candidate.city,
    languages: formatArray(candidate.languages),
    desiredSalary: candidate.desired_salary,
    availableStartDate: candidate.available_start_date,
    photoUrl: candidate.photo,
    degreeFileUrl: candidate.degree_file,
    resumeUrl: candidate.resumes?.[0]?.file_url || '',
    voiceRecordingUrl: voiceRecordingUrl || '',
    location: candidate.location || 'N/A',
    rating: latestHrEval.hr_score || 0,
    priority: latestHrEval.priority || 'medium',
    nextAction: latestHrEval.hr_decision || 'N/A',
    nextActionDate: latestHrEval.next_action_date ? new Date(latestHrEval.next_action_date).toLocaleDateString() : 'N/A',
    hrScore: latestHrEval.hr_score || 0,
    hrDecision: latestHrEval.hr_decision || 'N/A',
    hrNotes: latestHrEval.hr_notes || 'N/A',
    aiMatchScore: aiAnalysis.match_score || 0,
    aiQualificationSummary: aiAnalysis.qualification_summary || 'N/A',
    aiMissingSkills: Array.isArray(aiAnalysis.missing_critical_skills) ? aiAnalysis.missing_critical_skills.join(', ') : 'N/A',
    aiExperienceRelevance: aiAnalysis.experience_relevance || 'N/A',
    assignmentCount: assignments.length,
    assignmentSolutions: assignmentSolutions,
    assignmentLinks: assignmentLinks,
    interviewCount: interviews.length,
    interviewDetails: interviewDetails,
    organizationName: candidate.job_form?.organizations?.name,
    jobOwnerName: candidate.job_form?.creator?.full_name,
    tags: Array.isArray(candidate.tags) ? candidate.tags.join(', ') : candidate.tags || '',
    source: candidate.source || 'N/A'
  };

  // Dynamically add ALL answers as top-level fields so that
  // each question becomes its own column in exports (CSV / Excel / PDF).
  if (candidate.answers && Array.isArray(candidate.answers)) {
    candidate.answers.forEach((ans: any) => {
      const label = ans.questions?.label || ans.label || ans.question_id;
      if (!label) return;

      let value: any = ans.value;

      // Normalize value for different answer types
      if (ans.type === 'voice' || ans.voice_data) {
        // Prefer a clickable URL if available
        value = ans.voice_data?.audio_url || ans.value || '[Voice Recording]';
      } else if (ans.type === 'file') {
        // Use file URL so it can be opened from the export
        value = ans.value;
      } else if (ans.type === 'url' || ans.isUrl) {
        value = ans.value;
      }

      if (result[label] === undefined) {
        result[label] = value;
      } else {
        // In case of duplicate labels, add a suffix to avoid overwriting
        let suffix = 2;
        let key = `${label} (${suffix})`;
        while (result[key] !== undefined) {
          suffix += 1;
          key = `${label} (${suffix})`;
        }
        result[key] = value;
      }
    });
  }

  return result;
};

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  // Use provided headers or derive them using our robust ordering logic
  const csvHeaders = getOrderedHeaders(data, headers);
  
  const worksheet = XLSX.utils.json_to_sheet(data, { header: csvHeaders });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  // Add BOM for Excel to correctly recognize UTF-8 (fixes Arabic characters)
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  const csvHeaders = getOrderedHeaders(data, headers);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: csvHeaders });

  // Columns that contain long text should be wider and wrapped
  const longTextCols = ['Assignment Solutions', 'HR Notes', 'AI Summary', 'Missing Skills'];

  // Auto-size columns with limits and text wrapping
  const colWidths = csvHeaders.map(header => {
    let maxLength = header.length;
    let isLongText = longTextCols.some(col => header.includes(col));
    
    // Base width calculation
    data.forEach(row => {
      const cellValue = row[header] ? String(row[header]) : '';
      // Don't let one cell dictate massive width, cap it for calculation
      const len = Math.min(cellValue.length, isLongText ? 100 : 50); 
      if (len > maxLength) {
        maxLength = len;
      }
    });

    // Set a reasonable max width
    const finalWidth = Math.min(maxLength + 2, isLongText ? 80 : 40);
    return { wch: finalWidth };
  });
  worksheet['!cols'] = colWidths;

  // Apply basic styles (Note: cell styles require paid SheetJS or style-aware fork, 
  // but we can at least set column properties if supported by the version used. 
  // Standard 'xlsx' package usually ignores cell styling in free version, 
  // but width works.)

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  
  // Use XLSX.write to get buffer and create Blob manually for consistent download behavior
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadCsv = (rows: Record<string, any>[], headers: string[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportCandidatesListExcel = (payload: CandidatesListExportPayload, filename: string) => {
  const workbook = XLSX.utils.book_new();

  const basicSheet = XLSX.utils.json_to_sheet(payload.basic.rows, { header: payload.basic.headers });
  XLSX.utils.book_append_sheet(workbook, basicSheet, 'Basic Info');

  const qaSheet = XLSX.utils.json_to_sheet(payload.qa.rows, { header: payload.qa.headers });
  XLSX.utils.book_append_sheet(workbook, qaSheet, 'Q&A');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportCandidatesListCSV = (payload: CandidatesListExportPayload, filename: string) => {
  downloadCsv(payload.basic.rows, payload.basic.headers, `${filename}_basic.csv`);
  downloadCsv(payload.qa.rows, payload.qa.headers, `${filename}_qa.csv`);
};

export const exportToPDF = async <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) return;

  pdfMakeExportQueue = pdfMakeExportQueue.then(async () => {
    await initializePdfMakeFonts();
    const vfsSnapshot = { ...(pdfMake as any).vfs };
    const fontsSnapshot = { ...(pdfMake as any).fonts };
    const buildDocDefinition = (allowArabic: boolean) => {
      (pdfMake as any).vfs = vfsSnapshot;
      (pdfMake as any).fonts = fontsSnapshot;
      const buildCell = (text: any, options?: Parameters<typeof buildPdfMakeCell>[1]) =>
        buildPdfMakeCell(text, { ...options, allowArabic });
      const tableHeaders = getOrderedHeaders(data, headers);
      const headerRow = tableHeaders.map(header =>
        buildCell(header, {
          bold: true,
          fillColor: [41, 128, 185],
          color: '#FFFFFF',
          alignment: 'center'
        })
      );
      const bodyRows = data.map(row =>
        tableHeaders.map(header => {
          const val = row[header];
          if (typeof val === 'object' && val !== null) {
            return buildCell(JSON.stringify(val), { alignment: 'left', noWrap: false });
          }
          return buildCell(val ?? '', { alignment: 'left', noWrap: false });
        })
      );

      return {
        pageSize: 'A2',
        pageOrientation: 'landscape',
        content: [
          {
            text: filename.replace(/\.pdf$/i, ''),
            style: 'pageTitle',
            margin: [0, 0, 0, 8]
          },
          {
            table: {
              headerRows: 1,
              widths: Array(tableHeaders.length).fill('*'),
              body: [headerRow, ...bodyRows]
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        ],
        styles: {
          pageTitle: {
            fontSize: 12,
            bold: true,
            color: '#2980B9'
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 8
        },
        footer: (currentPage: number, pageCount: number) => ({
          text: `Page ${currentPage} of ${pageCount} - Generated on: ${new Date().toLocaleString()}`,
          fontSize: 8,
          color: '#999999',
          alignment: 'center',
          margin: [0, 10, 0, 0]
        })
      };
    };

    const createBlob = async (docDefinition: any) => {
      const pdfDoc: any = pdfMake.createPdf(docDefinition);
      return await new Promise<Blob>((resolve, reject) => {
        try {
          const result = pdfDoc.getBlob?.((b: Blob) => resolve(b));
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
      });
    };

    const arabicAllowed = Boolean(
      arabicFontFileName &&
        arabicFontName &&
        vfsSnapshot[arabicFontFileName] &&
        (fontsSnapshot as any)?.[arabicFontName]
    );

    let docDefinition = buildDocDefinition(arabicAllowed);
    let blob: Blob;
    try {
      blob = await createBlob(docDefinition);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (arabicFontFileName && message.includes(arabicFontFileName)) {
        delete vfsSnapshot[arabicFontFileName];
        if (arabicFontName && (fontsSnapshot as any)?.[arabicFontName]) {
          delete (fontsSnapshot as any)[arabicFontName];
        }
        docDefinition = buildDocDefinition(false);
        blob = await createBlob(docDefinition);
      } else {
        throw error;
      }
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  await pdfMakeExportQueue;
};

// Helper function to format text for pdfmake (preserves Arabic and all Unicode)
const formatTextForPdfMake = (text: any): string => {
  if (text === null || text === undefined) return '';
  if (typeof text === 'object') {
    try {
      return JSON.stringify(text);
    } catch {
      return String(text);
    }
  }
  return String(text);
};

const CANDIDATES_LIST_KEYS = ORDERED_BASIC_KEYS as (keyof ReviewerExportData)[];

export interface CandidatesListExportPayload {
  basic: { headers: string[]; rows: Record<string, any>[] };
  qa: { headers: string[]; rows: Record<string, any>[] };
}

export const buildCandidatesListExportPayload = (candidates: any[]): CandidatesListExportPayload => {
  const transformedData = candidates.map(c =>
    transformCandidateToReviewerData(c, c.assignments || [], c.ai_evaluations?.[0])
  );

  const basicHeaders = ORDERED_BASIC_KEYS.map(k => FIELD_LABELS[k] || String(k));
  const basicRows = transformedData.map(row => {
    const result: Record<string, any> = {};
    ORDERED_BASIC_KEYS.forEach(k => {
      const label = FIELD_LABELS[k] || String(k);
      result[label] = row[k] ?? '';
    });
    return result;
  });

  const qaHeaders = ['Candidate', 'Question', 'Answer', 'Answer Link', 'Voice Link', 'Resume Link'];
  const qaRows: Record<string, any>[] = [];

  candidates.forEach((candidate, idx) => {
    const candidateName = transformedData[idx]?.candidateName || '';
    const resumeUrl = candidate.resumes?.[0]?.file_url || candidate.resumeUrl || '';
    const answers = Array.isArray(candidate.answers) ? candidate.answers : [];

    answers.forEach((ans: any) => {
      const question = ans.questions?.label || ans.label || ans.question_id || 'Question';
      let answerText = ans.value || '';
      let answerLink = '';
      let voiceLink = '';

      if (ans.type === 'voice' || ans.voice_data) {
        answerText = '[Voice Recording]';
        voiceLink = ans.voice_data?.audio_url || (ans.type === 'voice' ? ans.value : '');
      } else if (ans.type === 'file') {
        answerText = `[File: ${ans.fileName || 'Download'}]`;
        answerLink = ans.value || '';
      } else if (ans.type === 'url' || ans.isUrl) {
        answerLink = ans.value || '';
      }

      qaRows.push({
        Candidate: candidateName,
        Question: question,
        Answer: answerText,
        'Answer Link': answerLink,
        'Voice Link': voiceLink,
        'Resume Link': resumeUrl
      });
    });
  });

  return {
    basic: { headers: basicHeaders, rows: basicRows },
    qa: { headers: qaHeaders, rows: qaRows }
  };
};

const buildPdfMakeCell = (
  text: any,
  options?: {
    bold?: boolean;
    fillColor?: string | number[];
    color?: string;
    alignment?: 'left' | 'center' | 'right';
    link?: string;
    noWrap?: boolean;
    allowArabic?: boolean;
  }
) => {
  const value = formatTextForPdfMake(text ?? '');
  const isArabic = ARABIC_REGEX.test(value);
  const alignment = isArabic ? 'right' : options?.alignment || 'left';
  const arabicFontInVFS = !!(arabicFontFileName && (pdfMake as any).vfs?.[arabicFontFileName]);
  const arabicFontInFonts = !!(arabicFontName && (pdfMake as any).fonts?.[arabicFontName]);
  const allowArabic = options?.allowArabic ?? (arabicFontInVFS && arabicFontInFonts);
  const useArabic = isArabic && allowArabic;
  const base: any = {
    text: options?.link ? 'Link' : value,
    font: useArabic && arabicFontName ? arabicFontName : 'Roboto',
    alignment,
    bold: options?.bold,
    fillColor: options?.fillColor,
    color: options?.color,
    noWrap: options?.noWrap ?? false
  };
  if (options?.link) {
    base.link = options.link;
    base.color = '#0066CC';
  }
  return base;
};

export const exportCandidatesListPDF = async (candidates: any[], filename: string) => {
  pdfMakeExportQueue = pdfMakeExportQueue.then(async () => {
    await initializePdfMakeFonts();
    const vfsSnapshot = { ...(pdfMake as any).vfs };
    const fontsSnapshot = { ...(pdfMake as any).fonts };
    const buildDocDefinition = (allowArabic: boolean) => {
      (pdfMake as any).vfs = vfsSnapshot;
      (pdfMake as any).fonts = fontsSnapshot;
      const buildCell = (text: any, options?: Parameters<typeof buildPdfMakeCell>[1]) =>
        buildPdfMakeCell(text, { ...options, allowArabic });

      const payload = buildCandidatesListExportPayload(candidates);
      const fieldLabels = payload.basic.headers;
      const rows = payload.basic.rows;
      const candidatesPerPage = 10;

      const chunks: typeof rows[] = [];
      for (let i = 0; i < rows.length; i += candidatesPerPage) {
        chunks.push(rows.slice(i, i + candidatesPerPage));
      }

      const nameLabel = FIELD_LABELS.candidateName || 'Name';

      const buildChunkTable = (chunk: typeof rows, chunkIndex: number) => {
        const headerRow = [
          buildCell('Field', {
            bold: true,
            fillColor: [41, 128, 185],
            color: '#FFFFFF',
            alignment: 'center'
          }),
          ...chunk.map((row, idx) =>
            buildCell(String(row[nameLabel] || `#${chunkIndex * candidatesPerPage + idx + 1}`), {
              bold: true,
              fillColor: [41, 128, 185],
              color: '#FFFFFF',
              alignment: 'center'
            })
          )
        ];

        const dataRows = fieldLabels.map((label, rowIdx) => {
          const rowBg = rowIdx % 2 === 0 ? '#FFFFFF' : '#F5F7FA';
          return [
            buildCell(label, {
              bold: true,
              fillColor: [230, 240, 255],
              alignment: 'left'
            }),
            ...chunk.map(candidateRow => {
              const val = candidateRow[label] ?? '';
              const isUrl = typeof val === 'string' && val.startsWith('http');
              return buildCell(val, {
                fillColor: rowBg,
                link: isUrl ? val : undefined,
                alignment: 'left'
              });
            })
          ];
        });

        return {
          table: {
            headerRows: 1,
            widths: [70, ...Array(chunk.length).fill('*')],
            body: [headerRow, ...dataRows]
          },
          layout: {
            hLineWidth: () => 0.3,
            vLineWidth: () => 0.3,
            hLineColor: () => '#C8C8C8',
            vLineColor: () => '#C8C8C8'
          }
        };
      };

      let qaTableBody: any[] = [];
      let qaNumColumns = 0;
      if (payload.qa.rows.length > 0) {
        const qaHeaders = payload.qa.headers.map(k => formatTextForPdfMake(k));
        qaNumColumns = qaHeaders.length;

        qaTableBody = [
          qaHeaders.map((h, idx) =>
            buildCell(h, {
              bold: true,
              fillColor: [52, 73, 94],
              color: '#FFFFFF',
              alignment: idx === 0 ? 'left' : 'center'
            })
          ),
          ...payload.qa.rows.map((row, rowIdx) => {
            return qaHeaders.map((header, colIdx) => {
              const cell = row[header] ?? '';
              const isUrl = typeof cell === 'string' && cell.startsWith('http');
              return buildCell(cell, {
                bold: colIdx === 0,
                fillColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F5F7FA',
                link: isUrl ? cell : undefined,
                noWrap: false
              });
            });
          })
        ];
      }

      const content: any[] = [];

      chunks.forEach((chunk, idx) => {
        if (idx > 0) {
          content.push({ text: '', pageBreak: 'before' });
        }
        const from = idx * candidatesPerPage + 1;
        const to = Math.min(from + chunk.length - 1, rows.length);
        content.push({
          text: `Candidates List (${from}–${to} of ${rows.length})`,
          style: 'pageTitle',
          margin: [0, 0, 0, 8]
        });
        content.push(buildChunkTable(chunk, idx));
      });

      const docDefinition: any = {
        pageSize: 'A2',
        pageOrientation: 'landscape',
        content,
        styles: {
          header: {
            fontSize: 14,
            bold: true,
            color: '#2980B9',
            margin: [0, 0, 0, 10]
          },
          pageTitle: {
            fontSize: 12,
            bold: true,
            color: '#2980B9'
          },
          tableHeader: {
            fontSize: 7,
            bold: true,
            color: '#FFFFFF',
            fillColor: [41, 128, 185]
          },
          tableCell: {
            fontSize: 6,
            margin: [2, 1],
            lineHeight: 1.2
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10
        },
        footer: (currentPage: number, pageCount: number) => ({
          text: `Page ${currentPage} of ${pageCount} - Generated on: ${new Date().toLocaleString()}`,
          fontSize: 8,
          color: '#999999',
          alignment: 'center',
          margin: [0, 10, 0, 0]
        })
      };

      if (qaTableBody.length > 0) {
        docDefinition.content.push(
          {
            text: 'Questions & Answers',
            style: 'pageTitle',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
          },
          {
            table: {
              headerRows: 1,
              widths: Array(qaNumColumns).fill('*'),
              body: qaTableBody
            },
            layout: {
              fillColor: (rowIndex: number) => {
                return rowIndex === 0 ? [52, 73, 94] : null;
              },
              hLineWidth: () => 0.1,
              vLineWidth: () => 0.1,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      return docDefinition;
    };

    const createBlob = async (docDefinition: any) => {
      const pdfDoc: any = pdfMake.createPdf(docDefinition);
      return await new Promise<Blob>((resolve, reject) => {
        try {
          const result = pdfDoc.getBlob?.((b: Blob) => resolve(b));
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
      });
    };

    const arabicAllowed = Boolean(
      arabicFontFileName &&
        arabicFontName &&
        vfsSnapshot[arabicFontFileName] &&
        (fontsSnapshot as any)?.[arabicFontName]
    );

    let docDefinition = buildDocDefinition(arabicAllowed);
    let blob: Blob;
    try {
      blob = await createBlob(docDefinition);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (arabicFontFileName && message.includes(arabicFontFileName)) {
        delete vfsSnapshot[arabicFontFileName];
        if (arabicFontName && (fontsSnapshot as any)?.[arabicFontName]) {
          delete (fontsSnapshot as any)[arabicFontName];
        }
        docDefinition = buildDocDefinition(false);
        blob = await createBlob(docDefinition);
      } else {
        throw error;
      }
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  await pdfMakeExportQueue;
};

export const exportCandidateReportPDF = async (candidate: any, filename: string) => {
  pdfMakeExportQueue = pdfMakeExportQueue.then(async () => {
    await initializePdfMakeFonts();
    const vfsSnapshot = { ...(pdfMake as any).vfs };
    const fontsSnapshot = { ...(pdfMake as any).fonts };
    const buildDocDefinition = (allowArabic: boolean) => {
      (pdfMake as any).vfs = vfsSnapshot;
      (pdfMake as any).fonts = fontsSnapshot;
      const buildCell = (text: any, options?: Parameters<typeof buildPdfMakeCell>[1]) =>
        buildPdfMakeCell(text, { ...options, allowArabic });
      const buildKeyCell = (text: any) =>
        buildCell(text, { bold: true, fillColor: [245, 245, 245], alignment: 'left' });
      const buildValueCell = (text: any, link?: string) =>
        buildCell(text, { alignment: 'left', noWrap: false, link });
      const sectionTitle = (text: string) => ({
        text,
        style: 'sectionTitle',
        margin: [0, 12, 0, 6]
      });
      const formatVal = (val: any) => {
        if (!val) return 'N/A';
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };

      const voiceAns = candidate.answers?.find((a: any) => a.type === 'voice' || a.voice_data);
      const voiceUrl = voiceAns?.voice_data?.audio_url || (voiceAns?.type === 'voice' ? voiceAns?.value : '');
      const resumeUrl = candidate.resumes?.[0]?.file_url || '';

      const personalInfoRows = [
        [buildKeyCell('Email'), buildValueCell(candidate.candidate_email || candidate.email || 'N/A'), buildKeyCell('Phone'), buildValueCell(candidate.candidate_phone || candidate.phone || 'N/A')],
        [buildKeyCell('Age'), buildValueCell(candidate.candidate_age ? `${candidate.candidate_age}` : 'N/A'), buildKeyCell('Gender'), buildValueCell(candidate.gender || 'N/A')],
        [buildKeyCell('Nationality'), buildValueCell(candidate.nationality || 'N/A'), buildKeyCell('Marital Status'), buildValueCell(candidate.marital_status || 'N/A')],
        [buildKeyCell('Location'), buildValueCell(candidate.location || 'N/A'), buildKeyCell('Experience'), buildValueCell(`${candidate.experience || 0} Years`)],
        [buildKeyCell('Education'), buildValueCell(candidate.education_level || 'N/A'), buildKeyCell('University'), buildValueCell(candidate.university_name || 'N/A')],
        [buildKeyCell('Major'), buildValueCell(candidate.major || 'N/A'), buildKeyCell('Languages'), buildValueCell(formatVal(candidate.languages))],
        [buildKeyCell('Expected Salary'), buildValueCell(candidate.desired_salary || 'N/A'), buildKeyCell('Start Date'), buildValueCell(candidate.available_start_date || 'N/A')],
        [buildKeyCell('Applied Date'), buildValueCell(candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A'), buildKeyCell('Source'), buildValueCell(candidate.source || 'N/A')],
        [buildKeyCell('CV/Resume'), buildValueCell(resumeUrl ? '[Attached]' : 'N/A', resumeUrl || undefined), buildKeyCell('Voice Recording'), buildValueCell(voiceUrl ? 'Yes' : 'No', voiceUrl || undefined)]
      ];

      if (candidate.photo) {
        personalInfoRows.push([buildKeyCell('Photo'), buildValueCell('[Link]', candidate.photo), buildKeyCell(''), buildValueCell('')]);
      }
      if (candidate.degree_file) {
        personalInfoRows.push([buildKeyCell('Degree File'), buildValueCell('[Link]', candidate.degree_file), buildKeyCell(''), buildValueCell('')]);
      }

      const content: any[] = [
        {
          text: candidate.candidate_name || 'Candidate Report',
          style: 'reportTitle'
        },
        {
          text: candidate.job_form?.title || 'Unknown Position',
          style: 'reportSubtitle',
          margin: [0, 2, 0, 0]
        },
        {
          text: `Status: ${candidate.status?.toUpperCase() || 'APPLIED'}`,
          style: 'statusText',
          margin: [0, 2, 0, 10]
        },
        sectionTitle('Personal Information'),
        {
          table: {
            widths: [90, '*', 90, '*'],
            body: personalInfoRows
          },
          layout: {
            hLineWidth: () => 0.3,
            vLineWidth: () => 0.3,
            hLineColor: () => '#C8C8C8',
            vLineColor: () => '#C8C8C8'
          }
        }
      ];

      const aiEval = candidate.ai_evaluations?.[0];
      if (aiEval) {
        let parsedAnalysis: any = aiEval.analysis || {};
        if (typeof parsedAnalysis === 'string') {
          try {
            parsedAnalysis = JSON.parse(parsedAnalysis);
          } catch {}
        }
        const aiRows = [
          [buildKeyCell('Match Score'), buildValueCell(`${parsedAnalysis.match_score || 0}%`)],
          [buildKeyCell('Qualification'), buildValueCell(parsedAnalysis.qualification_summary || 'N/A')],
          [buildKeyCell('Strengths'), buildValueCell(Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths.join(', ') : (parsedAnalysis.strengths || 'N/A'))],
          [buildKeyCell('Missing Skills'), buildValueCell(Array.isArray(parsedAnalysis.missing_critical_skills) ? parsedAnalysis.missing_critical_skills.join(', ') : (parsedAnalysis.missing_critical_skills || 'N/A'))],
          [buildKeyCell('Experience Relevance'), buildValueCell(parsedAnalysis.experience_relevance || 'N/A')]
        ];
        content.push(
          sectionTitle('AI Evaluation'),
          {
            table: {
              widths: [120, '*'],
              body: aiRows
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      const hrEval = candidate.hr_evaluations?.[0];
      if (hrEval) {
        const hrRows = [
          [buildKeyCell('Score'), buildValueCell(`${hrEval.hr_score || 0}/100`)],
          [buildKeyCell('Decision'), buildValueCell(hrEval.hr_decision || 'Pending')],
          [buildKeyCell('Next Action Date'), buildValueCell(hrEval.next_action_date ? new Date(hrEval.next_action_date).toLocaleDateString() : 'N/A')],
          [buildKeyCell('Notes'), buildValueCell(hrEval.hr_notes || 'No notes')]
        ];
        content.push(
          sectionTitle('HR Evaluation'),
          {
            table: {
              widths: [120, '*'],
              body: hrRows
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      if (candidate.answers && candidate.answers.length > 0) {
        const qaHeaderRow = [
          buildCell('Question', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' }),
          buildCell('Answer', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' })
        ];
        const qaRows = candidate.answers.map((ans: any) => {
          const question = ans.questions?.label || ans.label || ans.question_id || 'Question';
          let answer = ans.value || 'No Answer';
          let link = '';
          if (ans.type === 'voice' || ans.voice_data) {
            answer = '[Voice Recording Link]';
            link = ans.voice_data?.audio_url || (ans.type === 'voice' ? ans.value : '');
          } else if (ans.type === 'file') {
            answer = `[File: ${ans.fileName || 'Download'}]`;
            link = ans.value || '';
          } else if (ans.type === 'url' || ans.isUrl) {
            link = ans.value || '';
          }
          return [buildCell(question, { alignment: 'left', noWrap: false }), buildCell(answer, { alignment: 'left', noWrap: false, link: link || undefined })];
        });
        content.push(
          sectionTitle('Interview Questions'),
          {
            table: {
              headerRows: 1,
              widths: [160, '*'],
              body: [qaHeaderRow, ...qaRows]
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      if (candidate.assignments && candidate.assignments.length > 0) {
        const assignHeaderRow = [
          buildCell('Assignment', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' }),
          buildCell('Details', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' })
        ];
        const assignRows = candidate.assignments.map((a: any, idx: number) => {
          const links = Array.isArray(a.link_fields) ? a.link_fields.join(', ') : '';
          const text = a.text_fields || '';
          const type = a.type || 'text';
          let contentText = text;
          if (type === 'video_upload' || type === 'file_upload') {
            contentText = '[File/Video Uploaded]';
          }
          const details = `${contentText}${links ? `\nLinks: ${links}` : ''}`;
          return [buildCell(`Assignment ${idx + 1}`, { alignment: 'left', noWrap: false }), buildCell(details, { alignment: 'left', noWrap: false })];
        });
        content.push(
          sectionTitle('Assignments'),
          {
            table: {
              headerRows: 1,
              widths: [140, '*'],
              body: [assignHeaderRow, ...assignRows]
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      if (candidate.interviews && candidate.interviews.length > 0) {
        const interviewHeaderRow = [
          buildCell('Date', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' }),
          buildCell('Details', { bold: true, fillColor: [52, 73, 94], color: '#FFFFFF', alignment: 'left' })
        ];
        const interviewRows = candidate.interviews.map((i: any) => {
          const date = i.start_time ? new Date(i.start_time).toLocaleString() : 'N/A';
          const details = `Type: ${i.interview_type || 'N/A'}\nStatus: ${i.status || 'Scheduled'}\nNotes: ${i.notes || ''}`;
          return [buildCell(date, { alignment: 'left', noWrap: false }), buildCell(details, { alignment: 'left', noWrap: false })];
        });
        content.push(
          sectionTitle('Scheduled Interviews'),
          {
            table: {
              headerRows: 1,
              widths: [160, '*'],
              body: [interviewHeaderRow, ...interviewRows]
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => '#C8C8C8',
              vLineColor: () => '#C8C8C8'
            }
          }
        );
      }

      return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        content,
        styles: {
          reportTitle: { fontSize: 18, bold: true },
          reportSubtitle: { fontSize: 12, color: '#666666' },
          statusText: { fontSize: 10, color: '#333333' },
          sectionTitle: { fontSize: 12, bold: true, color: '#2980B9' }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 9
        },
        footer: (currentPage: number, pageCount: number) => ({
          text: `Page ${currentPage} of ${pageCount} - Generated by SmartRecruit AI`,
          fontSize: 8,
          color: '#999999',
          alignment: 'center',
          margin: [0, 10, 0, 0]
        })
      };
    };

    const createBlob = async (docDefinition: any) => {
      const pdfDoc: any = pdfMake.createPdf(docDefinition);
      return await new Promise<Blob>((resolve, reject) => {
        try {
          const result = pdfDoc.getBlob?.((b: Blob) => resolve(b));
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
      });
    };

    const arabicAllowed = Boolean(
      arabicFontFileName &&
        arabicFontName &&
        vfsSnapshot[arabicFontFileName] &&
        (fontsSnapshot as any)?.[arabicFontName]
    );

    let docDefinition = buildDocDefinition(arabicAllowed);
    let blob: Blob;
    try {
      blob = await createBlob(docDefinition);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (arabicFontFileName && message.includes(arabicFontFileName)) {
        delete vfsSnapshot[arabicFontFileName];
        if (arabicFontName && (fontsSnapshot as any)?.[arabicFontName]) {
          delete (fontsSnapshot as any)[arabicFontName];
        }
        docDefinition = buildDocDefinition(false);
        blob = await createBlob(docDefinition);
      } else {
        throw error;
      }
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  await pdfMakeExportQueue;
};

export const exportData = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  format: 'csv' | 'xlsx' | 'pdf',
  headers?: string[]
) => {
  if (!data || data.length === 0) {
    return;
  }

  switch (format) {
    case 'csv':
      exportToCSV(data, `${filename}.csv`, headers);
      break;
    case 'xlsx':
      exportToExcel(data, `${filename}.xlsx`, headers);
      break;
    case 'pdf':
      exportToPDF(data, `${filename}.pdf`, headers);
      break;
    default:
      console.error('Unsupported export format');
  }
};
