'use client';

import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card } from '@/components/ui/admin-card';
import { mockDashboardStats, mockCandidates } from '@/data/mockData';
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Candidate } from '@/types/admin';
import { Link } from '@/i18n/navigation';
import { useFormatter, useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const format = useFormatter();
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const tStatus = useTranslations('Status');
  const stats = mockDashboardStats;

  const getStatusColor = (status: string) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const recentCandidatesColumns: Column<Candidate>[] = [
    {
      key: 'name',
      title: tTable('candidate'),
      render: (_, record) => (
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-xs font-medium'>
              {record.firstName[0]}{record.lastName[0]}
            </span>
          </div>
          <div>
            <p className='font-medium text-gray-900'>
              {record.firstName} {record.lastName}
            </p>
            <p className='text-sm text-gray-500'>{record.position}</p>
          </div>
        </div>
      )
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
      key: 'appliedDate',
      title: tTable('applied'),
      render: (date) => format.dateTime(new Date(date), {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })
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
    }
  ];

  const quickActions = [
    {
      title: t('reviewApplications'),
      description: t('reviewApplicationsDesc'),
      icon: FileText,
      href: '/admin/candidates',
      color: 'blue' as const
    },
    {
      title: t('manageJobs'),
      description: t('manageJobsDesc'),
      icon: Briefcase,
      href: '/admin/jobs',
      color: 'green' as const
    },
    {
      title: t('scheduleInterviews'),
      description: t('scheduleInterviewsDesc'),
      icon: Clock,
      href: '/admin/evaluations',
      color: 'purple' as const
    },
    {
      title: t('viewReports'),
      description: t('viewReportsDesc'),
      icon: TrendingUp,
      href: '/admin/reports',
      color: 'yellow' as const
    }
  ];

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className='space-y-6'>
        {/* Stats Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <StatsCard
            title={t('totalCandidates')}
            value={stats.totalCandidates}
            icon={Users}
            trend={{ value: 12, label: t('fromLastMonth'), isPositive: true }}
            color='blue'
          />
          <StatsCard
            title={t('activeJobs')}
            value={stats.activeJobs}
            icon={Briefcase}
            trend={{ value: 8, label: t('fromLastMonth'), isPositive: true }}
            color='green'
          />
          <StatsCard
            title={t('newApplications')}
            value={stats.newApplications}
            icon={FileText}
            trend={{ value: 15, label: t('fromLastMonth'), isPositive: true }}
            color='purple'
          />
          <StatsCard
            title={t('interviewsScheduled')}
            value={stats.interviewsScheduled}
            icon={Clock}
            trend={{ value: 5, label: t('fromLastMonth'), isPositive: true }}
            color='yellow'
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('quickActions')}</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className='p-6 hover:shadow-md transition-shadow cursor-pointer'>
                  <div className='flex items-center space-x-3'>
                    <div className={`p-2 rounded-lg ${
                      action.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                      action.color === 'green' ? 'bg-green-50 text-green-600' :
                      action.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                      'bg-yellow-50 text-yellow-600'
                    }`}>
                      <action.icon className='w-5 h-5' />
                    </div>
                    <div>
                      <h3 className='font-medium text-gray-900'>{action.title}</h3>
                      <p className='text-sm text-gray-500'>{action.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity & Metrics */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Key Metrics */}
          <Card className='p-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>{t('keyMetrics')}</h3>
            <div className='space-y-6'>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-gray-600'>{t('offersMade')}</span>
                  <span className='text-lg font-bold text-gray-900'>{stats.offersMade}</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div className='bg-green-500 h-2 rounded-full' style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-gray-600'>{t('successfulHires')}</span>
                  <span className='text-lg font-bold text-gray-900'>{stats.hires}</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div className='bg-blue-500 h-2 rounded-full' style={{ width: '60%' }}></div>
                </div>
              </div>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-gray-600'>{t('rejectionRate')}</span>
                  <span className='text-lg font-bold text-gray-900'>12%</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div className='bg-red-500 h-2 rounded-full' style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Candidates Table */}
          <div className='lg:col-span-2'>
            <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
              <div className='p-6 border-b border-gray-200 flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>{t('recentCandidates')}</h3>
                <Link href='/admin/candidates' className='text-sm text-blue-600 hover:text-blue-700 font-medium'>
                  {tCommon('viewAll')}
                </Link>
              </div>
              <DataTable
                data={mockCandidates.slice(0, 5)}
                columns={recentCandidatesColumns}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
