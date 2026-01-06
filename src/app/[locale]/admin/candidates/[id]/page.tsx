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
import { getCandidateById } from '@/actions/candidates';
import { addHrEvaluation, getHrEvaluation } from '@/actions/hr-evaluations';
import { Candidate, Evaluation } from '@/types/admin';
import { useToast } from '@/context/ToastContext';
import { getAssignmentsByApplication } from '@/actions/assignments'
import { InterviewsList } from '@/components/admin/interviews/InterviewsList'
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
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
  Bot
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

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
  const candidateId = params.id as string;
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCandidate, setEditedCandidate] = useState<Candidate | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
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
          setEditedCandidate(data as unknown as Candidate);
          const a = (data as any).answers || [];
          setAnswers(a);
          
          // Load existing AI evaluation if available
          const aiEval = (data as any).ai_evaluations?.[0] || null;
          if (aiEval) {
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
          setEditedCandidate((prev) =>
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
        addToast('error', 'Failed to load candidate details');
      } finally {
        setLoading(false);
      }
    }
    loadCandidate();
  }, [candidateId, addToast]);

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

  const handleSaveHrEvaluation = async () => {
    try {
      // UI validation for date-only field when needed
      const decision = String(editedHrEval.hr_decision || '').toLowerCase()
      const needsDate = decision === 'interview' || decision === 'approve'
      if (needsDate && !editedHrEval.next_action_date) {
        addToast('error', 'يرجى تحديد تاريخ الإجراء')
        return
      }
      await addHrEvaluation(candidateId, editedHrEval);
      setHrEvaluation({ ...hrEvaluation, ...editedHrEval });
      setIsHrEditing(false);
      addToast('success', 'HR Evaluation saved successfully');
      
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
        setEditedCandidate((prev) =>
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
      addToast('error', 'Failed to save HR evaluation');
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-600'>Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Candidate Not Found</h2>
            <p className='text-gray-600 mb-4'>The candidate you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/admin/candidates')}>
              Back to Candidates
            </Button>
          </div>
      </div>
    );
  }

  // Evaluations are now part of the candidate object or fetched separately if needed
  // For now we'll assume they are not yet fully implemented in the backend response structure
  // or we need to adapt the UI to show what we have.
  const evaluations: Evaluation[] = []; // Placeholder until we fetch evaluations properly

  const handleSave = async () => {
    if (!editedCandidate) return;
    try {
      const priority = editedCandidate.hrFields?.priority || 'medium';
      const nextActionRaw = editedCandidate.hrFields?.nextAction || '';
      const notes = editedCandidate.hrFields?.notes || '';
      
      const normalizeDecision = (s: string) => {
        const v = s.toLowerCase().trim();
        if (v.includes('interview')) return 'interview';
        if (v.includes('offer') || v.includes('approve') || v.includes('approved') || v.includes('accept')) return 'approve';
        if (v.includes('reject')) return 'reject';
        if (v.includes('hold') || v.includes('pending') || v.includes('review') || v.includes('wait')) return 'hold';
        return 'hold';
      };
      const scoreFromPriority = (p: string) => {
        if (p === 'high') return 80;
        if (p === 'medium') return 50;
        if (p === 'low') return 20;
        return hrEvaluation?.hr_score || 0;
      };
      
      const payload = {
        hr_score: scoreFromPriority(priority),
        hr_decision: normalizeDecision(nextActionRaw),
        hr_notes: notes,
        next_action_date: editedCandidate.hrFields?.nextActionDate || null
      };
      
      await addHrEvaluation(candidateId, payload);
      const fresh = await getHrEvaluation(candidateId);
      setHrEvaluation(fresh);
      setCandidate(editedCandidate);
      setIsEditing(false);
      addToast('success', 'تم حفظ حقول HR في قاعدة البيانات');
    } catch (e) {
      console.error(e);
      addToast('error', 'فشل حفظ حقول HR');
    }
  };

  const handleCancel = () => {
    setEditedCandidate(candidate);
    setIsEditing(false);
  };

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

  const currentCandidate = editedCandidate || candidate;

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
        setAiEvaluation(data.evaluation);
        addToast('success', 'AI Analysis Completed Successfully');
      } else {
        addToast('error', data.message || 'Analysis failed');
      }
    } catch (e: any) {
      console.error(e);
      addToast('error', `Connection failed: ${e.message || 'Unknown error'}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AdminLayout
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={candidate.position}
      actions={
        <div className='flex space-x-3'>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className='flex items-center space-x-2'
            >
              <Edit3 className='w-4 h-4' />
              <span>{t('details.editCandidate')}</span>
            </Button>
          ) : (
            <>
              <Button
                variant='outline'
                onClick={handleCancel}
                className='flex items-center space-x-2'
              >
                <X className='w-4 h-4' />
                <span>{tCommon('cancel')}</span>
              </Button>
              <Button
                onClick={handleSave}
                className='flex items-center space-x-2'
              >
                <Save className='w-4 h-4' />
                <span>{tCommon('save')}</span>
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header with Navigation */}
        <div className='flex items-center space-x-4'>
          <Button
            variant='ghost'
            onClick={() => router.push('/admin/candidates')}
            className='flex items-center space-x-2'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>{t('details.backToCandidates')}</span>
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
              </div>
              {/* Experience + Skills/Tags removed (not stored in DB) */}
            </Card>
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Form Answers</h2>
              <div className='space-y-3'>
                {answers.length === 0 ? (
                  <p className='text-sm text-gray-600'>No answers available</p>
                ) : (
                  answers.map((ans) => (
                    <div key={ans.id} className='p-3 border border-gray-200 rounded-lg'>
                      <p className='text-sm font-medium text-gray-900'>{ans.label || ans.questionId}</p>
                      <div className='mt-1'>
                        {ans.type === 'voice' ? (
                          ans.audioUrl ? (
                            <audio controls src={ans.audioUrl} className='w-full mt-2' />
                          ) : (
                            <p className='text-sm text-gray-700'>Voice response recorded</p>
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
                              <span>{ans.fileName || 'Download file'}</span>
                            </a>
                          ) : (
                            <span className='text-sm text-gray-500'>No file provided</span>
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
                            <span className='text-sm text-gray-500'>No link provided</span>
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
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Assignment Submissions</h2>

              {assignmentsLoading ? (
                <p className='text-sm text-gray-600'>Loading assignments…</p>
              ) : assignments.length === 0 ? (
                <p className='text-sm text-gray-500 text-center'>No assignment submissions for this candidate</p>
              ) : (
                <div className='space-y-6'>
                  {assignments.map((a: any, index: number) => (
                    <div key={a.id} className='border border-gray-200 rounded-lg p-4'>
                      {assignments.length > 1 && (
                        <h4 className='font-medium mb-2'>Assignment {index + 1}</h4>
                      )}

                      <div className='mb-4'>
                        <Label className='text-sm font-medium text-gray-700'>Solution:</Label>
                        <div className='mt-2 p-4 bg-gray-50 rounded-md border'>
                          <p className='whitespace-pre-wrap text-sm'>{a.text_fields || '—'}</p>
                        </div>
                        {a.text_fields && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              navigator.clipboard.writeText(String(a.text_fields))
                              addToast('success', 'Copied to clipboard')
                            }}
                            className='mt-2'
                          >
                            📋 Copy to Clipboard
                          </Button>
                        )}
                      </div>

                      {Array.isArray(a.link_fields) && a.link_fields.length > 0 && (
                        <div>
                          <Label className='text-sm font-medium text-gray-700'>Links:</Label>
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
                        Submitted: {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
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
                  return <p className='text-sm text-gray-500'>No documents uploaded</p>
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
            <Card className='p-6 bg-purple-50 border-purple-100'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center space-x-2'>
                  <Bot className='w-5 h-5 text-purple-600' />
                  <h2 className='text-lg font-semibold text-purple-900'>{tEval('aiEvaluation')}</h2>
                </div>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={aiLoading}
                  className='bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'
                >
                  {aiLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Analyzing (Running 5 Stages)...
                    </>
                  ) : (
                    tCommon('startAnalysis') || 'Start Analysis'
                  )}
                </Button>
              </div>
              
              {!aiEvaluation && !aiLoading && (
                <div className="text-center py-8 text-gray-500">
                  <p>No analysis generated yet. Click "Start Analysis" to begin the 5-stage evaluation.</p>
                </div>
              )}

              {aiEvaluation && aiEvaluation.analysis?.final_decision && (
                <div className='space-y-6 animate-in fade-in duration-500'>
                  <p className='text-sm text-purple-700 italic'>
                    {tEval('aiDisclaimer')}
                  </p>

                  {/* 1. Final Decision Banner (Stage 5 Output) */}
                  <div className={`p-6 rounded-xl border-2 shadow-sm ${
                    aiEvaluation.analysis.final_decision.decision === 'Interview' ? 'bg-green-50 border-green-200' :
                    aiEvaluation.analysis.final_decision.decision === 'Reject' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold uppercase rounded">Stage 5</span>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Final Decision</h3>
                        </div>
                        <div className="text-3xl font-extrabold flex flex-wrap items-center gap-3">
                          <span className={
                            aiEvaluation.analysis.final_decision.decision === 'Interview' ? 'text-green-700' :
                            aiEvaluation.analysis.final_decision.decision === 'Reject' ? 'text-red-700' : 'text-gray-700'
                          }>
                            {aiEvaluation.analysis.final_decision.decision}
                          </span>
                          <span className="text-lg font-medium text-gray-500 bg-white px-3 py-1 rounded-full border">
                            Score: {aiEvaluation.analysis.final_decision.final_score}/100
                          </span>
                        </div>
                        <p className="mt-3 text-gray-800 text-lg leading-relaxed font-medium">
                          {aiEvaluation.analysis.final_decision.decision_reason}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Recommended Action:</span>
                          <span className="px-3 py-1 bg-white rounded border border-gray-300 text-sm font-medium shadow-sm">
                            {aiEvaluation.analysis.final_decision.action_item}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Four Stages Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stage 1: Text */}
                    <Card className="p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Stage 1</h4>
                      <h3 className="text-md font-bold text-gray-800 mb-2">Text Questions</h3>
                      <div className="text-2xl font-bold text-blue-700 mb-2">
                        {aiEvaluation.analysis.final_decision.stage_evaluations?.text || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-3">
                        {aiEvaluation.analysis.qa_analysis?.smart_summary || 'Analysis of text responses.'}
                      </p>
                    </Card>

                    {/* Stage 2: Voice */}
                    <Card className="p-4 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Stage 2</h4>
                      <h3 className="text-md font-bold text-gray-800 mb-2">Voice Questions</h3>
                      <div className="text-2xl font-bold text-purple-700 mb-2">
                        {aiEvaluation.analysis.final_decision.stage_evaluations?.voice || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-500">
                        {aiEvaluation.analysis.voice_transcripts?.length || 0} answers analyzed.
                        {aiEvaluation.analysis.voice_transcripts?.length > 0 && (
                           <span className="block mt-1 italic">"{aiEvaluation.analysis.voice_transcripts[0]?.analysis?.relevance || 'Analyzed'}"</span>
                        )}
                      </p>
                    </Card>

                    {/* Stage 3: Resume */}
                    <Card className="p-4 border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Stage 3</h4>
                      <h3 className="text-md font-bold text-gray-800 mb-2">Resume</h3>
                      <div className="text-2xl font-bold text-yellow-700 mb-2">
                        {aiEvaluation.analysis.final_decision.stage_evaluations?.resume || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-500">
                        {aiEvaluation.analysis.resume?.data?.skills?.technical?.length || 0} skills identified.
                      </p>
                    </Card>

                    {/* Stage 4: Assignment */}
                    <Card className="p-4 border-l-4 border-l-pink-500 hover:shadow-md transition-shadow">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Stage 4</h4>
                      <h3 className="text-md font-bold text-gray-800 mb-2">Assignment</h3>
                      <div className="text-2xl font-bold text-pink-700 mb-2">
                        {aiEvaluation.analysis.final_decision.stage_evaluations?.assignment || 'N/A'}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-3">
                        {aiEvaluation.analysis.assignment?.evaluation?.recommendation || 'Evaluated'}
                      </p>
                    </Card>
                  </div>

                  {/* Detailed Analysis Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <Card className='p-6 border-green-100 bg-green-50/30'>
                      <h2 className='text-lg font-semibold text-green-900 mb-4'>Key Strengths</h2>
                      <div className='space-y-2 text-sm text-gray-700'>
                        {aiEvaluation.strengths && aiEvaluation.strengths.length > 0 ? (
                          aiEvaluation.strengths.map((s: string, i: number) => (
                            <div key={i} className="flex items-start bg-white p-2 rounded border border-green-100 shadow-sm">
                              <span className="text-green-500 mr-2 font-bold">✓</span>
                              {s}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">No specific strengths identified.</p>
                        )}
                      </div>
                    </Card>

                    {/* Weaknesses */}
                    <Card className='p-6 border-red-100 bg-red-50/30'>
                      <h2 className='text-lg font-semibold text-red-900 mb-4'>Areas for Improvement</h2>
                      <div className='space-y-2 text-sm text-gray-700'>
                        {aiEvaluation.weaknesses && aiEvaluation.weaknesses.length > 0 ? (
                          aiEvaluation.weaknesses.map((w: string, i: number) => (
                            <div key={i} className="flex items-start bg-white p-2 rounded border border-red-100 shadow-sm">
                              <span className="text-red-500 mr-2 font-bold">⚠</span>
                              {w}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">No specific weaknesses identified.</p>
                        )}
                      </div>
                    </Card>
                  </div>
                  
                  {/* Detailed Assignment Feedback if available */}
                  {aiEvaluation.analysis.assignment?.evaluation?.answer_evaluation && (
                    <Card className="p-6 border-pink-100 bg-pink-50/30">
                       <h2 className="text-lg font-semibold text-pink-900 mb-3">Detailed Assignment Feedback</h2>
                       <p className="text-gray-800 text-sm leading-relaxed bg-white p-4 rounded border border-pink-100">
                          {aiEvaluation.analysis.assignment.evaluation.answer_evaluation}
                       </p>
                    </Card>
                  )}
                  
                </div>
              )}
            </Card>
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
                </div>
              )}
            </Card>
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.hrFields')}</h2>
              {isEditing ? (
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='priority'>{t('details.priority')}</Label>
                    <Select
                      value={currentCandidate?.hrFields.priority}
                      onValueChange={(value) => 
                        setEditedCandidate(prev => prev ? {
                          ...prev,
                          hrFields: { ...prev.hrFields, priority: value as any }
                        } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='low'>{tCommon('low') || 'Low'}</SelectItem>
                        <SelectItem value='medium'>{tCommon('medium') || 'Medium'}</SelectItem>
                        <SelectItem value='high'>{tCommon('high') || 'High'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor='nextAction'>{t('details.nextAction')}</Label>
                    <Input
                      value={currentCandidate?.hrFields.nextAction || ''}
                      onChange={(e) =>
                        setEditedCandidate(prev => prev ? {
                          ...prev,
                          hrFields: { ...prev.hrFields, nextAction: e.target.value }
                        } : null)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='nextActionDate'>{t('details.nextActionDate')}</Label>
                    <Input
                      type='date'
                      value={currentCandidate?.hrFields.nextActionDate ? String(currentCandidate.hrFields.nextActionDate) : ''}
                      onChange={(e) =>
                        setEditedCandidate(prev => prev ? {
                          ...prev,
                          hrFields: { ...prev.hrFields, nextActionDate: e.target.value }
                        } : null)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='hrNotes'>{t('details.hrNotes')}</Label>
                    <Textarea
                      value={currentCandidate?.hrFields.notes || ''}
                      onChange={(e) =>
                        setEditedCandidate(prev => prev ? {
                          ...prev,
                          hrFields: { ...prev.hrFields, notes: e.target.value }
                        } : null)
                      }
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </Card>
            
            {/* Quick Actions removed */}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </AdminLayout>
  );
}
