'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { mockJobs } from '@/data/mockData';
import { Job } from '@/types/admin';
import { Plus, Search, MapPin, Calendar, Users } from 'lucide-react';

export default function JobsPage() {
  const t = useTranslations('Jobs');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const tCommon = useTranslations('Common');
  const format = useFormatter();

  const [jobs] = useState<Job[]>(mockJobs);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-purple-100 text-purple-800',
      'contract': 'bg-orange-100 text-orange-800',
      'internship': 'bg-pink-100 text-pink-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const jobColumns: Column<Job>[] = [
    {
      key: 'title',
      title: tTable('jobTitle'),
      render: (title, record) => (
        <div>
          <p className='font-medium text-gray-900'>{title}</p>
          <p className='text-sm text-gray-500'>{record.department}</p>
        </div>
      )
    },
    {
      key: 'location',
      title: tTable('location'),
      render: (location) => (
        <div className='flex items-center space-x-1'>
          <MapPin className='w-4 h-4 text-gray-400' />
          <span className='text-sm text-gray-700'>{location}</span>
        </div>
      )
    },
    {
      key: 'type',
      title: tTable('type'),
      render: (value) => {
        const type = value as string;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
            {type.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: tTable('status'),
      render: (status) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {tStatus(status as any)}
        </span>
      )
    },
    {
      key: 'salary',
      title: tTable('salaryRange'),
      render: (salary) => (
        <div>
          <p className='text-sm font-medium text-gray-900'>
            ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}
          </p>
          <p className='text-xs text-gray-500'>{salary.currency}</p>
        </div>
      )
    },
    {
      key: 'applicantsCount',
      title: tTable('applicants'),
      render: (count) => (
        <div className='flex items-center space-x-1'>
          <Users className='w-4 h-4 text-gray-400' />
          <span className='text-sm text-gray-700'>{count}</span>
        </div>
      )
    },
    {
      key: 'postedDate',
      title: tTable('posted'),
      render: (date) => (
        <div className='flex items-center space-x-1'>
          <Calendar className='w-4 h-4 text-gray-400' />
          <span className='text-sm text-gray-700'>
            {format.dateTime(new Date(date), {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric'
            })}
          </span>
        </div>
      ),
      sortable: true
    }
  ];

  // Calculate stats
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => job.status === 'active').length,
    totalApplicants: jobs.reduce((sum, job) => sum + job.applicantsCount, 0),
    avgApplicantsPerJob: Math.round(jobs.reduce((sum, job) => sum + job.applicantsCount, 0) / jobs.length)
  };

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className='flex space-x-3'>
          <Button variant='outline'>
            {t('exportData')}
          </Button>
          <Button className='flex items-center space-x-2'>
            <Plus className='w-4 h-4' />
            <span>{t('createJob')}</span>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <div className='text-sm text-gray-600'>
            {t('count', { count: filteredJobs.length, total: jobs.length })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>{stats.totalJobs}</p>
              <p className='text-sm text-gray-600'>{t('stats.totalJobs')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.activeJobs}</p>
              <p className='text-sm text-gray-600'>{t('stats.activeJobs')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-purple-600'>{stats.totalApplicants}</p>
              <p className='text-sm text-gray-600'>{t('stats.totalApplicants')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-yellow-600'>{stats.avgApplicantsPerJob}</p>
              <p className='text-sm text-gray-600'>{t('stats.avgApplicants')}</p>
            </div>
          </Card>
        </div>

        {/* Jobs Table */}
        <DataTable
          data={filteredJobs}
          columns={jobColumns}
          onRowClick={(job) => router.push(`/admin/jobs/${job.id}`)}
          emptyText="No jobs found"
        />
      </div>
    </AdminLayout>
  );
}
