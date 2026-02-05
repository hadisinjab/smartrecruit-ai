import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      if (!FIELD_LABELS[key]) {
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

  // Dynamically add individual answers as top-level fields
  // We filter to ONLY include File type answers or "Enable File" questions,
  // as per user request to exclude general Q&A but keep tangible files/fields.
  if (candidate.answers && Array.isArray(candidate.answers)) {
    candidate.answers.forEach((ans: any) => {
      const label = ans.questions?.label || ans.label || ans.question_id;
      if (!label) return;

      // Normalize label for checking
      const normalizedLabel = String(label).toLowerCase();
      
      // Check if it is a File/Voice question OR explicitly "Enable File"
      // We also include if the type is explicitly 'file' or 'voice'
      // AND we exclude if it's just a regular text question (unless it says "Enable File")
      const isFileOrVoice = ans.type === 'file' || ans.type === 'voice' || 
                            normalizedLabel.includes('enable file') || 
                            normalizedLabel.includes('upload') ||
                            normalizedLabel.includes('resume') ||
                            normalizedLabel.includes('cv');

      if (!isFileOrVoice) return;

      let value = ans.value;
      
      // If it's a file or voice, ensure we provide the URL if available
      if (ans.type === 'file') {
        value = ans.value;
      } else if (ans.type === 'voice') {
        value = ans.voice_data?.audio_url || ans.value;
      }

      if (result[label] === undefined) {
        result[label] = value;
      } else {
        result[`${label} (Question)`] = value;
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

export const exportCandidatesListPDF = (data: ReviewerExportData[], filename: string) => {
  // Use A2 Landscape for maximum width
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a2'
  });

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
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val ?? 'N/A'; // Ensure N/A shows for empty values
    }));
  };

  const headers = allKeys.map(k => FIELD_LABELS[k] || k);
  const rows = getRows(allKeys);

  // --- Single Large Table ---
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Candidates List - Complete Data', 14, 15);
  
  autoTable(doc, {
    startY: 20,
    head: [headers],
    body: rows,
    styles: { 
      fontSize: 7, 
      cellPadding: 1.5, 
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 } // Name bold
    },
    margin: { top: 20 },
    didDrawCell: (data) => {
      // Add links for Photo and Degree File
      if (data.section === 'body') {
        const key = allKeys[data.column.index];
        if (key === 'photoUrl' || key === 'degreeFileUrl') {
          const rawValue = data.cell.raw;
          if (rawValue && rawValue !== 'N/A' && String(rawValue).startsWith('http')) {
            doc.setTextColor(0, 0, 255);
            doc.textWithLink('Link', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1, { url: String(rawValue) });
          }
        }
      }
    }
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.width;
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(filename);
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
