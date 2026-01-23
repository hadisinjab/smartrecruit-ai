
'use client'

import { useEffect, useState } from 'react';
import { getJob } from '@/actions/jobs';
import { getApplicationIdByEmail } from '@/actions/applications';
import { Job } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/context/ToastContext';

export default function AssignmentWelcomePage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const t = useTranslations('Assignment');
  const { addToast } = useToast();

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
    return <div>Loading...</div>;
  }

  if (!job) {
    return <div>Job not found.</div>;
  }

  const handleStartAssignment = async () => {
    if (!email) {
      addToast('error', t('emailIsRequired'));
      return;
    }

    const { applicationId, error } = await getApplicationIdByEmail(params.jobId, email);

    if (error || !applicationId) {
      addToast('error', t('applicationNotFound'));
    } else {
      router.push(`/assignment/${params.jobId}/submit?applicationId=${applicationId}`);
    }
  };

  return (
    <div className="container mx-auto p-4 text-center max-w-md">
      <h1 className="text-3xl font-bold mb-4">{t('welcomeTitle')}</h1>
      <p className="text-lg mb-2">{t('job')}: {job.title}</p>
      <p className="text-md mb-6">{t('jobDescription')}</p>
      
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('enterYourEmail')}
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="w-full"
        />
      </div>

      <Button onClick={handleStartAssignment} className="w-full">{t('startAssignment')}</Button>
    </div>
  );
}
