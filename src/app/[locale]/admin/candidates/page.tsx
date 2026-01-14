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
  const [searchTerm, setSearchTerm] = useState('');
  // Filters state - using strings to allow empty/inactive state
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');
  const [expMin, setExpMin] = useState<string>('');
  const [expMax, setExpMax] = useState<string>('');
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

  // Re-run filters when any filter state changes or candidates list updates
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

    // Apply age filter only if values are provided
    if (ageMin !== '' || ageMax !== '') {
      filtered = filtered.filter(candidate => {
        if (candidate.age === undefined) return false; // Exclude if filtering by age but candidate has no age
        const min = ageMin !== '' ? parseInt(ageMin) : 0;
        const max = ageMax !== '' ? parseInt(ageMax) : 100; // Default max if not specified
        return candidate.age >= min && candidate.age <= max;
      });
    }

    // Apply experience filter only if values are provided
    if (expMin !== '' || expMax !== '') {
      filtered = filtered.filter(candidate => {
        if (candidate.experience === undefined) return false;
        const min = expMin !== '' ? parseInt(expMin) : 0;
        const max = expMax !== '' ? parseInt(expMax) : 100; // Default max if not specified
        return candidate.experience >= min && candidate.experience <= max;
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, ageMin, ageMax, expMin, expMax]);

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
          <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
            <div className='flex flex-col sm:flex-row gap-4 w-full md:flex-1'>
              <div className="w-full sm:w-[250px]">
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectJob')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allJobs')}</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Age Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">{t('ageRange')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              {/* Experience Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">{t('experienceRange')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={expMin}
                    onChange={(e) => setExpMin(e.target.value)}
                    min="0"
                    max="50"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={expMax}
                    onChange={(e) => setExpMax(e.target.value)}
                    min="0"
                    max="50"
                  />
                </div>
              </div>
              
              <div className='relative flex-1 w-full'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
                <input
                  type='text'
                  placeholder={t('searchPlaceholder')}
                  className='w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className='flex gap-2 w-full md:w-auto'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2 w-full md:w-auto'
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
