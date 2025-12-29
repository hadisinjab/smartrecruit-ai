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
  Star,
  MessageSquare,
  Clock,
  User,
  Bot
} from 'lucide-react';

export default function CandidateDetailsPage() {
  const t = useTranslations('Candidates');
  const tEval = useTranslations('Evaluations');
  const tCommon = useTranslations('Common');
  const tRec = useTranslations('Recommendation');
  const tStatus = useTranslations('Status');

  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const candidateId = params.id as string;
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCandidate, setEditedCandidate] = useState<Candidate | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  
  // HR Evaluation State
  const [hrEvaluation, setHrEvaluation] = useState<any>(null);
  const [isHrEditing, setIsHrEditing] = useState(false);
  const [editedHrEval, setEditedHrEval] = useState({
    hr_score: 0,
    hr_notes: '',
    hr_decision: 'Review'
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
        }
        
        const hrData = await getHrEvaluation(candidateId);
        if (hrData) {
          setHrEvaluation(hrData);
          setEditedHrEval({
            hr_score: hrData.hr_score || 0,
            hr_notes: hrData.hr_notes || '',
            hr_decision: hrData.hr_decision || 'Review'
          });
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

  const handleSaveHrEvaluation = async () => {
    try {
      await addHrEvaluation(candidateId, editedHrEval);
      setHrEvaluation({ ...hrEvaluation, ...editedHrEval });
      setIsHrEditing(false);
      addToast('success', 'HR Evaluation saved successfully');
      
      // Reload to get fresh data
      const hrData = await getHrEvaluation(candidateId);
      if (hrData) setHrEvaluation(hrData);
      
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
        hr_notes: notes
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
                      if (s === 'voice-recording') return 'توقف عند التسجيل الصوتي'
                      if (s === 'file-upload') return 'توقف عند رفع الملف'
                      if (s === 'link-input') return 'توقف عند إدخال الرابط'
                      if (s === 'text-questions') return 'توقف عند الأسئلة النصية'
                      if (s === 'media-questions') return 'توقف عند رفع الوسائط'
                      if (s === 'candidate' || s === 'application-info') return 'توقف عند معلومات التقديم'
                      return s ? String(s) : 'أين توقف: غير معروف'
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
              <div className='border-t border-gray-200 pt-4'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>{t('details.experience')}</h3>
                <p className='text-gray-700'>{t('details.yearsOfExperience', { years: candidate.experience })}</p>
              </div>
              <div className='border-t border-gray-200 pt-4 mt-4'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>{t('details.skillsAndTags')}</h3>
                <div className='flex flex-wrap gap-2'>
                  {candidate.tags.map((tag, index) => (
                    <span
                      key={index}
                      className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
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
                        ) : ans.type === 'file' || ans.isUrl ? (
                          ans.value ? (
                            <a
                              href={ans.value}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center space-x-2 text-blue-600 hover:underline'
                            >
                              <FileText className='w-4 h-4' />
                              <span>{ans.fileName || 'Download file'}</span>
                            </a>
                          ) : (
                            <span className='text-sm text-gray-500'>No file provided</span>
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
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.documents')}</h2>
              <div className='space-y-3'>
                {candidate.resumeUrl && (
                  <a
                    href={candidate.resumeUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                  >
                    <FileText className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700 hover:text-blue-600'>
                      {candidate.resumeUrl.split('/').pop() || 'Resume.pdf'}
                    </span>
                  </a>
                )}
                {candidate.portfolioUrl && (
                  <a
                    href={candidate.portfolioUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                  >
                    <Globe className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700 hover:text-blue-600'>Portfolio</span>
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                  >
                    <User className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700 hover:text-blue-600'>LinkedIn Profile</span>
                  </a>
                )}
              </div>
            </Card>
          </Tabs.Content>
          
          <Tabs.Content value='ai' className='space-y-6'>
            <Card className='p-6 bg-purple-50 border-purple-100'>
              <div className='flex items-center space-x-2 mb-4'>
                <Bot className='w-5 h-5 text-purple-600' />
                <h2 className='text-lg font-semibold text-purple-900'>{tEval('aiEvaluation')}</h2>
              </div>
              <div className='space-y-4'>
                <p className='text-sm text-purple-700 italic'>
                  {tEval('aiDisclaimer')}
                </p>
                <div className='grid grid-cols-2 gap-4'>
                   <div className='bg-white p-3 rounded-lg border border-purple-100'>
                     <p className='text-xs text-gray-500'>{tEval('matchScore')}</p>
                     <p className='text-xl font-bold text-purple-600'>85%</p>
                   </div>
                   <div className='bg-white p-3 rounded-lg border border-purple-100'>
                     <p className='text-xs text-gray-500'>{tEval('recommendation')}</p>
                     <p className='text-md font-bold text-purple-600'>{tRec('hire')}</p>
                   </div>
                </div>
              </div>
            </Card>
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Strengths</h2>
              <div className='space-y-2 text-sm text-gray-700'>
                <p>Strong alignment with role requirements</p>
                <p>Clear communication in application</p>
              </div>
            </Card>
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Weaknesses</h2>
              <div className='space-y-2 text-sm text-gray-700'>
                <p>Limited domain experience</p>
              </div>
            </Card>
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Ranking</h2>
              <p className='text-sm text-gray-700'>Top 10% of applicants</p>
            </Card>
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Suggested Questions</h2>
              <div className='space-y-2 text-sm text-gray-700'>
                <p>Describe a challenging project you led.</p>
                <p>How do you handle conflicting priorities?</p>
              </div>
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
                      value={currentCandidate?.hrFields.nextActionDate ? 
                        new Date(currentCandidate.hrFields.nextActionDate).toISOString().split('T')[0] : ''}
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
                      {new Date(candidate.hrFields.nextActionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>{t('details.hrNotes')}</Label>
                    <p className='text-sm text-gray-900'>{candidate.hrFields.notes}</p>
                  </div>
                </div>
              )}
            </Card>
            
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>{t('details.quickActions')}</h2>
              <div className='space-y-2'>
                <Button variant='outline' className='w-full justify-start'>
                  <MessageSquare className='w-4 h-4 mr-2' />
                  {t('details.sendEmail')}
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Calendar className='w-4 h-4 mr-2' />
                  {t('details.scheduleInterview')}
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Clock className='w-4 h-4 mr-2' />
                  {t('details.setReminder')}
                </Button>
              </div>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </AdminLayout>
  );
}
