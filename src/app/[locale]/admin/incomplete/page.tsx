'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getIncompleteApplications } from '@/actions/incomplete';
import { IncompleteApplication } from '@/types/admin';
import {
  Search,
  Mail,
  Clock,
  Calendar,
  Phone,
  MapPin,
  Eye,
  MoreVertical
} from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import type { Column } from '@/components/admin/DataTable';
import { useToast } from '@/context/ToastContext';

export default function IncompleteApplicationsPage() {
  const t = useTranslations('Incomplete');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const tProgress = useTranslations('Progress');
  const format = useFormatter();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [incompleteApps, setIncompleteApps] = useState<IncompleteApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getIncompleteApplications();
        setIncompleteApps(data);
      } catch (error) {
        console.error('Failed to load incomplete applications:', error);
        addToast('error', 'Failed to load incomplete applications');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addToast]);

  // Filter applications based on search and filters
  const filteredApplications = incompleteApps.filter(app => {
    const matchesSearch = 
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJob = jobFilter === 'all' || app.position.toLowerCase().includes(jobFilter.toLowerCase());
    
    // Date filtering
    const appDate = new Date(app.appliedDate);
    let matchesDate = true;
    if (dateFilter === 'today') {
      const today = new Date();
      matchesDate = appDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = appDate >= weekAgo;
    }
    
    // Progress filtering
    let matchesProgress = true;
    if (progressFilter === 'low') {
      matchesProgress = app.completionPercentage < 50;
    } else if (progressFilter === 'medium') {
      matchesProgress = app.completionPercentage >= 50 && app.completionPercentage < 80;
    } else if (progressFilter === 'high') {
      matchesProgress = app.completionPercentage >= 80;
    }
    
    return matchesSearch && matchesJob && matchesDate && matchesProgress;
  });

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'text-red-600 bg-red-50';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressBadgeColor = (percentage: number) => {
    if (percentage < 50) return 'bg-red-100 text-red-800';
    if (percentage < 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const columns: Column<IncompleteApplication>[] = [
    {
      key: 'candidate',
      title: tTable('candidate'),
      render: (_, record) => (
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-medium'>
              {record.firstName[0]}{record.lastName[0]}
            </span>
          </div>
          <div>
            <p className='font-medium text-gray-900'>
              {record.firstName} {record.lastName}
            </p>
            <p className='text-sm text-gray-500'>{record.position}</p>
            <div className='flex items-center space-x-1 mt-1'>
              <MapPin className='w-3 h-3 text-gray-400' />
              <span className='text-xs text-gray-500'>{record.location}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      title: tTable('contact'),
      render: (_, record) => (
        <div className='space-y-1'>
          <div className='flex items-center space-x-1'>
            <Phone className='w-3 h-3 text-gray-400' />
            <span className='text-sm text-gray-600'>{record.phone}</span>
          </div>
          <div className='flex items-center space-x-1'>
            <Calendar className='w-3 h-3 text-gray-400' />
            <span className='text-sm text-gray-600'>
              {tTable('applied')} {new Date(record.appliedDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'progress',
      title: tTable('progress'),
      render: (_, record) => (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-900'>
              {record.completionPercentage}%
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProgressBadgeColor(record.completionPercentage)}`}>
              {record.completionPercentage < 50 ? tProgress('low') : 
               record.completionPercentage < 80 ? tProgress('medium') : tProgress('high')}
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div 
              className={`h-2 rounded-full ${
                record.completionPercentage < 50 ? 'bg-red-500' :
                record.completionPercentage < 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${record.completionPercentage}%` }}
            ></div>
          </div>
          <div className='flex space-x-2 text-xs text-gray-500'>
            <span className={record.progress.personalInfo ? 'text-green-600' : 'text-gray-400'}>
              {tProgress('personal')}
            </span>
            <span className={record.progress.experience ? 'text-green-600' : 'text-gray-400'}>
              {tProgress('experience')}
            </span>
            <span className={record.progress.documents ? 'text-green-600' : 'text-gray-400'}>
              {tProgress('documents')}
            </span>
            <span className={record.progress.questionnaire ? 'text-green-600' : 'text-gray-400'}>
              {tProgress('questionnaire')}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'timeSpent',
      title: tTable('timeSpent'),
      render: (_, record) => (
        <div className='text-center'>
          <div className='flex items-center justify-center space-x-1 text-gray-600'>
            <Clock className='w-4 h-4' />
            <span className='text-sm'>{record.timeSpent}{tCommon('min')}</span>
          </div>
          <p className='text-xs text-gray-500 mt-1'>
            {tCommon('last')}: {new Date(record.lastActivity).toLocaleDateString()}
          </p>
        </div>
      )
    },
    {
      key: 'actions',
      title: tTable('actions'),
      render: (_, record) => (
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            className='flex items-center space-x-1'
            onClick={() => {
              addToast('success', `Reminder sent to ${record.firstName} ${record.lastName}`);
            }}
          >
            <Mail className='w-3 h-3' />
            <span>{tTable('remind')}</span>
          </Button>
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
            <Eye className='w-4 h-4' />
          </Button>
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
            <MoreVertical className='w-4 h-4' />
          </Button>
        </div>
      )
    }
  ];

  const getUniqueJobs = () => {
    const jobs = [...new Set(incompleteApps.map(app => app.position))];
    return jobs;
  };

  const stats = {
    total: incompleteApps.length,
    lowProgress: incompleteApps.filter(app => app.completionPercentage < 50).length,
    mediumProgress: incompleteApps.filter(app => app.completionPercentage >= 50 && app.completionPercentage < 80).length,
    highProgress: incompleteApps.filter(app => app.completionPercentage >= 80).length
  };

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('count', { count: filteredApplications.length })}
      actions={
        <Button className='flex items-center space-x-2'>
          <Mail className='w-4 h-4' />
          <span>{t('sendReminders')}</span>
        </Button>
      }
    >
      <div className='space-y-6'>
        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
              <p className='text-sm text-gray-600'>{t('stats.total')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-red-600'>{stats.lowProgress}</p>
              <p className='text-sm text-gray-600'>{t('stats.low')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-yellow-600'>{stats.mediumProgress}</p>
              <p className='text-sm text-gray-600'>{t('stats.medium')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.highProgress}</p>
              <p className='text-sm text-gray-600'>{t('stats.high')}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className='p-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder={t('filters.job')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allJobs')}</SelectItem>
                {getUniqueJobs().map(job => (
                  <SelectItem key={job} value={job}>{job}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder={t('filters.date')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allTime')}</SelectItem>
                <SelectItem value="today">{t('filters.today')}</SelectItem>
                <SelectItem value="week">{t('filters.week')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={progressFilter} onValueChange={setProgressFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder={t('filters.progress')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allProgress')}</SelectItem>
                <SelectItem value="low">{t('stats.low')}</SelectItem>
                <SelectItem value="medium">{t('stats.medium')}</SelectItem>
                <SelectItem value="high">{t('stats.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Applications Table */}
        <Card className='p-6'>
          <DataTable
            data={filteredApplications}
            columns={columns}
            emptyText={t('empty')}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
