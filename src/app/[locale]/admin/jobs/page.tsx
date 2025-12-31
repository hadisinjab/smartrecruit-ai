'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { Column } from '@/components/admin/DataTable';
import { Card } from '@/components/ui/admin-card';
import { deleteJob, getJobs } from '@/actions/jobs';
import { Job } from '@/types/admin';
import { Plus, Search, MapPin, Calendar, Users, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/utils/exportUtils';
import { useUser } from '@/context/UserContext';
import { useSearch } from '@/context/SearchContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function JobsPage() {
  const t = useTranslations('Jobs');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const tCommon = useTranslations('Common');
  const { addToast } = useToast();
  const { isReviewer, isSuperAdmin } = useUser();
  const { searchTerm } = useSearch();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await getJobs();
        // Data is already formatted in getJobs action
        setJobs(data);
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

  const isJobExpired = (job: Job) => {
    if (!job.deadline) return false
    const ts = new Date(job.deadline).getTime()
    if (Number.isNaN(ts)) return false
    return ts <= Date.now()
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
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
            {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
        );
      }
    },
    {
      key: 'creatorName',
      title: tTable('createdBy'),
      render: (creatorName) => (
        <span className='text-sm text-gray-700 font-medium'>
          {creatorName || 'Unknown'}
        </span>
      )
    },
    ...(isSuperAdmin ? [{
      key: 'organizationName',
      title: tTable('organization'),
      render: (orgName: any) => (
        <span className='text-sm text-gray-700 font-medium'>
          {orgName || 'Unknown'}
        </span>
      )
    }] : []),
    {
      key: 'status',
      title: tTable('status'),
      render: (status, record) => {
        const displayStatus =
          status === 'active' && isJobExpired(record)
            ? 'inactive' // deadline passed => treat as not active for admin UI
            : (status as any)

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
            {tStatus(displayStatus as any)}
          </span>
        )
      }
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
            {new Date(date).toLocaleDateString()}
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, job) => (
        <div className='flex items-center space-x-2' onClick={(e) => e.stopPropagation()}>
           <Button
             variant='ghost'
             size='sm'
             onClick={() => router.push(`/admin/jobs/${job.id}`)}
             className='text-blue-600 hover:text-blue-700 hover:bg-blue-50'
           >
             View
           </Button>
           {!isReviewer && (
             <Button
               variant='ghost'
               size='sm'
               onClick={() => router.push(`/admin/jobs/${job.id}/edit`)}
               className='text-green-600 hover:text-green-700 hover:bg-green-50'
             >
               Edit
             </Button>
           )}
           {!isReviewer && (
             <Button
               variant='ghost'
               size='sm'
               onClick={() => setJobToDelete(job)}
               className='text-red-600 hover:text-red-700 hover:bg-red-50'
             >
               <Trash2 className='w-4 h-4' />
             </Button>
           )}
        </div>
      )
    }
  ];

  // Calculate stats
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => job.status === 'active' && !isJobExpired(job)).length,
    totalApplicants: jobs.reduce((sum, job) => sum + job.applicantsCount, 0),
    avgApplicantsPerJob: jobs.length > 0 
      ? Math.round(jobs.reduce((sum, job) => sum + job.applicantsCount, 0) / jobs.length) 
      : 0
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
          {!isReviewer && (
            <Button 
              className='flex items-center space-x-2'
              onClick={() => router.push('/admin/jobs/new')}
            >
              <Plus className='w-4 h-4' />
              <span>{t('createJob')}</span>
            </Button>
          )}
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

      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('delete')} {jobToDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job and all related data (applications, answers, uploads, etc). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                if (!jobToDelete) return
                try {
                  setIsDeleting(true)
                  await deleteJob(jobToDelete.id)
                  addToast('success', 'Job deleted successfully')
                  // Reload list
                  setIsLoading(true)
                  const data = await getJobs()
                  setJobs(data)
                  setJobToDelete(null)
                } catch (err: any) {
                  addToast('error', err?.message || 'Failed to delete job')
                } finally {
                  setIsDeleting(false)
                  setIsLoading(false)
                }
              }}
            >
              {isDeleting ? tCommon('loading') : tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
