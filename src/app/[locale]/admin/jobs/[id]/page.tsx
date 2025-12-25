'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { getJob } from '@/actions/jobs';
import { useUser } from '@/context/UserContext';
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Briefcase,
  Award,
  CheckCircle,
  Building
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { isReviewer, isSuperAdmin, isAdmin, user } = useUser();

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      try {
        setLoading(true);
        // Using getJob which handles permissions internally
        const jobData = await getJob(jobId);
        if (isMounted) {
          setJob(jobData);
        }
      } catch (error) {
        console.error('Failed to load job:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (jobId) {
      loadJob();
    }

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  if (loading) {
    return (
      <AdminLayout title="Job Details">
        <div className="flex justify-center items-center h-64">
           <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout title="Job Details">
         <div className='text-center py-12'>
           <h2 className='text-2xl font-bold text-gray-900 mb-2'>Job Not Found</h2>
           <p className='text-gray-600 mb-4'>The job you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
           <Button onClick={() => router.push('/admin/jobs')}>
             Back to Jobs
           </Button>
         </div>
      </AdminLayout>
    );
  }

  // Determine if user can edit
  const canEdit = isSuperAdmin || (isAdmin && job.created_by === user?.id) || (isAdmin && !job.created_by); // Allow edit if owner or if no owner set (legacy) but ideally strictly check org

  // Helper functions for safe rendering
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string | undefined) => {
    return (name || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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

  const status = job.status || 'draft';
  const type = job.type || 'full-time';

  return (
    <AdminLayout
      title={job.title || 'Untitled Job'}
      subtitle={job.department || 'General'}
      actions={
        <div className='flex space-x-3'>
          {canEdit && (
            <Button variant='outline' onClick={() => router.push(`/admin/jobs/${jobId}/edit`)}>
              <Edit3 className='w-4 h-4 mr-2' />
              Edit Job
            </Button>
          )}
          <Button variant='outline'>
            View Applications
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header with Navigation */}
        <div className='flex items-center space-x-4'>
          <Button
            variant='ghost'
            onClick={() => router.push('/admin/jobs')}
            className='flex items-center space-x-2'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>Back to Jobs</span>
          </Button>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Job Overview */}
            <Card className='p-6'>
              <div className='flex items-start justify-between mb-6'>
                <div>
                  <h1 className='text-2xl font-bold text-gray-900 mb-2'>{job.title}</h1>
                  <p className='text-lg text-gray-600'>{job.department}</p>
                </div>
                <div className='flex space-x-2'>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(type)}`}>
                    {type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>
              </div>

              {/* Job Meta Information */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <div className='flex items-center space-x-3'>
                  <MapPin className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{job.location || 'Remote'}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Clock className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Calendar className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>Deadline {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Users className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>0 applicants</span>
                </div>
              </div>

              {/* Salary */}
              <div className='border-t border-gray-200 pt-4 mb-6'>
                <div className='flex items-center space-x-3 mb-2'>
                  <DollarSign className='w-5 h-5 text-gray-400' />
                  <span className='text-lg font-semibold text-gray-900'>
                    ${(job.salary_min || 0).toLocaleString()} - ${(job.salary_max || 0).toLocaleString()} {job.salary_currency || 'USD'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className='border-t border-gray-200 pt-4'>
                <h3 className='text-lg font-semibold text-gray-900 mb-3'>Job Description</h3>
                <p className='text-gray-700 leading-relaxed'>{job.description || 'No description provided.'}</p>
              </div>
            </Card>

            {/* Requirements */}
            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>Requirements</h3>
              <ul className='space-y-2'>
                {(job.requirements || []).map((requirement: string, index: number) => (
                  <li key={index} className='flex items-start space-x-3'>
                    <CheckCircle className='w-5 h-5 text-green-600 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-700'>{requirement}</span>
                  </li>
                ))}
                {(!job.requirements || job.requirements.length === 0) && (
                  <li className='text-gray-500 italic'>No requirements listed.</li>
                )}
              </ul>
            </Card>

            {/* Benefits */}
            <Card className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>Benefits & Perks</h3>
              <ul className='space-y-2'>
                {(job.benefits || []).map((benefit: string, index: number) => (
                  <li key={index} className='flex items-start space-x-3'>
                    <Award className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-700'>{benefit}</span>
                  </li>
                ))}
                {(!job.benefits || job.benefits.length === 0) && (
                  <li className='text-gray-500 italic'>No benefits listed.</li>
                )}
              </ul>
            </Card>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Job Stats */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Job Statistics</h2>
              <div className='space-y-4'>
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <Users className='w-4 h-4 text-gray-600' />
                    <span className='text-sm font-medium text-gray-700'>Total Applicants</span>
                  </div>
                  <span className='text-lg font-bold text-gray-900'>{job.applicantsCount || 0}</span>
                </div>
                
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <Calendar className='w-4 h-4 text-gray-600' />
                    <span className='text-sm font-medium text-gray-700'>Days Since Posted</span>
                  </div>
                  <span className='text-lg font-bold text-gray-900'>
                    {job.postedDate ? Math.floor((new Date().getTime() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </span>
                </div>
                
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <Clock className='w-4 h-4 text-gray-600' />
                    <span className='text-sm font-medium text-gray-700'>Days Until Deadline</span>
                  </div>
                  <span className='text-lg font-bold text-gray-900'>
                    {job.deadline ? Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Hiring Manager */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Hiring Manager</h2>
              <div className='flex items-center space-x-3'>
                <div className='w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center'>
                  <span className='text-white font-medium'>
                    {getInitials(job.hiringManager)}
                  </span>
                </div>
                <div>
                  <p className='font-medium text-gray-900'>{job.hiringManager || 'Unknown'}</p>
                  <p className='text-sm text-gray-600'>Hiring Manager</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Quick Actions</h2>
              <div className='space-y-2'>
                <Button variant='outline' className='w-full justify-start'>
                  <Users className='w-4 h-4 mr-2' />
                  View All Applications
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Edit3 className='w-4 h-4 mr-2' />
                  Edit Job Details
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Briefcase className='w-4 h-4 mr-2' />
                  Duplicate Job
                </Button>
                <Button variant='outline' className='w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50'>
                  Close Job
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
