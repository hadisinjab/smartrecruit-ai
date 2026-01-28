'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { getCandidates, getCandidatesForExport } from '@/actions/candidates';
import { getJobs } from '@/actions/jobs';
import { getJob } from '@/actions/jobs';
import { Candidate, Job } from '@/types/admin';
import { Plus, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useToast } from '@/context/ToastContext';
import { exportData, transformCandidateToReviewerData, formatForExport, exportCandidatesListPDF } from '@/utils/exportUtils';
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

export default function CandidatesPage() {
  const t = useTranslations('Candidates');
  const tJobs = useTranslations('Jobs');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterValue, setFilterValue] = useState('');
  const [filterMin, setFilterMin] = useState('');
  const [filterMax, setFilterMax] = useState('');
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const router = useRouter();
  const tFilters = useTranslations('BasicInfo');

  // Support deep-linking: /admin/candidates?jobId=<id>
  useEffect(() => {
    console.log('useEffect for selectedJobId triggered. ID:', selectedJobId); // New debug log
    const jobIdFromQuery = searchParams?.get('jobId');
    if (jobIdFromQuery) {
      setSelectedJobId(jobIdFromQuery);
    }
  }, [searchParams]);

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

  useEffect(() => {
    const job = jobs.find(j => j.id === selectedJobId);
    if (job) {
      // Exclude file upload fields from the filter list as they cannot be searched by text value
      const excludedFields = ['photo', 'degree_file'];
      const fields = (job.enabled_fields || [])
        .map(f => f.field_id)
        .filter(f => f && !excludedFields.includes(f)) as string[];
      setEnabledFields(fields);
    } else {
      setEnabledFields([]);
    }
    setSelectedField('');
    setFilterValue('');
    setFilterMin('');
    setFilterMax('');
  }, [selectedJobId, jobs]);

  useEffect(() => {
    let filtered = [...candidates];
    
    // Define numeric fields that require range filtering
    const numericFields = ['candidate_age', 'desired_salary', 'experience'];
    const isNumericField = numericFields.includes(selectedField);

    if (selectedField) {
      if (isNumericField) {
        // Range filtering for numeric fields
        if (filterMin || filterMax) {
          const min = filterMin ? parseFloat(filterMin) : Number.NEGATIVE_INFINITY;
          const max = filterMax ? parseFloat(filterMax) : Number.POSITIVE_INFINITY;

          filtered = filtered.filter(candidate => {
            let fieldValue: number | undefined;

            // Map field IDs to candidate properties
            switch (selectedField) {
              case 'candidate_age':
                // Check 'age' first (typed), then fallback to dynamic property
                fieldValue = candidate.age !== undefined ? candidate.age : (candidate as any).candidate_age;
                break;
              case 'experience':
                fieldValue = candidate.experience;
                break;
              case 'desired_salary':
                // 'desired_salary' might be dynamic
                fieldValue = (candidate as any).desired_salary;
                break;
              default:
                // Try to parse as number if it's another field
                const val = (candidate as any)[selectedField];
                fieldValue = val ? parseFloat(val) : undefined;
            }

            // Ensure we have a valid number to compare
            if (fieldValue === undefined || isNaN(fieldValue)) return false;

            return fieldValue >= min && fieldValue <= max;
          });
        }
      } else if (filterValue && filterValue !== 'all_options') {
        // Text filtering for non-numeric fields
        const lowerFilterValue = filterValue.toLowerCase().trim();
        filtered = filtered.filter(candidate => {
          let fieldValue: any;

          switch (selectedField) {
            case 'candidate_name':
              fieldValue = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
              break;
            case 'candidate_email':
              fieldValue = candidate.email;
              break;
            case 'candidate_phone':
              fieldValue = candidate.phone;
              break;
            default:
              fieldValue = (candidate as any)[selectedField];
          }
          
          // Exact match for select fields (optional, but safer)
          if (FIELD_OPTIONS[selectedField]) {
             if (fieldValue === undefined || fieldValue === null) return false;
             return String(fieldValue).toLowerCase() === lowerFilterValue;
          }

          if (typeof fieldValue === 'string') {
            // Case-insensitive check
            const val = fieldValue.toLowerCase();
            const filter = lowerFilterValue;

            // Check if all parts of the filter string are present in the value (order-insensitive)
            // e.g. "syria damascus" should match "Damascus, Syria"
            const filterParts = filter.split(/\s+/).filter(Boolean);
            return filterParts.every(part => val.includes(part));
          }
          if (fieldValue !== undefined && fieldValue !== null) {
            return String(fieldValue).toLowerCase().includes(lowerFilterValue);
          }
          return false;
        });
      }
    }

    setFilteredCandidates(filtered);
  }, [candidates, selectedField, filterValue, filterMin, filterMax]);

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

  const FIELD_OPTIONS: Record<string, string[]> = {
    gender: ['Male', 'Female', 'Other'],
    marital_status: ['Single', 'Married', 'Divorced', 'Widowed'],
    education_level: ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD"]
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
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
                <Select value={selectedJobId} onValueChange={(value) => setSelectedJobId(value)}>
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

              {selectedJobId !== 'all' && (
                <>
                  <div className="w-full sm:w-[220px] flex-shrink-0">
                    <Select value={selectedField} onValueChange={setSelectedField} disabled={enabledFields.length === 0}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectField')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto w-[220px]">
                        {enabledFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {tJobs(`create.fields.${field}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='relative w-full sm:w-[220px] flex-shrink-0'>
                    {['candidate_age', 'desired_salary', 'experience'].includes(selectedField) ? (
                      <div className="flex gap-2">
                        <input
                          type='number'
                          placeholder="Min"
                          className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                          value={filterMin}
                          onChange={(e) => setFilterMin(e.target.value)}
                        />
                        <input
                          type='number'
                          placeholder="Max"
                          className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                          value={filterMax}
                          onChange={(e) => setFilterMax(e.target.value)}
                        />
                      </div>
                    ) : FIELD_OPTIONS[selectedField] ? (
                      <Select value={filterValue} onValueChange={setFilterValue}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('filterBy.value')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_options">{tCommon('viewAll') || 'All'}</SelectItem>
                          {FIELD_OPTIONS[selectedField].map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <input
                        type='text'
                        placeholder={t('filterBy.value')}
                        className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        disabled={!selectedField}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
            <div className='flex gap-2 flex-wrap'>
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
                  <DropdownMenuItem onClick={async () => {
                    try {
                      addToast('info', 'Preparing complete reviewer data export...');
                      const ids = filteredCandidates.map(c => c.id);
                      const fullData = await getCandidatesForExport(ids);
                      const transformedData = fullData.map(c => transformCandidateToReviewerData(c, c.assignments || [], c.ai_evaluations?.[0]));
                      const formattedData = formatForExport(transformedData);
                      exportData(formattedData, 'candidates_reviewer_complete', 'xlsx');
                      addToast('success', 'Reviewer data exported successfully');
                    } catch (error) {
                      console.error('Export failed:', error);
                      addToast('error', 'Failed to export data');
                    }
                  }}>
                    {tCommon('exportReviewerComplete')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      addToast('info', 'Preparing filtered data export...');
                      const ids = filteredCandidates.map(c => c.id);
                      const fullData = await getCandidatesForExport(ids);
                      const transformedData = fullData.map(c => transformCandidateToReviewerData(c, c.assignments || [], c.ai_evaluations?.[0]));
                      const formattedData = formatForExport(transformedData);
                      exportData(formattedData, 'candidates_export_filtered', 'csv');
                      addToast('success', 'Filtered candidates exported successfully');
                    } catch (error) {
                      console.error('Export failed:', error);
                      addToast('error', 'Failed to export data');
                    }
                   }}>
                     CSV
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={async () => {
                    try {
                      addToast('info', 'Preparing filtered data export...');
                      const ids = filteredCandidates.map(c => c.id);
                      const fullData = await getCandidatesForExport(ids);
                      const transformedData = fullData.map(c => transformCandidateToReviewerData(c, c.assignments || [], c.ai_evaluations?.[0]));
                      const formattedData = formatForExport(transformedData);
                      exportData(formattedData, 'candidates_export_filtered', 'xlsx');
                      addToast('success', 'Filtered candidates exported successfully');
                    } catch (error) {
                      console.error('Export failed:', error);
                      addToast('error', 'Failed to export data');
                    }
                   }}>
                     Excel
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={async () => {
                    try {
                      addToast('info', 'Preparing filtered data export...');
                      const ids = filteredCandidates.map(c => c.id);
                      const fullData = await getCandidatesForExport(ids);
                      const transformedData = fullData.map(c => transformCandidateToReviewerData(c, c.assignments || [], c.ai_evaluations?.[0]));
                      exportCandidatesListPDF(transformedData, 'candidates_export_filtered.pdf');
                      addToast('success', 'Filtered candidates exported successfully');
                    } catch (error) {
                      console.error('Export failed:', error);
                      addToast('error', 'Failed to export data');
                    }
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
          emptyText={t('details.notFound')}
        />

      </div>
    </AdminLayout>
  );
}
