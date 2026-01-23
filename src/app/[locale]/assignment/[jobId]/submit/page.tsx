'use client'

import { useEffect, useState, useRef } from 'react';
import { getJob } from '@/actions/jobs';
import { Job } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createAssignment } from '@/actions/assignments';
import { useToast } from '@/context/ToastContext';
import { Loader2, Upload, Video, Link, FileText, Trash2, Plus } from 'lucide-react';

export default function AssignmentSubmitPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [textFields, setTextFields] = useState('');
  const [linkFields, setLinkFields] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [applicationId, setApplicationId] = useState<string>('');
  const router = useRouter();
  const t = useTranslations('Assignment');
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get application ID from URL search params or localStorage
    const searchParams = new URLSearchParams(window.location.search);
    const appId = searchParams.get('applicationId') || localStorage.getItem('currentApplicationId');
    
    if (!appId) {
      addToast('error', 'No application ID found');
      router.push(`/assignment/${params.jobId}`);
      return;
    }
    
    setApplicationId(appId);

    async function fetchJob() {
      try {
        const jobData = await getJob(params.jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
        addToast('error', 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [params.jobId, addToast, router]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        addToast('error', 'Please select a video file');
      }
    }
  };

  const uploadVideo = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Video upload error:', error);
      addToast('error', 'Failed to upload video');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!job) return;

    const assignmentType = (job as any)?.assignment_type || 'text_only';
    const required = !!(job as any)?.assignment_required;

    // Validation based on assignment type
    if (required) {
      if (assignmentType === 'text_only' && !textFields.trim()) {
        addToast('error', 'Assignment text is required');
        return;
      }
      if (assignmentType === 'text_and_links' && (!textFields.trim() || linkFields.length === 0)) {
        addToast('error', 'Both text and links are required');
        return;
      }
      if (assignmentType === 'video_upload' && !videoFile) {
        addToast('error', 'Video upload is required');
        return;
      }
    }

    setSubmitting(true);

    try {
      let videoUrl: string | null = '';
      if (videoFile) {
        videoUrl = await uploadVideo(videoFile);
        if (!videoUrl) {
          setSubmitting(false);
          return;
        }
      }

      // Create assignment submission
      const assignmentData = {
        application_id: applicationId,
        type: assignmentType,
        text_fields: textFields || undefined,
        link_fields: assignmentType === 'text_and_links' ? linkFields : 
                    assignmentType === 'video_upload' && videoUrl ? [videoUrl] : undefined,
      };

      const result = await createAssignment(assignmentData as any);

      if (!result.ok) {
        addToast('error', result.error || 'Failed to submit assignment');
        return;
      }

      addToast('success', 'Assignment submitted successfully!');
      router.push(`/assignment/${params.jobId}/success?applicationId=${applicationId}`);
    } catch (error) {
      console.error('Assignment submission error:', error);
      addToast('error', 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return <div>Job not found.</div>;
  }

  const assignmentType = (job as any)?.assignment_type || 'text_only';
  const assignmentDescription = (job as any)?.assignment_description || '';

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">{t('submitAssignment')}</h1>
        <p className="text-lg mb-2">{t('job')}: {job.title}</p>
        
        {assignmentDescription && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">{t('assignmentTask')}</h3>
            <p className="text-gray-700">{assignmentDescription}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Text Input */}
          {(assignmentType === 'text_only' || assignmentType === 'text_and_links') && (
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('assignmentText')}
              </Label>
              <Textarea
                value={textFields}
                onChange={(e) => setTextFields(e.target.value)}
                placeholder="Enter your assignment response..."
                rows={6}
                className="mt-2"
              />
            </div>
          )}

          {/* Links Input */}
          {assignmentType === 'text_and_links' && (
            <div>
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                {t('assignmentLinks')}
              </Label>
              <div className="space-y-2 mt-2">
                {linkFields.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...linkFields];
                        newLinks[index] = e.target.value;
                        setLinkFields(newLinks);
                      }}
                      placeholder="https://github.com/your-repo"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLinkFields(linkFields.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setLinkFields([...linkFields, ''])}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </div>
          )}

          {/* Video Upload */}
          {assignmentType === 'video_upload' && (
            <div>
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                {t('uploadVideo')}
              </Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Video File
                    </>
                  )}
                </Button>
                {videoFile && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">Selected: {videoFile.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => router.push(`/assignment/${params.jobId}`)}
            disabled={submitting}
          >
            {t('back')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              t('submitAssignment')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}