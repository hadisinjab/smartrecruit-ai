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
  organizationName?: string;
  jobOwnerName?: string;
  answers?: string;
  tags?: string;
  source?: string;
}

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
  const answersText = candidate.answers?.map((ans: any) => 
    `${ans.questions?.label || ans.question_id}: ${ans.value || 'No answer'}`
  ).join('\n');

  return {
    candidateName: `${candidate.first_name || ''} ${candidate.last_name || ''}`,
    candidateEmail: candidate.email,
    candidatePhone: candidate.phone || 'N/A',
    position: candidate.job_form?.title || 'N/A',
    status: candidate.status,
    appliedDate: new Date(candidate.created_at).toLocaleDateString(),
    experience: 0, // This is complex to calculate here, will default to 0
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
    interviewCount: 0, // Will be populated if needed
    organizationName: candidate.job_form?.organizations?.name,
    jobOwnerName: candidate.job_form?.creator?.full_name,
    answers: answersText,
    tags: Array.isArray(candidate.tags) ? candidate.tags.join(', ') : candidate.tags || '',
    source: candidate.source || 'N/A'
  };
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
      exportToXLSX(data, `${filename}.xlsx`, headers);
      break;
    case 'pdf':
      exportToPDF(data, `${filename}.pdf`, headers);
      break;
    default:
      console.error('Unsupported export format');
  }
};

const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  const csvHeaders = headers || Object.keys(data[0]);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: csvHeaders });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToXLSX = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  const csvHeaders = headers || Object.keys(data[0]);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: csvHeaders });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  XLSX.writeFile(workbook, filename);
};

const exportToPDF = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const tableHeaders = headers || Object.keys(data[0]);
  
  // Transform data for autotable
  // We need to ensure values are strings or numbers, not objects
  const tableData = data.map(row => 
    tableHeaders.map(header => {
      const val = row[header];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    styles: { fontSize: 8 }, // Smaller font to fit more columns
    theme: 'grid'
  });

  doc.save(filename);
};
