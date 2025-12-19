'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { getJobs } from '@/actions/jobs';
import { Job } from '@/types/admin';
import { Plus, Search, MapPin, Calendar, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/utils/exportUtils';
import { useUser } from '@/context/UserContext';
import { useSearch } from '@/context/SearchContext';

export default function JobsPage() {
  const t = useTranslations('Jobs');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const tCommon = useTranslations('Common');
  const format = useFormatter();
  const { addToast } = useToast();
  const { isReviewer } = useUser();
  const { searchTerm } = useSearch();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await getJobs();
        const formattedJobs: Job[] = data.map((job: any) => ({
          id: job.id,
          title: job.title,
          department: job.department || 'General',
          location: job.location || 'Remote',
          type: job.type || 'full-time',
          status: job.status,
          salary: {
            min: job.salary_min || 0,
            max: job.salary_max || 0,
            currency: job.salary_currency || 'USD'
          },
          description: job.description || '',
          requirements: job.requirements || [],
          benefits: job.benefits || [],
          postedDate: job.created_at, // Use created_at if posted_date is null
          deadline: job.deadline || '',
          applicantsCount: 0, // Need to implement count logic separately
          hiringManager: job.hiring_manager_name || 'Admin'
        }));
        setJobs(formattedJobs);
      } catch (error) {
        console.error('Failed to load jobs:', error);
        addToast('error', 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, [addToast]);

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
    ...(!isReviewer ? [{
      key: 'salary',
      title: tTable('salaryRange'),
      render: (salary: any) => (
        <div>
          <p className='text-sm font-medium text-gray-900'>
            ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}
          </p>
          <p className='text-xs text-gray-500'>{salary.currency}</p>
        </div>
      )
    }] : []),
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
          <Button 
            variant='outline'
            onClick={() => {
              exportToCSV(jobs, 'jobs-data');
              addToast('success', 'Jobs data exported successfully');
            }}
          >
            {t('exportData')}
          </Button>
          <Button 
            className='flex items-center space-x-2'
            onClick={() => router.push('/admin/jobs/new')}
          >
            <Plus className='w-4 h-4' />
            <span>{t('createJob')}</span>
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
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
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <DataTable
            data={filteredJobs}
            columns={jobColumns}
            onRowClick={(job) => router.push(`/admin/jobs/${job.id}`)}
            emptyText="No jobs found"
          />
        )}
      </div>
    </AdminLayout>
  );
}
