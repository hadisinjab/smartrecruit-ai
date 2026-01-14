'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { getCandidates } from '@/actions/candidates';
import { getJobs } from '@/actions/jobs';
import { getJob } from '@/actions/jobs';
import { Candidate, Job } from '@/types/admin';
import { Plus, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useToast } from '@/context/ToastContext';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// QuestionFilter component for dynamic question filtering
interface QuestionFilterProps {
  selectedQuestion: any;
  questionFilterValue: string;
  questionFilterMin: string;
  questionFilterMax: string;
  setQuestionFilterValue: (value: string) => void;
  setQuestionFilterMin: (value: string) => void;
  setQuestionFilterMax: (value: string) => void;
  t: any;
}

function QuestionFilter({
  selectedQuestion,
  questionFilterValue,
  questionFilterMin,
  questionFilterMax,
  setQuestionFilterValue,
  setQuestionFilterMin,
  setQuestionFilterMax,
  t
}: QuestionFilterProps) {
  if (!selectedQuestion) return null;

  const getLabelText = (label: any) => {
    if (!label) return 'Unknown Question';
    if (typeof label === 'object') {
      return label.label || label.value || JSON.stringify(label);
    }
    return String(label);
  };

  switch (selectedQuestion.type) {
    case 'number':
      return (
        <div className="flex gap-2 items-center w-full sm:w-[220px] flex-shrink-0">
          <div className="w-full">
            <input
              type="number"
              placeholder={t('min')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={questionFilterMin}
              onChange={(e) => setQuestionFilterMin(e.target.value)}
            />
          </div>
          <span className="text-gray-500 text-sm">-</span>
          <div className="w-full">
            <input
              type="number"
              placeholder={t('max')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={questionFilterMax}
              onChange={(e) => setQuestionFilterMax(e.target.value)}
            />
          </div>
        </div>
      );
      
    case 'select':
      const options = selectedQuestion.options || [];
      return (
        <div className="w-full sm:w-[220px] flex-shrink-0">
          <Select value={questionFilterValue} onValueChange={setQuestionFilterValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('selectAnswer')} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto w-[220px]">
              <SelectItem value="all">{t('allAnswers')}</SelectItem>
              {options.map((option: any, index: number) => {
                const optionText = getLabelText(option);
                return (
                  <SelectItem key={index} value={optionText}>
                    <div className="max-w-[180px] truncate" title={optionText}>
                      {optionText}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      );
      
    case 'text':
    case 'textarea':
    default:
      return (
        <div className="w-full sm:w-[220px] flex-shrink-0">
          <input
            type="text"
            placeholder={t('searchAnswer')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={questionFilterValue}
            onChange={(e) => setQuestionFilterValue(e.target.value)}
          />
        </div>
      );
  }
}

export default function CandidatesPage() {
  const t = useTranslations('Candidates');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('all');
  const [questionFilterValue, setQuestionFilterValue] = useState<string>('all');
  const [questionFilterMin, setQuestionFilterMin] = useState<string>('');
  const [questionFilterMax, setQuestionFilterMax] = useState<string>('');
  const [jobQuestions, setJobQuestions] = useState<any[]>([]);
  const [shouldApplyFilters, setShouldApplyFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Filters state - using strings to allow empty/inactive state
  const router = useRouter();

  // Support deep-linking: /admin/candidates?jobId=<id>
  useEffect(() => {
    const jobIdFromQuery = searchParams?.get('jobId')
    if (jobIdFromQuery) {
      setSelectedJobId(jobIdFromQuery)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error('Failed to load jobs:', error);
      }
    }
    loadJobs();
  }, []);

  // Load questions when job is selected
  useEffect(() => {
    async function loadQuestions() {
      if (selectedJobId && selectedJobId !== 'all') {
        try {
          const job = await getJob(selectedJobId);
          if (job && job.evaluation_criteria) {
            console.log('Loaded questions:', job.evaluation_criteria);
            console.log('First question structure:', job.evaluation_criteria[0]);
            console.log('First question label:', job.evaluation_criteria[0]?.label);
            setJobQuestions(job.evaluation_criteria);
          } else {
            setJobQuestions([]);
          }
        } catch (error) {
          console.error('Failed to load questions:', error);
          setJobQuestions([]);
        }
      } else {
        setJobQuestions([]);
        setSelectedQuestionId('all');
        setQuestionFilterValue('all');
        setQuestionFilterMin('');
        setQuestionFilterMax('');
        setShouldApplyFilters(false);
      }
    }
    loadQuestions();
  }, [selectedJobId]);

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      try {
        const data = await getCandidates(selectedJobId);
        setCandidates(data as unknown as Candidate[]);
        setFilteredCandidates(data as unknown as Candidate[]);
      } catch (error) {
        console.error('Failed to load candidates:', error);
        addToast('error', 'Failed to load candidates');
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, [addToast, selectedJobId]);

  // Re-run filters when basic filters change or when search is triggered
  useEffect(() => {
    let filtered = [...candidates];

    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.firstName.toLowerCase().includes(lowerSearch) ||
        candidate.lastName.toLowerCase().includes(lowerSearch) ||
        candidate.email.toLowerCase().includes(lowerSearch) ||
        candidate.position.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply question filter only when search is triggered
    if (shouldApplyFilters && selectedQuestionId && selectedQuestionId !== 'all') {
      console.log('Applying filters for question:', selectedQuestionId);
      console.log('Filter values:', { questionFilterValue, questionFilterMin, questionFilterMax });
      
      filtered = filtered.filter(candidate => {
        // Find the answer for the selected question
        const answer = candidate.answers?.find((ans: any) => ans.question_id === selectedQuestionId);
        console.log('Candidate answer:', candidate.firstName, answer);
        
        if (!answer || !answer.value) return false;
        
        // Get question type to determine filtering logic
        const question = jobQuestions.find(q => q.id === selectedQuestionId);
        if (!question) return false;

        const answerValue = String(answer.value).toLowerCase();

        switch (question.type) {
          case 'number':
            // For numeric questions, check if value is within range
            const numericValue = parseFloat(String(answer.value));
            if (isNaN(numericValue)) return false;
            
            const min = questionFilterMin ? parseFloat(questionFilterMin) : -Infinity;
            const max = questionFilterMax ? parseFloat(questionFilterMax) : Infinity;
            
            return numericValue >= min && numericValue <= max;
            
          case 'select':
            // For select questions, check exact match, but allow "all" to pass through
            if (questionFilterValue === 'all') return true;
            const filterValue = questionFilterValue.toLowerCase();
            return answerValue === filterValue;
            
          case 'text':
          case 'textarea':
          default:
            // For text questions, check if the answer contains the filter text
            const textFilterValue = questionFilterValue.toLowerCase();
            return answerValue.includes(textFilterValue);
        }
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, selectedQuestionId, shouldApplyFilters, questionFilterValue, questionFilterMin, questionFilterMax, jobQuestions]);

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      duplicate: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const handleSearch = () => {
    setShouldApplyFilters(true);
  };

  const handleClearFilters = () => {
    setSelectedJobId('all');
    setSelectedQuestionId('all');
    setQuestionFilterValue('all');
    setQuestionFilterMin('');
    setQuestionFilterMax('');
    setShouldApplyFilters(false);
  };

  const candidateColumns: Column<Candidate>[] = [
    {
      key: 'name',
      title: tTable('candidate'),
      render: (_, record) => (
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-medium'>
              {record.firstName[0]}{record.lastName[0]}
            </span>
          </div>
          <div>
            <p className='font-medium text-gray-900'>
              {record.firstName} {record.lastName}
            </p>
            <p className='text-sm text-gray-500'>{record.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'position',
      title: tTable('position'),
      render: (position) => (
        <div>
          <p className='font-medium text-gray-900'>{position}</p>
          <p className='text-sm text-gray-500'>{candidates.find(c => c.position === position)?.experience} {tTable('yearsExp')}</p>
        </div>
      )
    },
    {
      key: 'status',
      title: tTable('status'),
      render: (status) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {tStatus(status)}
        </span>
      )
    },
    {
      key: 'completion',
      title: tTable('completionStatus'),
      render: (_, record) => {
        const isIncomplete = !record.submittedAt
        const isResubmitted = !!record.isDuplicate && !!record.submittedAt
        const isFirstTime = !!record.submittedAt && !record.isDuplicate
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isIncomplete ? 'bg-red-100 text-red-800' :
            isResubmitted ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {isIncomplete
              ? tTable('incomplete')
              : isResubmitted
                ? tTable('completedResubmitted')
                : tTable('completedFirstTime')}
          </span>
        )
      }
    },
    {
      key: 'priority',
      title: tTable('priority'),
      render: (_, record) => (
        <span className={`text-sm font-medium ${getPriorityColor(record.hrFields.priority)}`}>
          {record.hrFields.priority.charAt(0).toUpperCase() + record.hrFields.priority.slice(1)}
        </span>
      )
    },
    {
      key: 'appliedDate',
      title: tTable('applied'),
      render: (date) => new Date(date).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'rating',
      title: tTable('rating'),
      render: (rating) => (
        <div className='flex items-center space-x-1'>
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'nextAction',
      title: tTable('nextAction'),
      render: (_, record) => (
        <div>
          <p className='text-sm font-medium text-gray-900'>{record.hrFields.nextAction}</p>
          <p className='text-xs text-gray-500'>
            {new Date(record.hrFields.nextActionDate).toLocaleDateString()}
          </p>
        </div>
      )
    }
  ];

  // إظهار أعمدة الشركة/مالك الوظيفة فقط إن توفرت (سوبر أدمن)
  if (filteredCandidates.some(c => c.organizationName || c.jobOwnerName)) {
    candidateColumns.splice(1, 0, {
      key: 'organization',
      title: tTable('organization'),
      render: (_, record) => (
        <div className='text-sm text-gray-800'>
          <p className='font-medium'>{record.organizationName || '—'}</p>
          <p className='text-xs text-gray-500'>{record.jobOwnerName || ''}</p>
        </div>
      )
    });
  }

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className='space-y-6'>
        <Card className='p-4 mb-6'>
          <div className='flex flex-col lg:flex-row gap-4 items-start justify-between'>
            <div className='flex flex-col sm:flex-row gap-4 w-full lg:flex-1 flex-wrap'>
              <div className="w-full sm:w-[220px] flex-shrink-0">
                <Select value={selectedJobId} onValueChange={(value) => {
                  setSelectedJobId(value);
                  setShouldApplyFilters(false);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectJob')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto w-[220px]">
                    <SelectItem value="all">{t('allJobs')}</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="max-w-[180px] truncate" title={job.title}>
                          {job.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question Selection - Only show when a job is selected */}
              {selectedJobId !== 'all' && jobQuestions.length > 0 && (
                <div className="w-full sm:w-[220px] flex-shrink-0">
                  <Select value={selectedQuestionId} onValueChange={(value) => {
                    setSelectedQuestionId(value);
                    setQuestionFilterValue('all');
                    setQuestionFilterMin('');
                    setQuestionFilterMax('');
                    setShouldApplyFilters(false);
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectQuestion')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto w-[220px]">
                      <SelectItem value="all">{t('allQuestions')}</SelectItem>
                      {jobQuestions.map((question) => {
                        try {
                          console.log('Question object:', question);
                          console.log('Question label:', question.label);
                          console.log('Question label type:', typeof question.label);
                          
                          // Handle case where label might be an object or string
                          let labelText = 'Unknown Question';
                          
                          if (question.label) {
                            if (typeof question.label === 'object' && question.label !== null) {
                              // If it's an object, try to get label or value property
                              labelText = question.label.label || question.label.value || JSON.stringify(question.label);
                            } else if (typeof question.label === 'string') {
                              labelText = question.label;
                            } else {
                              // For any other type, convert to string
                              labelText = String(question.label);
                            }
                          }
                          
                          console.log('Final labelText:', labelText);
                          
                          return (
                            <SelectItem key={question.id} value={question.id}>
                              <div className="max-w-[200px] truncate" title={labelText}>
                                {labelText}
                              </div>
                            </SelectItem>
                          );
                        } catch (error) {
                          console.error('Error rendering question:', error);
                          return (
                            <SelectItem key={question.id} value={question.id}>
                              <div className="max-w-[200px] truncate" title="Unknown Question">
                                Unknown Question
                              </div>
                            </SelectItem>
                          );
                        }
                      })}  {/* Added missing closing brace for map function */}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Question Filter - Show different inputs based on question type */}
              {selectedQuestionId !== 'all' && selectedQuestionId && (
                <QuestionFilter 
                  selectedQuestion={jobQuestions.find(q => q.id === selectedQuestionId)}
                  questionFilterValue={questionFilterValue}
                  questionFilterMin={questionFilterMin}
                  questionFilterMax={questionFilterMax}
                  setQuestionFilterValue={setQuestionFilterValue}
                  setQuestionFilterMin={setQuestionFilterMin}
                  setQuestionFilterMax={setQuestionFilterMax}
                  t={t}
                />
              )}

              <div className='relative w-full sm:w-[220px] flex-shrink-0'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
                <input
                  type='text'
                  placeholder={t('searchPlaceholder')}
                  className='w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className='flex gap-2 flex-wrap'>
              {/* Search and Clear buttons */}
              {selectedQuestionId !== 'all' && selectedQuestionId && (
                <>
                  <Button onClick={handleSearch} className='bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1.5'>
                    {t('search')}
                  </Button>
                  <Button onClick={handleClearFilters} variant='outline' className='text-sm px-3 py-1.5'>
                    {t('clear')}
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2 text-sm px-3 py-1.5'
                  >
                    <Download className="w-4 h-4" />
                    {tCommon('export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    exportToCSV(filteredCandidates, 'candidates');
                    addToast('success', 'Candidates exported successfully');
                  }}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportToExcel(filteredCandidates, 'candidates');
                    addToast('success', 'Candidates exported successfully');
                  }}>
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportToPDF(filteredCandidates, 'candidates');
                    addToast('success', 'Candidates exported successfully');
                  }}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>
                {candidates.filter(c => c.status === 'new' || c.status === 'duplicate').length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.newApplications')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-yellow-600'>
                {candidates.filter(c => {
                  if (c.status === 'screening') return true
                  const next = String((c as any)?.hrFields?.nextAction || '').toLowerCase()
                  return next === 'screening'
                }).length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.inScreening')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-purple-600'>
                {candidates.filter(c => {
                  if (c.status === 'interview') return true
                  const next = String((c as any)?.hrFields?.nextAction || '').toLowerCase()
                  return next === 'interview'
                }).length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.inInterview')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>
                {candidates.filter(c => {
                  if (c.status === 'offer') return true
                  const next = String((c as any)?.hrFields?.nextAction || '').toLowerCase()
                  return next === 'offer'
                }).length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.offersMade')}</p>
            </div>
          </Card>
        </div>

        {/* Candidates Table */}
        <DataTable
          data={filteredCandidates}
          columns={candidateColumns}
          onRowClick={(candidate) => router.push(`/admin/candidates/${candidate.id}`)}
          emptyText={tCommon('search')}
        />

      </div>
    </AdminLayout>
  );
}
