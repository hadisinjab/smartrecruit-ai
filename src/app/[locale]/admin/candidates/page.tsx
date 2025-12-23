'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/admin/FilterPanel';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { getCandidates } from '@/actions/candidates';
import { Candidate } from '@/types/admin';
import { Filter, Plus, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/utils/exportUtils';

export default function CandidatesPage() {
  const t = useTranslations('Candidates');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const format = useFormatter();
  const { addToast } = useToast();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: [],
    department: [],
    location: [],
    experience: { min: 0, max: 20 }
  });
  const router = useRouter();

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await getCandidates();
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
  }, [addToast]);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    applyFilters(searchTerm, newFilters);
  };

  const applyFilters = (search: string, currentFilters: any) => {
    let filtered = [...candidates];

    // Apply search
    if (search) {
      filtered = filtered.filter(candidate =>
        candidate.firstName.toLowerCase().includes(search.toLowerCase()) ||
        candidate.lastName.toLowerCase().includes(search.toLowerCase()) ||
        candidate.email.toLowerCase().includes(search.toLowerCase()) ||
        candidate.position.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (currentFilters.status.length > 0) {
      filtered = filtered.filter(candidate =>
        currentFilters.status.includes(candidate.status)
      );
    }

    // Apply experience filter
    filtered = filtered.filter(candidate =>
      candidate.experience >= currentFilters.experience.min &&
      candidate.experience <= currentFilters.experience.max
    );

    setFilteredCandidates(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters(value, filters);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
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
      actions={
        <div className='flex space-x-3'>
          <Button
            variant='outline'
            onClick={() => {
              exportToCSV(candidates, 'candidates-data');
              addToast('success', 'Candidates data exported successfully');
            }}
            className='flex items-center space-x-2'
          >
            <span>{tCommon('export')}</span>
          </Button>
          <Button
            variant='outline'
            onClick={() => setShowFilters(true)}
            className='flex items-center space-x-2'
          >
            <Filter className='w-4 h-4' />
            <span>{t('filters')}</span>
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Search and Stats */}
        <div className='flex items-center justify-between'>
          <div className='relative flex-1 max-w-md'>
            <Search className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className='pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <div className='text-sm text-gray-600'>
            {t('count', { count: filteredCandidates.length })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>
                {candidates.filter(c => c.status === 'applied').length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.newApplications')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-yellow-600'>
                {candidates.filter(c => c.status === 'screening').length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.inScreening')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-purple-600'>
                {candidates.filter(c => c.status === 'interview').length}
              </p>
              <p className='text-sm text-gray-600'>{t('stats.inInterview')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>
                {candidates.filter(c => c.status === 'offer').length}
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

        {/* Filter Panel */}
        <FilterPanel
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </AdminLayout>
  );
}
