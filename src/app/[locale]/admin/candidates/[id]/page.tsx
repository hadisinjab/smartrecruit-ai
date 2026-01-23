'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Tabs from '@radix-ui/react-tabs';
import { getCandidateById, getCandidateForExport } from '@/actions/candidates';
import { addHrEvaluation, getHrEvaluation } from '@/actions/hr-evaluations';
import { Candidate, Evaluation } from '@/types/admin';
import { useToast } from '@/context/ToastContext';
import { getAssignmentsByApplication } from '@/actions/assignments';
import { InterviewsList } from '@/components/admin/interviews/InterviewsList';
import { InterviewDialog } from '@/components/admin/interviews/InterviewDialog';
import { transformCandidateToReviewerData, exportData } from '@/utils/exportUtils';
import { getSystemSettings } from '@/actions/settings';
import {
  ArrowLeft,
  Edit3,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Download,
  Star,
  Clock,
  User,
  Bot,
  CircleDollarSign
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';

export default function CandidateDetailsPage() {
  const t = useTranslations('Candidates');
  const tEval = useTranslations('Evaluations');
  const tCommon = useTranslations('Common');
  const tRec = useTranslations('Recommendation');
  const tStatus = useTranslations('Status');
  const tTable = useTranslations('Table');

  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { isReviewer } = useUser();
  const candidateId = params.id as string;
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  
  // Interview Dialog State
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  
  // HR Evaluation State
  const [hrEvaluation, setHrEvaluation] = useState<any>(null);
  const [isHrEditing, setIsHrEditing] = useState(false);
  const [editedHrEval, setEditedHrEval] = useState({
    hr_score: 0,
    hr_notes: '',
    hr_decision: 'Review',
    next_action_date: ''
  });

  useEffect(() => {
    async function loadCandidate() {
      try {
        const data = await getCandidateById(candidateId);
        if (data) {
          setCandidate(data as unknown as Candidate);
          const a = (data as any).answers || [];
          
          // Separate and sort answers
          const sortedAnswers = [...a].sort((a, b) => {
             // Fixed questions order priority
             const getPriority = (label: string) => {
               if (label === 'Age') return 1;
               if (label === 'Education') return 2;
               if (label === 'Expected Salary') return 3;
               if (label.startsWith('How experienced are you with')) return 4;
               return 5; // User defined questions come last
             };
             
             const priorityA = getPriority(a.label || a.questionId);
             const priorityB = getPriority(b.label || b.questionId);
             
             if (priorityA !== priorityB) {
               return priorityA - priorityB;
             }
             return 0; // Maintain original order for same priority
          });

          setAnswers(sortedAnswers);
          
          // Load existing AI evaluation if available
          const aiEval = (data as any).ai_evaluations?.[0] || null;
          if (aiEval) {
            // Ensure analysis is an object (in case it came as string from DB)
            if (typeof aiEval.analysis === 'string') {
              try {
                aiEval.analysis = JSON.parse(aiEval.analysis);
              } catch (e) {
                console.error('Failed to parse AI analysis JSON', e);
              }
            }
            setAiEvaluation(aiEval);
          }
        }
        
        const hrData = await getHrEvaluation(candidateId);
        if (hrData) {
          setHrEvaluation(hrData);
          setEditedHrEval({
            hr_score: hrData.hr_score || 0,
            hr_notes: hrData.hr_notes || '',
            hr_decision: hrData.hr_decision || 'Review',
            next_action_date: hrData.next_action_date || ''
          });

          // Keep HR Fields in sync with DB-backed HR evaluation fields
          setCandidate((prev) =>
            prev
              ? ({
                  ...prev,
                  hrFields: {
                    ...(prev as any).hrFields,
                    nextAction: hrData.hr_decision || (prev as any).hrFields?.nextAction,
                    nextActionDate: hrData.next_action_date || (prev as any).hrFields?.nextActionDate || null,
                    notes: hrData.hr_notes || (prev as any).hrFields?.notes,
                  },
                } as any)
              : prev
          )
        }
      } catch (error) {
        console.error('Failed to load candidate:', error);
        addToast('error', t('details.loadError'));
      } finally {
        setLoading(false);
      }
    }
    loadCandidate();
  }, [candidateId, addToast, t]);

  useEffect(() => {
    let isMounted = true
    async function loadAssignments() {
      setAssignmentsLoading(true)
      try {
        const res: any = await getAssignmentsByApplication(candidateId)
        if (!isMounted) return
        if (res?.ok) {
          setAssignments(res.data || [])
        } else {
          setAssignments([])
        }
      } catch (e) {
        console.error(e)
        if (isMounted) setAssignments([])
      } finally {
        if (isMounted) setAssignmentsLoading(false)
      }
    }
    loadAssignments()
    return () => {
      isMounted = false
    }
  }, [candidateId])

  // Polling for AI Analysis Results
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling && candidateId) {
      interval = setInterval(async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('ai_evaluations')
            .select('*')
            .eq('application_id', candidateId)
            .order('created_at', { ascending: false }) // Get latest
            .limit(1)
            .maybeSingle();
            
          if (data) {
             // Basic check: if we started polling recently, we expect a recent result.
             // But for now, just finding any result is a success signal if we were waiting.
             // You might want to check if data.created_at > analysisStartTime
             
             if (typeof data.analysis === 'string') {
                try { data.analysis = JSON.parse(data.analysis); } catch(e){}
             }
             
             setAiEvaluation(data);
             setPolling(false);
             setAiLoading(false);
             addToast('success', 'AI Analysis Result Ready!');
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 5000); // Check every 5s
    }
    return () => clearInterval(interval);
  }, [polling, candidateId, addToast]);

  const handleSaveHrEvaluation = async () => {
    try {
      // UI validation for date-only field when needed
      const decision = String(editedHrEval.hr_decision || '').toLowerCase()
      const needsDate = decision === 'interview' || decision === 'approve'
      if (needsDate && !editedHrEval.next_action_date) {
        addToast('error', t('details.pleaseSelectDate'))
        return
      }
      await addHrEvaluation(candidateId, editedHrEval);
      setHrEvaluation({ ...hrEvaluation, ...editedHrEval });
      setIsHrEditing(false);
      addToast('success', t('details.saveHrSuccess'));
      
      // Reload to get fresh data
      const hrData = await getHrEvaluation(candidateId);
      if (hrData) {
        setHrEvaluation(hrData);
        // Sync HR Fields card with DB
        setCandidate((prev) =>
          prev
            ? ({
                ...prev,
                hrFields: {
                  ...(prev as any).hrFields,
                  nextAction: hrData.hr_decision || (prev as any).hrFields?.nextAction,
                  nextActionDate: hrData.next_action_date || (prev as any).hrFields?.nextActionDate || null,
                  notes: hrData.hr_notes || (prev as any).hrFields?.notes,
                },
              } as any)
            : prev
        )
      }
      
    } catch (error) {
      console.error('Failed to save HR evaluation:', error);
      addToast('error', t('details.saveHrError'));
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-600'>{t('details.loading')}</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>{t('details.notFound')}</h2>
            <p className='text-gray-600 mb-4'>{t('details.notFoundDesc')}</p>
            <Button onClick={() => router.push('/admin/candidates')}>
              {t('details.backToCandidates')}
            </Button>
          </div>
      </div>
    );
  }

  // Evaluations are now part of the candidate object or fetched separately if needed
  // For now we'll assume they are not yet fully implemented in the backend response structure
  // or we need to adapt the UI to show what we have.
  const evaluations: Evaluation[] = []; // Placeholder until we fetch evaluations properly

  const getStatusColor = (status: string) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      duplicate: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const handleAnalyze = async () => {
    setAiLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
      const targetId = candidate.id; // In Candidate type, id IS the application ID
      console.log('Analyzing application:', targetId);
      const res = await fetch(`${apiUrl}/api/evaluation/analyze/${targetId}`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const data = await res.json();
      if (data.success) {
        if (data.processing) {
           addToast('info', 'AI Analysis Started in Background. This may take 1-2 minutes.');
           setPolling(true);
           // Keep loading state true until polling finishes
        } else if (data.evaluation) {
           setAiEvaluation(data.evaluation);
           addToast('success', 'AI Analysis Completed Successfully');
           setAiLoading(false);
        }
      } else {
        addToast('error', data.message || 'Analysis failed');
        setAiLoading(false);
      }
    } catch (e: any) {
      console.error(e);
      addToast('error', `Connection failed: ${e.message || 'Unknown error'}`);
      setAiLoading(false);
    }
  };

  const handleExport = async () => {
    if (!candidateId) return;
    try {
      const settings = await getSystemSettings();
      const exportFormat = settings?.export?.defaultFormat || 'csv';

      const fullCandidateData = await getCandidateForExport(candidateId);
      if (fullCandidateData) {
        const transformedData = transformCandidateToReviewerData(
          fullCandidateData,
          fullCandidateData.assignments || [],
          fullCandidateData.ai_evaluations?.[0] || null
        );
        exportData([transformedData], `candidate-${candidate?.firstName}-${candidate?.lastName}`, exportFormat);
      }
    } catch (error) {
      console.error('Failed to export candidate data:', error);
      addToast('error', t('exportError'));
    }
  };

  return (
    <AdminLayout
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={candidate.position}
      actions={
        <div className='flex space-x-3'>
          {/* Edit button removed */}
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header with Navigation */}
        <div className='flex items-center justify-between'>
          <Button
            variant='ghost'
            onClick={() => router.push('/admin/candidates')}
            className='flex items-center space-x-2'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>{t('details.backToCandidates')}</span>
          </Button>
          <Button variant='outline' onClick={handleExport}>
            <Download className='mr-2 h-4 w-4' />
            {t('export')}
          </Button>
        </div>

        <Tabs.Root defaultValue='applicant' className='space-y-6'>
          <Tabs.List className='flex border-b border-gray-200'>
            <Tabs.Trigger
              value='applicant'
              className='px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-gray-600 hover:text-gray-900 flex items-center'
            >
              <User className='w-4 h-4 mr-2' />
              Applicant Data
            </Tabs.Trigger>
            <Tabs.Trigger
              value='ai'
              className='px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 text-gray-600 hover:text-gray-900 flex items-center'
            >
              <Bot className='w-4 h-4 mr-2' />
              {tEval('aiEvaluation')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value='hr'
              className='px-4 py-2 -mb-px border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-gray-600 hover:text-gray-900 flex items-center'
            >
              <User className='w-4 h-4 mr-2' />
              {tEval('hrEvaluation')}
            </Tabs.Trigger>
          </Tabs.List>
          
          <Tabs.Content value='applicant' className='space-y-6'>
            <Card className='p-6'>
              <div className='flex items-start justify-between mb-6'>
                <div className='flex items-center space-x-4'>
                  <div className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center'>
                    <span className='text-white text-xl font-medium'>
                      {candidate.firstName[0]}{candidate.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h1 className='text-2xl font-bold text-gray-900'>
                      {candidate.firstName} {candidate.lastName}
                    </h1>
                    <p className='text-lg text-gray-600'>{candidate.position}</p>
                    <div className='flex items-center space-x-1 mt-1'>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < candidate.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.status)}`}>
                  {tStatus(candidate.status)}
                </span>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <div className='flex items-center space-x-3'>
                  <Mail className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{candidate.email}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Clock className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>
                    {(() => {
                      const s = (candidate as any)?.lastProgressStep
                      if (s === 'submitted') return tTable('stoppedSubmitted')
                      // legacy inferred values:
                      if (s === 'voice-recording') return tTable('stoppedVoice')
                      if (s === 'file-upload') return tTable('stoppedFile')
                      if (s === 'link-input') return tTable('stoppedLink')
                      if (s === 'application-info') return tTable('stoppedCandidate')
                      // apply-flow step ids:
                      if (s === 'candidate') return tTable('stoppedCandidate')
                      if (s === 'text-questions') return tTable('stoppedText')
                      if (s === 'media-questions') return tTable('stoppedMedia')
                      if (s === 'assignment') return tTable('stoppedAssignment')
                      if (s === 'review') return tTable('stoppedReview')
                      return s ? String(s) : `${tTable('stoppedAt')}: ${tTable('unknown')}`
                    })()}
                  </span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Phone className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{candidate.phone}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <MapPin className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{candidate.location}</span>
                </div>
                <div className='flex items-center space-x-3'>
                  <Calendar className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>
                    {t('details.appliedDate', { date: new Date(candidate.appliedDate).toLocaleDateString() })}
                  </span>
                </div>
                {(candidate as any).age ? (
                  <div className='flex items-center space-x-3'>
                    <User className='w-5 h-5 text-gray-400' />
                    <span className='text-gray-700'>
                      {(candidate as any).age} years old
                    </span>
                  </div>
                ) : null}
                {(candidate as any).experience ? (
                  <div className='flex items-center space-x-3'>
                    <FileText className='w-5 h-5 text-gray-400' />
                    <span className='text-gray-700'>
                      {(candidate as any).experience} years of experience
                    </span>
                  </div>
                ) : null}
                {!isReviewer && (candidate as any).desired_salary ? (
                  <div className='flex items-center space-x-3'>
                    <CircleDollarSign className='w-5 h-5 text-gray-400' />
                    <span className='text-gray-700'>
                      {(candidate as any).desired_salary}
                    </span>
                  </div>
                ) : null}
              </div>
              {/* Experience + Skills/Tags removed (not stored in DB) */}
            </Card>
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.formAnswers')}</h2>
              <div className='space-y-3'>
                {answers.length === 0 ? (
                  <p className='text-sm text-gray-600'>{t('details.noAnswers')}</p>
                ) : (
                  answers
                    .filter(ans => !(isReviewer && (ans.label === 'Desired Salary' || ans.label === 'الراتب المتوقع')))
                    .map((ans) => (
                    <div key={ans.id} className='p-3 border border-gray-200 rounded-lg'>
                      <p className='text-sm font-medium text-gray-900'>{ans.label || ans.questionId}</p>
                      <div className='mt-1'>
                        {ans.type === 'voice' ? (
                          ans.audioUrl ? (
                            <audio controls src={ans.audioUrl} className='w-full mt-2' />
                          ) : (
                            <p className='text-sm text-gray-700'>{t('details.voiceResponseRecorded')}</p>
                          )
                        ) : ans.type === 'file' ? (
                          ans.value ? (
                            <a
                              href={ans.value}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center space-x-2 text-blue-600 hover:underline break-all'
                            >
                              <FileText className='w-4 h-4' />
                              <span>{ans.fileName || t('details.downloadFile')}</span>
                            </a>
                          ) : (
                            <span className='text-sm text-gray-500'>{t('details.noFileProvided')}</span>
                          )
                        ) : ans.type === 'url' || ans.isUrl ? (
                          ans.value ? (
                            <a
                              href={ans.value}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center space-x-2 text-blue-600 hover:underline break-all'
                            >
                              <Globe className='w-4 h-4' />
                              <span>{ans.value}</span>
                            </a>
                          ) : (
                            <span className='text-sm text-gray-500'>{t('details.noLinkProvided')}</span>
                          )
                        ) : (
                          <p className='text-sm text-gray-700'>{ans.value || '—'}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Assignment Submissions */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.assignmentSubmissions')}</h2>

              {assignmentsLoading ? (
                <p className='text-sm text-gray-600'>{t('details.loadingAssignments')}</p>
              ) : assignments.length === 0 ? (
                <p className='text-sm text-gray-500 text-center'>{t('details.noAssignments')}</p>
              ) : (
                <div className='space-y-6'>
                  {assignments.map((a: any, index: number) => (
                    <div key={a.id} className='border border-gray-200 rounded-lg p-4'>
                      {assignments.length > 1 && (
                        <h4 className='font-medium mb-2'>{t('details.assignmentNumber', { number: index + 1 })}</h4>
                      )}

                      <div className='mb-4'>
                        <Label className='text-sm font-medium text-gray-700'>{t('details.solution')}:</Label>
                        <div className='mt-2 p-4 bg-gray-50 rounded-md border'>
                          <p className='whitespace-pre-wrap text-sm'>{a.text_fields || '—'}</p>
                        </div>
                        {a.text_fields && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              navigator.clipboard.writeText(String(a.text_fields))
                              addToast('success', t('details.copiedToClipboard'))
                            }}
                            className='mt-2'
                          >
                            📋 {t('details.copyToClipboard')}
                          </Button>
                        )}
                      </div>

                      {Array.isArray(a.link_fields) && a.link_fields.length > 0 && (
                        <div>
                          <Label className='text-sm font-medium text-gray-700'>{t('details.links')}:</Label>
                          <div className='mt-2 space-y-2'>
                            {a.link_fields.map((link: string, linkIndex: number) => (
                              <div key={linkIndex} className='flex items-center gap-2'>
                                <span className='text-sm text-gray-600'>🔗</span>
                                <a
                                  href={link}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-sm text-blue-600 hover:underline break-all'
                                >
                                  {link}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className='mt-4 text-xs text-gray-500'>
                        {t('details.submitted')} {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Interviews */}
            <Card className='p-6'>
              <InterviewsList applicationId={candidateId} />
            </Card>

            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.documents')}</h2>
              {(() => {
                const extractName = (url: string) => {
                  try {
                    const last = url.split('?')[0].split('#')[0].split('/').pop() || ''
                    return decodeURIComponent(last) || 'file'
                  } catch {
                    return url.split('/').pop() || 'file'
                  }
                }

                const docs = [
                  ...(candidate.resumeUrl
                    ? [{ url: candidate.resumeUrl as string, name: extractName(candidate.resumeUrl as string) }]
                    : []),
                  ...((answers || []) as any[])
                    .filter((a) => a?.type === 'file' && typeof a?.value === 'string' && a.value)
                    .map((a) => ({
                      url: a.value as string,
                      name: (a.fileName as string) || extractName(a.value as string) || (a.label as string) || 'file',
                    })),
                ].filter((d) => d.url)

                const seen = new Set<string>()
                const unique = docs.filter((d) => {
                  if (seen.has(d.url)) return false
                  seen.add(d.url)
                  return true
                })

                if (unique.length === 0) {
                  return <p className='text-sm text-gray-500'>{t('details.noDocuments')}</p>
                }

                return (
                  <div className='space-y-2'>
                    {unique.map((doc) => (
                      <div
                        key={doc.url}
                        className='flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg'
                      >
                        <span className='text-sm text-gray-700 truncate'>{doc.name}</span>
                        <a
                          href={doc.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center text-blue-600 hover:text-blue-700'
                          title='Download'
                        >
                          <Download className='w-5 h-5' />
                        </a>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Card>
          </Tabs.Content>
          
          <Tabs.Content value='ai' className='space-y-6'>
            {aiLoading && <p>{t('details.analyzing')}</p>}
            {!aiLoading && !aiEvaluation && (
              <div className='text-center p-8 border-2 border-dashed rounded-lg'>
                <p className='mb-4 text-gray-600'>{t('details.noAnalysisYet')}</p>
                <Button onClick={handleAnalyze} disabled={aiLoading}>
                  {aiLoading ? t('details.analyzing') : tCommon('startAnalysis')}
                </Button>
              </div>
            )}
            {aiEvaluation && (
              <div className='space-y-6'>
                {/* Recommendation Section */}
                <div className='p-4 bg-gray-50 rounded-lg'>
                  <h3 className='text-md font-semibold text-gray-800 mb-2'>{t('details.recommendation')}</h3>
                  <p className={`text-lg font-bold ${
                    aiEvaluation.recommendation === 'Make Offer' ? 'text-green-600' :
                    aiEvaluation.recommendation === 'Proceed to Interview' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {aiEvaluation.recommendation || 'N/A'}
                  </p>
                  <p className='text-sm text-gray-600 mt-1'>{aiEvaluation.recommendation_reason}</p>
                </div>

                {/* Generated Questions Section */}
                {aiEvaluation.generated_interview_questions && (
                  <div className='p-4 bg-gray-50 rounded-lg'>
                    <h3 className='text-md font-semibold text-gray-800 mb-4'>{t('details.generated_interview_questions')}</h3>
                    <div className='space-y-4'>
                      {Object.entries(aiEvaluation.generated_interview_questions).map(([category, questions]) => (
                        (questions as string[]).length > 0 && (
                          <div key={category}>
                            <h4 className='font-semibold text-gray-700 mb-2'>{t(`details.${category}` as any)}</h4>
                            <ul className='list-disc list-inside space-y-1 text-gray-600'>
                              {(questions as string[]).map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Tabs.Content>
          
          <Tabs.Content value='hr' className='space-y-6'>
            <Card className='p-6 border-blue-100'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center space-x-2'>
                  <User className='w-5 h-5 text-blue-600' />
                  <h2 className='text-lg font-semibold text-blue-900'>{tEval('hrEvaluation')}</h2>
                </div>
                {!isHrEditing ? (
                  <Button size='sm' onClick={() => setIsHrEditing(true)} variant='outline' className='border-blue-200 text-blue-700 hover:bg-blue-50'>
                    <Edit3 className='w-3 h-3 mr-1' /> {tCommon('edit')}
                  </Button>
                ) : (
                  <div className='flex space-x-2'>
                    <Button size='sm' onClick={() => setIsHrEditing(false)} variant='ghost'>{tCommon('cancel')}</Button>
                    <Button size='sm' onClick={handleSaveHrEvaluation} className='bg-blue-600 hover:bg-blue-700'>{tCommon('save')}</Button>
                  </div>
                )}
              </div>
              {isHrEditing ? (
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='hrScore'>{tEval('hrScore')}</Label>
                    <Input 
                      type='number' 
                      min='0' 
                      max='100'
                      value={editedHrEval.hr_score}
                      onChange={(e) => setEditedHrEval({...editedHrEval, hr_score: parseInt(e.target.value)})}
                      className='max-w-[150px]'
                    />
                  </div>
                  <div>
                    <Label htmlFor='hrDecision'>{tEval('decision')}</Label>
                    <Select 
                      value={editedHrEval.hr_decision} 
                      onValueChange={(val) => setEditedHrEval({...editedHrEval, hr_decision: val})}
                    >
                      <SelectTrigger className='max-w-[200px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hold">{tEval('pending')}</SelectItem>
                        <SelectItem value="interview">{tStatus('interview')}</SelectItem>
                        <SelectItem value="approve">{tStatus('offer')}</SelectItem>
                        <SelectItem value="reject">{tStatus('rejected')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(String(editedHrEval.hr_decision || '').toLowerCase() === 'interview' ||
                    String(editedHrEval.hr_decision || '').toLowerCase() === 'approve') && (
                    <div>
                      <Label htmlFor='nextActionDate'>{t('details.nextActionDate')}</Label>
                      <Input
                        type='date'
                        value={editedHrEval.next_action_date || ''}
                        onChange={(e) => setEditedHrEval({ ...editedHrEval, next_action_date: e.target.value })}
                        className='max-w-[200px]'
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor='hrNotes'>{tEval('notes')}</Label>
                    <Textarea 
                      value={editedHrEval.hr_notes}
                      onChange={(e) => setEditedHrEval({...editedHrEval, hr_notes: e.target.value})}
                      rows={4}
                      placeholder={tEval('enterNotes')}
                    />
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <p className='text-xs text-gray-500'>{tEval('hrScore')}</p>
                      <p className='text-xl font-bold text-gray-900'>{hrEvaluation?.hr_score || 0}/100</p>
                    </div>
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <p className='text-xs text-gray-500'>{tEval('decision')}</p>
                      <span className={`inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hrEvaluation?.hr_decision === 'approve' ? 'bg-green-100 text-green-800' :
                        hrEvaluation?.hr_decision === 'reject' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {hrEvaluation?.hr_decision === 'approve' ? tStatus('offer') :
                         hrEvaluation?.hr_decision === 'reject' ? tStatus('rejected') :
                         hrEvaluation?.hr_decision === 'interview' ? tStatus('interview') :
                         tEval('pending')}
                      </span>
                    </div>
                  </div>
                  <div className='p-3 bg-gray-50 rounded-lg'>
                    <p className='text-xs text-gray-500 mb-1'>{tEval('notes')}</p>
                    <p className='text-sm text-gray-700 whitespace-pre-wrap'>
                      {hrEvaluation?.hr_notes || tEval('empty')}
                    </p>
                  </div>
                  {(hrEvaluation?.hr_decision === 'approve' || hrEvaluation?.hr_decision === 'interview') && (
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <p className='text-xs text-gray-500 mb-1'>{t('details.nextActionDate')}</p>
                      <p className='text-sm text-gray-700'>
                        {hrEvaluation?.next_action_date ? String(hrEvaluation.next_action_date) : '—'}
                      </p>
                    </div>
                  )}
                  {hrEvaluation?.hr_decision === 'interview' && (
                    <div className='pt-2'>
                      <Button 
                        size='sm' 
                        onClick={() => setShowInterviewDialog(true)}
                        className='bg-green-600 hover:bg-green-700 text-white'
                      >
                        <Calendar className='w-3 h-3 mr-1' /> Schedule Interview
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.hrFields')}</h2>
                <div className='space-y-4'>
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>{t('details.priority')}</Label>
                    <p className={`text-sm font-medium ${getPriorityColor(candidate.hrFields.priority)}`}>
                      {candidate.hrFields.priority.charAt(0).toUpperCase() + candidate.hrFields.priority.slice(1)}
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>{t('details.nextAction')}</Label>
                    <p className='text-sm text-gray-900'>{candidate.hrFields.nextAction}</p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>{t('details.nextActionDate')}</Label>
                    <p className='text-sm text-gray-900'>
                      {(hrEvaluation?.next_action_date || candidate.hrFields.nextActionDate)
                        ? String(hrEvaluation?.next_action_date || candidate.hrFields.nextActionDate)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>{t('details.hrNotes')}</Label>
                    <p className='text-sm text-gray-900'>{candidate.hrFields.notes}</p>
                  </div>
                </div>
            </Card>
            
            {/* Quick Actions removed */}
          </Tabs.Content>
        </Tabs.Root>
      </div>
      
      <InterviewDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        candidateName={`${candidate.firstName} ${candidate.lastName}`}
        candidateEmail={candidate.email}
        jobTitle={candidate.position}
        candidateId={candidate.id}
      />
    </AdminLayout>
  );
}
