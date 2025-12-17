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
import Link from 'next/link';

export default function AdminDashboard() {
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
      title: 'Candidate',
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
      title: 'Status',
      render: (status) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    },
    {
      key: 'appliedDate',
      title: 'Applied',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      key: 'rating',
      title: 'Rating',
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
      title: 'Review Applications',
      description: 'Review new candidate applications',
      icon: FileText,
      href: '/admin/candidates',
      color: 'blue' as const
    },
    {
      title: 'Manage Jobs',
      description: 'Create and manage job postings',
      icon: Briefcase,
      href: '/admin/jobs',
      color: 'green' as const
    },
    {
      title: 'Schedule Interviews',
      description: 'Schedule upcoming interviews',
      icon: Clock,
      href: '/admin/evaluations',
      color: 'purple' as const
    },
    {
      title: 'View Reports',
      description: 'Analyze hiring metrics',
      icon: TrendingUp,
      href: '/admin/reports',
      color: 'yellow' as const
    }
  ];

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Overview of your hiring pipeline"
    >
      <div className='space-y-6'>
        {/* Stats Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <StatsCard
            title="Total Candidates"
            value={stats.totalCandidates}
            change={{ value: 12, type: 'increase' }}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Active Jobs"
            value={stats.activeJobs}
            change={{ value: 8, type: 'increase' }}
            icon={Briefcase}
            color="green"
          />
          <StatsCard
            title="New Applications"
            value={stats.newApplications}
            change={{ value: 15, type: 'increase' }}
            icon={FileText}
            color="purple"
          />
          <StatsCard
            title="Interviews Scheduled"
            value={stats.interviewsScheduled}
            change={{ value: 5, type: 'increase' }}
            icon={Clock}
            color="yellow"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Quick Actions</h2>
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
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Recent Candidates */}
          <Card className='p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-gray-900'>Recent Candidates</h2>
              <Link href='/admin/candidates' className='text-sm text-blue-600 hover:text-blue-700'>
                View all
              </Link>
            </div>
            <DataTable
              data={mockCandidates.slice(0, 5)}
              columns={recentCandidatesColumns}
              emptyText="No recent candidates"
            />
          </Card>

          {/* Key Metrics */}
          <Card className='p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>Key Metrics</h2>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <CheckCircle className='w-5 h-5 text-green-600' />
                  <span className='font-medium text-gray-900'>Offers Made</span>
                </div>
                <span className='text-2xl font-bold text-gray-900'>{stats.offersMade}</span>
              </div>
              
              <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <Users className='w-5 h-5 text-blue-600' />
                  <span className='font-medium text-gray-900'>Successful Hires</span>
                </div>
                <span className='text-2xl font-bold text-gray-900'>{stats.hires}</span>
              </div>
              
              <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <XCircle className='w-5 h-5 text-red-600' />
                  <span className='font-medium text-gray-900'>Rejection Rate</span>
                </div>
                <span className='text-2xl font-bold text-gray-900'>{stats.rejectionRate}%</span>
              </div>
              
              <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <Clock className='w-5 h-5 text-purple-600' />
                  <span className='font-medium text-gray-900'>Avg. Time to Hire</span>
                </div>
                <span className='text-2xl font-bold text-gray-900'>{stats.averageTimeToHire} days</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
