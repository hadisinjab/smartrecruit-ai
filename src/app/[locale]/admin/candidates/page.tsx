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
import { exportData, transformCandidateToReviewerData } from '@/utils/exportUtils';
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
  const [filterName, setFilterName] = useState('');
  const [filterAge, setFilterAge] = useState({ min: '', max: '' });
  const [filterPhone, setFilterPhone] = useState('');
  const [filterExperience, setFilterExperience] = useState({ min: '', max: '' });
  const [filterEmail, setFilterEmail] = useState('');
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

    // Apply specific filters
    if (filterName) {
      const lowerName = filterName.toLowerCase().trim();
      filtered = filtered.filter(candidate =>
        candidate.firstName.toLowerCase().startsWith(lowerName) ||
        candidate.lastName.toLowerCase().startsWith(lowerName)
      );
    }

    if (filterAge.min || filterAge.max) {
      const minAge = filterAge.min ? parseInt(filterAge.min, 10) : -Infinity;
      const maxAge = filterAge.max ? parseInt(filterAge.max, 10) : Infinity;
      filtered = filtered.filter(candidate => {
        if (candidate.age === undefined || candidate.age === null) return false;
        return candidate.age >= minAge && candidate.age <= maxAge;
      });
    }

    if (filterPhone) {
      filtered = filtered.filter(candidate =>
        candidate.phone?.includes(filterPhone)
      );
    }

    if (filterExperience.min || filterExperience.max) {
      const minExp = filterExperience.min ? parseInt(filterExperience.min, 10) : -Infinity;
      const maxExp = filterExperience.max ? parseInt(filterExperience.max, 10) : Infinity;
      filtered = filtered.filter(candidate => {
        if (candidate.experience === undefined || candidate.experience === null) return false;
        return candidate.experience >= minExp && candidate.experience <= maxExp;
      });
    }

    if (filterEmail) {
      const lowerEmail = filterEmail.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.email.toLowerCase().includes(lowerEmail)
      );
    }

    setFilteredCandidates(filtered);
  }, [candidates, filterName, filterAge, filterPhone, filterExperience, filterEmail]);

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

              <div className='relative w-full sm:w-[220px] flex-shrink-0'>
                <input
                  type='text'
                  placeholder={t('filterBy.name')}
                  className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div className='relative w-full sm:w-[220px] flex-shrink-0 flex items-center gap-2'>
                <input
                  type='number'
                  placeholder={t('filterBy.ageMin')}
                  className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterAge.min}
                  onChange={(e) => setFilterAge(prev => ({ ...prev, min: e.target.value }))}
                />
                <span className="text-gray-500">-</span>
                <input
                  type='number'
                  placeholder={t('filterBy.ageMax')}
                  className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterAge.max}
                  onChange={(e) => setFilterAge(prev => ({ ...prev, max: e.target.value }))}
                />
              </div>
              <div className='relative w-full sm:w-[220px] flex-shrink-0'>
                <input
                  type='text'
                  placeholder={t('filterBy.phone')}
                  className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterPhone}
                  onChange={(e) => setFilterPhone(e.target.value)}
                />
              </div>
              <div className='relative w-full sm:w-[220px] flex-shrink-0 flex items-center gap-2'>
                <input
                  type='number'
                  placeholder={t('filterBy.expMin')}
                  className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterExperience.min}
                  onChange={(e) => setFilterExperience(prev => ({ ...prev, min: e.target.value }))}
                />
                <span className="text-gray-500">-</span>
                <input
                  type='number'
                  placeholder={t('filterBy.expMax')}
                  className='w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterExperience.max}
                  onChange={(e) => setFilterExperience(prev => ({ ...prev, max: e.target.value }))}
                />
              </div>
              <div className='relative w-full sm:w-[220px] flex-shrink-0'>
                <input
                  type='email'
                  placeholder={t('filterBy.email')}
                  className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm'
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                />
              </div>
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
                      exportData(transformedData, 'candidates_reviewer_complete', 'xlsx');
                      addToast('success', 'Reviewer data exported successfully');
                    } catch (error) {
                      console.error('Export failed:', error);
                      addToast('error', 'Failed to export data');
                    }
                  }}>
                    {t('Common.exportReviewerComplete')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                     exportData(filteredCandidates, 'candidates', 'csv');
                     addToast('success', 'Candidates exported successfully');
                   }}>
                     CSV
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => {
                     exportData(filteredCandidates, 'candidates', 'xlsx');
                     addToast('success', 'Candidates exported successfully');
                   }}>
                     Excel
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => {
                     exportData(filteredCandidates, 'candidates', 'pdf');
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
          emptyText={t('details.notFound')}
        />

      </div>
    </AdminLayout>
  );
}
