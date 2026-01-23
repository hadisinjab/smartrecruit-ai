'use client'

import { useEffect, useState } from 'react';
import { getJob } from '@/actions/jobs';
import { Job } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function AssignmentSuccessPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations('Assignment');

  useEffect(() => {
    async function fetchJob() {
      try {
        const jobData = await getJob(params.jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [params.jobId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl text-center">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-green-700">
          {t('assignmentSubmitted')}
        </h1>
        
        <p className="text-lg mb-2">
          {t('thankYouForCompleting')}
        </p>
        
        {job && (
          <p className="text-md mb-6 text-gray-600">
            {t('job')}: {job.title}
          </p>
        )}
        
        <p className="text-sm text-gray-500 mb-8">
          {t('assignmentReceived')}
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            {t('backToHome')}
          </Button>
          <Button
            onClick={() => router.push('/jobs')}
          >
            {t('browseJobs')}
          </Button>
        </div>
      </div>
    </div>
  );
}