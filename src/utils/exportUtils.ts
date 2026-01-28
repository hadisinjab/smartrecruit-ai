import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface for reviewer data with complete details
export interface ReviewerExportData {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  status: string;
  appliedDate: string;
  experience: number;
  age?: number;
  gender?: string;
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
  answers?: string;
  tags?: string;
  source?: string;
}

export const FIELD_LABELS: Record<keyof ReviewerExportData, string> = {
  candidateName: 'Name',
  candidateEmail: 'Email',
  candidatePhone: 'Phone',
  position: 'Position',
  status: 'Status',
  appliedDate: 'Applied Date',
  experience: 'Experience',
  age: 'Age',
  gender: 'Gender',
  nationality: 'Nationality',
  maritalStatus: 'Marital Status',
  educationLevel: 'Education',
  universityName: 'University',
  major: 'Major',
  country: 'Country',
  city: 'City',
  languages: 'Languages',
  desiredSalary: 'Expected Salary',
  availableStartDate: 'Start Date',
  photoUrl: 'Photo URL',
  degreeFileUrl: 'Degree File URL',
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
  answers: 'Q&A',
  tags: 'Tags',
  source: 'Source'
};

export const formatForExport = (data: ReviewerExportData[]): Record<string, any>[] => {
  return data.map(item => {
    const formatted: Record<string, any> = {};
    (Object.keys(item) as Array<keyof ReviewerExportData>).forEach(key => {
      // Use label if available, otherwise keep original key
      // We only include keys that are present in the item
      const label = FIELD_LABELS[key] || key;
      formatted[label] = item[key];
    });
    return formatted;
  });
};

// Transform candidate data to reviewer export format
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

  // Process answers
  const answersText = candidate.answers?.map((ans: any) => {
    let val = ans.value;
    // Handle voice/file specially if needed in text
    if (ans.type === 'voice' || ans.voice_data) val = '[Voice Recording]';
    if (ans.type === 'file') val = `[File: ${ans.fileName || ans.value}]`;
    
    return `${ans.questions?.label || ans.label || ans.question_id}: ${val || 'No answer'}`;
  }).join('\n');

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

  return {
    candidateName: `${candidate.first_name || candidate.firstName || candidate.candidate_name || ''}`,
    candidateEmail: candidate.email || candidate.candidate_email || '',
    candidatePhone: candidate.phone || candidate.candidate_phone || 'N/A',
    position: candidate.job_form?.title || candidate.position || 'N/A',
    status: candidate.status,
    appliedDate: candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A',
    experience: candidate.experience || 0,
    age: candidate.age || candidate.candidate_age,
    gender: candidate.gender,
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
    answers: answersText,
    tags: Array.isArray(candidate.tags) ? candidate.tags.join(', ') : candidate.tags || '',
    source: candidate.source || 'N/A'
  };
};

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  const csvHeaders = headers || Object.keys(data[0]);
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
  const csvHeaders = headers || Object.keys(data[0]);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: csvHeaders });

  // Columns that contain long text should be wider and wrapped
  const longTextCols = ['Q&A', 'Assignment Solutions', 'HR Notes', 'AI Summary', 'Missing Skills'];

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
  XLSX.writeFile(workbook, filename);
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

  const tableHeaders = headers || Object.keys(data[0]);
  
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
  // Use A3 Landscape for more width
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3'
  });

  const group1Keys: (keyof ReviewerExportData)[] = [
    'candidateName', 'candidateEmail', 'candidatePhone', 'position', 'status', 
    'appliedDate', 'location', 'experience', 'educationLevel', 'universityName', 'availableStartDate'
  ];
  
  const group2Keys: (keyof ReviewerExportData)[] = [
    'candidateName', // Repeat Name for reference
    'hrScore', 'hrDecision', 'hrNotes', 
    'aiMatchScore', 'aiQualificationSummary', 'aiMissingSkills',
    'assignmentSolutions', 'answers'
  ];

  // Helper to extract rows based on keys
  const getRows = (keys: (keyof ReviewerExportData)[]) => {
    return data.map(row => keys.map(k => {
      const val = row[k];
      // Handle potential object values if any remain (though ReviewerExportData implies strings/numbers)
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val ?? '';
    }));
  };

  const headers1 = group1Keys.map(k => FIELD_LABELS[k] || k);
  const rows1 = getRows(group1Keys);
  
  const headers2 = group2Keys.map(k => FIELD_LABELS[k] || k);
  const rows2 = getRows(group2Keys);

  // --- Table 1: Basic Information ---
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Candidates List - Basic Information', 14, 15);
  
  autoTable(doc, {
    startY: 20,
    head: [headers1],
    body: rows1,
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      overflow: 'linebreak',
      halign: 'left'
    },
    headStyles: { 
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: 'bold' } // Name bold
    },
    margin: { top: 20 }
  });

  // --- Table 2: Evaluation Details ---
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Candidates List - Evaluation Details', 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [headers2],
    body: rows2,
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      overflow: 'linebreak', // Crucial for long notes/answers
      halign: 'left'
    },
    headStyles: { 
      fillColor: [39, 174, 96], // Different color for distinction
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 }, // Name fixed width
      3: { cellWidth: 50 }, // HR Notes
      5: { cellWidth: 50 }, // AI Summary
      7: { cellWidth: 60 }, // Assignments
      8: { cellWidth: 60 }  // Answers
    },
    margin: { top: 20 }
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
