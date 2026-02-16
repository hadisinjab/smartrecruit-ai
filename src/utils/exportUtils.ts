import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pdfMake from 'pdfmake/build/pdfmake';

// Initialize pdfMake with fonts dynamically
let fontsInitialized = false;

const initializePdfMakeFonts = () => {
  if (fontsInitialized) return;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    // Debug: log the structure to understand it
    // console.log('pdfFonts structure:', Object.keys(pdfFonts));
    
    // pdfmake vfs_fonts can have different structures:
    // 1. { pdfMake: { vfs: {...} } }
    // 2. { vfs: {...} }
    // 3. Direct export of vfs object
    
    let vfs: any = null;
    
    if (pdfFonts?.pdfMake?.vfs) {
      vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts?.vfs) {
      vfs = pdfFonts.vfs;
    } else if (pdfFonts?.default?.pdfMake?.vfs) {
      vfs = pdfFonts.default.pdfMake.vfs;
    } else if (pdfFonts?.default?.vfs) {
      vfs = pdfFonts.default.vfs;
    } else if (typeof pdfFonts === 'object' && !pdfFonts.pdfMake && Object.keys(pdfFonts).length > 0) {
      // Might be direct vfs object
      vfs = pdfFonts;
    }
    
    if (vfs && typeof vfs === 'object') {
      (pdfMake as any).vfs = vfs;
      fontsInitialized = true;
    } else {
      console.warn('Could not find vfs in pdfFonts, using empty vfs');
      (pdfMake as any).vfs = {};
      fontsInitialized = true;
    }
  } catch (error) {
    console.error('Failed to initialize pdfMake fonts:', error);
    // Fallback: use empty vfs (fonts may not work but PDF will still generate)
    (pdfMake as any).vfs = {};
    fontsInitialized = true;
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

export const exportToPDF = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) return;

  // Use A2 Landscape to fit many columns. 
  // A2 is 420 x 594 mm.
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a2'
  });

  const tableHeaders = getOrderedHeaders(data, headers);
  
  // Transform data for autotable
  const tableData = data.map(row => 
    tableHeaders.map(header => {
      const val = row[header];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val ?? '';
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    styles: { 
      fontSize: 7, 
      cellPadding: 1.5,
      overflow: 'linebreak', // Wrap text
      halign: 'left',
      valign: 'top',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    // Specific column styles can be added here if we knew the index
    // Since columns are dynamic, we rely on auto-sizing
    columnStyles: {
      // potentially set 'cellWidth' for very long text columns if we can identify them
    },
    margin: { top: 15, right: 10, bottom: 10, left: 10 },
    didDrawPage: (data) => {
      // Add Header
      doc.setFontSize(14);
      doc.text('Candidates Export', data.settings.margin.left, 10);
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, data.settings.margin.left, 13);
    }
  });

  doc.save(filename);
};

// Helper function to sanitize text for PDF (handles Arabic and special characters)
const sanitizeTextForPDF = (text: any): string => {
  if (text === null || text === undefined) return '';
  if (typeof text === 'object') {
    try {
      return JSON.stringify(text);
    } catch {
      return String(text);
    }
  }
  const str = String(text);
  
  // For Arabic text, we need to handle it properly
  // jsPDF doesn't support Arabic fonts by default, so we'll use a workaround
  // Convert Arabic characters to a format that can be displayed
  // Note: This is a temporary solution - ideally we should add Arabic font support
  
  // Check if string contains Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/;
  if (arabicRegex.test(str)) {
    // For now, return the string as-is and let jsPDF try to handle it
    // In production, you should add Arabic font support to jsPDF
    return str;
  }
  
  return str;
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

export const exportCandidatesListPDF = (data: ReviewerExportData[], filename: string) => {
  // Initialize fonts before using pdfMake
  initializePdfMakeFonts();
  
  // Explicitly define all 19 fields + Evaluation fields
  const allKeys: (keyof ReviewerExportData)[] = [
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
    'availableStartDate',
    // Evaluation Fields
    'hrScore',
    'hrDecision',
    'aiMatchScore'
  ];

  // Helper to extract rows based on keys
  const getRows = (keys: (keyof ReviewerExportData)[]) => {
    return data.map(row => keys.map(k => {
      const val = row[k];
      return formatTextForPdfMake(val ?? 'N/A');
    }));
  };

  const headers = allKeys.map(k => formatTextForPdfMake(FIELD_LABELS[k] || k));
  const rows = getRows(allKeys);

  // Calculate equal width for each column
  // A2 landscape width is approximately 594mm, with margins ~40mm each side = ~514mm usable
  // Convert to points: 1mm = 2.83465 points, so ~514mm = ~1457 points
  // But pdfmake uses points directly, A2 landscape is ~1190 points wide
  // With margins, usable width is ~1100 points
  const numColumns = headers.length;
  const equalColumnWidth = '*'; // Use '*' for equal distribution
  
  // Build table body for pdfmake
  const tableBody = [
    // Header row
    headers.map((h, idx) => ({
      text: h,
      style: 'tableHeader',
      bold: true,
      fillColor: [41, 128, 185],
      color: '#FFFFFF',
      alignment: idx === 0 ? 'left' : 'center'
    })),
    // Data rows
    ...rows.map((row, rowIdx) => 
      row.map((cell, colIdx) => {
        const cellValue = cell;
        const isUrl = typeof cellValue === 'string' && cellValue.startsWith('http');
        
        return {
          text: isUrl ? 'Link' : cellValue,
          style: 'tableCell',
          bold: colIdx === 0, // Bold first column (name)
          fillColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F5F7FA',
          ...(isUrl ? { link: cellValue, color: '#0066CC' } : {}),
          noWrap: false // Allow text wrapping
        };
      })
    )
  ];

  // --- Unified Questions & Answers table for ALL candidates ---
  const baseKeys = new Set<string>(Object.keys(FIELD_LABELS));
  baseKeys.add('candidateName');
  baseKeys.add('__qa');

  const questionKeysSet = new Set<string>();
  (data as any[]).forEach(row => {
    Object.keys(row).forEach(k => {
      if (!baseKeys.has(k) && !k.startsWith('__')) {
        questionKeysSet.add(k);
      }
    });
  });

  const questionKeys = Array.from(questionKeysSet).sort();

  // Build Q&A table body
  let qaTableBody: any[] = [];
  let qaNumColumns = 0;
  if (questionKeys.length > 0) {
    const qaHeaders = ['Candidate', ...questionKeys.map(k => formatTextForPdfMake(k))];
    qaNumColumns = qaHeaders.length;
    
    qaTableBody = [
      // Header row
      qaHeaders.map((h, idx) => ({
        text: h,
        style: 'tableHeader',
        bold: true,
        fillColor: [52, 73, 94],
        color: '#FFFFFF',
        alignment: idx === 0 ? 'left' : 'center'
      })),
      // Data rows
      ...(data as any[]).map((row, rowIdx) => {
        const name = formatTextForPdfMake(row.candidateName || '');
        const answers = questionKeys.map(key => {
          const val = row[key];
          return formatTextForPdfMake(val);
        });
        return [name, ...answers].map((cell, colIdx) => {
          const cellValue = cell;
          const isUrl = typeof cellValue === 'string' && cellValue.startsWith('http');
          
          return {
            text: isUrl ? 'Link' : cellValue,
            style: 'tableCell',
            bold: colIdx === 0,
            fillColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F5F7FA',
            ...(isUrl ? { link: cellValue, color: '#0066CC' } : {}),
            noWrap: false // Allow text wrapping
          };
        });
      })
    ];
  }

  // Create PDF document definition
  const docDefinition: any = {
    pageSize: 'A2',
    pageOrientation: 'landscape',
    content: [
      {
        text: 'Candidates List - Complete Data',
        style: 'header',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: Array(numColumns).fill('*'), // Equal width for all columns
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex: number) => {
            return rowIndex === 0 ? [41, 128, 185] : null;
          },
          hLineWidth: () => 0.1,
          vLineWidth: () => 0.1,
          hLineColor: () => '#C8C8C8',
          vLineColor: () => '#C8C8C8'
        },
        margin: [0, 0, 0, 20]
      }
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        color: '#2980B9',
        margin: [0, 0, 0, 10]
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

  // Add Q&A table if exists
  if (qaTableBody.length > 0) {
    docDefinition.content.push(
      {
        text: 'Candidates Questions & Answers',
        style: 'header',
        margin: [0, 20, 0, 10],
        pageBreak: 'before'
      },
      {
        table: {
          headerRows: 1,
          widths: Array(qaNumColumns).fill('*'), // Equal width for all columns
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

  // Generate and download PDF
  pdfMake.createPdf(docDefinition).download(filename);
};

export const exportCandidateReportPDF = (candidate: any, filename: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Helper for section headers
  const addSectionHeader = (text: string, y: number) => {
    doc.setFillColor(41, 128, 185);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 16, y + 5.5);
    doc.setTextColor(0, 0, 0);
    return y + 12;
  };

  // Helper to format array/json
  const formatVal = (val: any) => {
    if (!val) return 'N/A';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  let yPos = 15;

  // 1. Header Section
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${candidate.candidate_name || 'Candidate Report'}`, 14, yPos);
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${candidate.job_form?.title || 'Unknown Position'}`, 14, yPos);
  
  // Status Badge-like text
  doc.setFontSize(10);
  const statusText = `Status: ${candidate.status?.toUpperCase() || 'APPLIED'}`;
  const statusWidth = doc.getTextWidth(statusText);
  doc.text(statusText, pageWidth - 14 - statusWidth, yPos);
  doc.setTextColor(0);

  yPos += 15;

  // 2. Personal Information
  const personalInfo = [
    ['Email', candidate.candidate_email || candidate.email || 'N/A', 'Phone', candidate.candidate_phone || candidate.phone || 'N/A'],
    ['Age', candidate.candidate_age ? `${candidate.candidate_age}` : 'N/A', 'Gender', candidate.gender || 'N/A'],
    ['Nationality', candidate.nationality || 'N/A', 'Marital Status', candidate.marital_status || 'N/A'],
    ['Location', candidate.location || 'N/A', 'Experience', `${candidate.experience || 0} Years`],
    ['Education', candidate.education_level || 'N/A', 'University', candidate.university_name || 'N/A'],
    ['Major', candidate.major || 'N/A', 'Languages', formatVal(candidate.languages)],
    ['Expected Salary', candidate.desired_salary || 'N/A', 'Start Date', candidate.available_start_date || 'N/A'],
    ['Applied Date', candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A', 'Source', candidate.source || 'N/A'],
    ['CV/Resume', candidate.resumes?.[0]?.file_url ? '[Attached]' : 'N/A', 'Voice Recording', candidate.answers?.some((a: any) => a.type === 'voice' || a.voice_data) ? 'Yes' : 'No']
  ];

  if (candidate.photo) personalInfo.push(['Photo', '[Link]', '', '']);
   if (candidate.degree_file) personalInfo.push(['Degree File', '[Link]', '', '']);
 
   // Find voice url
   const voiceAns = candidate.answers?.find((a: any) => a.type === 'voice' || a.voice_data);
   const voiceUrl = voiceAns?.voice_data?.audio_url || (voiceAns?.type === 'voice' ? voiceAns?.value : undefined);

   yPos = addSectionHeader('Personal Information', yPos);
   
   autoTable(doc, {
    startY: yPos,
    head: [],
    body: personalInfo,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
        if (data.section === 'body') {
            const rawRow = data.row.raw as string[];
            // CV/Resume Link (Column 1)
            if (data.column.index === 1 && rawRow[0] === 'CV/Resume' && candidate.resumes?.[0]?.file_url) {
                 doc.setTextColor(0, 0, 255);
                 doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: candidate.resumes[0].file_url });
            }
            // Photo Link (Column 1)
            if (data.column.index === 1 && rawRow[0] === 'Photo' && candidate.photo) {
                doc.setTextColor(0, 0, 255);
                doc.textWithLink('[Link]', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1, { url: candidate.photo });
            }
            // Degree File Link (Column 1)
            if (data.column.index === 1 && rawRow[0] === 'Degree File' && candidate.degree_file) {
                doc.setTextColor(0, 0, 255);
                doc.textWithLink('[Link]', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1, { url: candidate.degree_file });
            }
            // Voice Recording Link (Column 3)
            if (data.column.index === 3 && rawRow[2] === 'Voice Recording' && voiceUrl) {
                 doc.setTextColor(0, 0, 255);
                 doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: voiceUrl });
            }
        }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // 3. AI Evaluation
  const aiEval = candidate.ai_evaluations?.[0];
  if (aiEval) {
    yPos = addSectionHeader('AI Evaluation', yPos);
    
    let parsedAnalysis = aiEval.analysis || {};
    if (typeof parsedAnalysis === 'string') {
        try { parsedAnalysis = JSON.parse(parsedAnalysis); } catch {}
    }

    const aiData = [
      ['Match Score', `${parsedAnalysis.match_score || 0}%`],
      ['Qualification', parsedAnalysis.qualification_summary || 'N/A'],
      ['Strengths', Array.isArray(parsedAnalysis.strengths) ? parsedAnalysis.strengths.join(', ') : (parsedAnalysis.strengths || 'N/A')],
      ['Missing Skills', Array.isArray(parsedAnalysis.missing_critical_skills) ? parsedAnalysis.missing_critical_skills.join(', ') : (parsedAnalysis.missing_critical_skills || 'N/A')],
      ['Experience Relevance', parsedAnalysis.experience_relevance || 'N/A']
    ];

    autoTable(doc, {
      startY: yPos,
      body: aiData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // 4. HR Evaluation
  const hrEval = candidate.hr_evaluations?.[0];
  if (hrEval) {
    if (yPos > 250) { doc.addPage(); yPos = 15; }
    
    yPos = addSectionHeader('HR Evaluation', yPos);
    
    const hrData = [
      ['Score', `${hrEval.hr_score || 0}/100`, 'Decision', hrEval.hr_decision || 'Pending'],
      ['Next Action Date', hrEval.next_action_date ? new Date(hrEval.next_action_date).toLocaleDateString() : 'N/A', '', ''],
      ['Notes', hrEval.hr_notes || 'No notes']
    ];
    
    autoTable(doc, {
      startY: yPos,
      body: hrData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.row.index === 2 && data.column.index === 1) {
          data.cell.colSpan = 3;
        }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // 5. Questions & Answers
  if (candidate.answers && candidate.answers.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 15; }
    
    yPos = addSectionHeader('Interview Questions', yPos);
    
    const qaRows = candidate.answers.map((ans: any) => {
      const question = ans.questions?.label || ans.label || ans.question_id || 'Question';
      let answer = ans.value || 'No Answer';
      let link = '';
      
      if (ans.type === 'voice' || (ans.voice_data)) {
         answer = '[Voice Recording Link]';
         link = ans.voice_data?.audio_url || (ans.type === 'voice' ? ans.value : '');
      }
      if (ans.type === 'file') {
         answer = `[File: ${ans.fileName || 'Download'}]`;
         link = ans.value;
      }
      if (ans.type === 'url' || ans.isUrl) {
         link = ans.value;
      }
      
      return { question, answer, link };
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Question', 'Answer']],
      body: qaRows.map((r: any) => [r.question, r.answer]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
             const rowIndex = data.row.index;
             const link = qaRows[rowIndex]?.link;
             if (link) {
                 doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: link });
             }
        }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // 6. Assignments
  if (candidate.assignments && candidate.assignments.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 15; }
    
    yPos = addSectionHeader('Assignments', yPos);
    
    const assignRows = candidate.assignments.map((a: any, idx: number) => {
       const links = Array.isArray(a.link_fields) ? a.link_fields.join(', ') : '';
       const text = a.text_fields || '';
       const type = a.type || 'text';
       
       let content = text;
       if (type === 'video_upload' || type === 'file_upload') {
          content = `[File/Video Uploaded]`;
       }
       
       return [`Assignment ${idx + 1}`, `${content}\n${links ? `Links: ${links}` : ''}`];
    });

    autoTable(doc, {
      startY: yPos,
      body: assignRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 7. Interviews
  if (candidate.interviews && candidate.interviews.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 15; }
    
    yPos = addSectionHeader('Scheduled Interviews', yPos);
    
    const interviewRows = candidate.interviews.map((i: any) => {
      const date = i.start_time ? new Date(i.start_time).toLocaleString() : 'N/A';
      return [
        `Date: ${date}`, 
        `Type: ${i.interview_type || 'N/A'}\nStatus: ${i.status || 'Scheduled'}\nNotes: ${i.notes || ''}`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      body: interviewRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount} - Generated by SmartRecruit AI`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(filename);
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
