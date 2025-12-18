'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCandidates, getCandidateById, getEvaluationsByCandidateId } from '@/data/mockData';
import { Candidate, Evaluation } from '@/types/admin';
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
  User
} from 'lucide-react';

export default function CandidateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;
  const candidate = getCandidateById(candidateId);
  const evaluations = getEvaluationsByCandidateId(candidateId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCandidate, setEditedCandidate] = useState<Candidate | null>(candidate || null);

  if (!candidate) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Candidate Not Found</h2>
          <p className='text-gray-600 mb-4'>The candidate you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/admin/candidates')}>
            Back to Candidates
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (editedCandidate) {
      // In a real app, this would save to backend
      console.log('Saving candidate:', editedCandidate);
      setIsEditing(false);
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
      rejected: 'bg-red-100 text-red-800'
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
              <span>Edit</span>
            </Button>
          ) : (
            <>
              <Button
                variant='outline'
                onClick={handleCancel}
                className='flex items-center space-x-2'
              >
                <X className='w-4 h-4' />
                <span>Cancel</span>
              </Button>
              <Button
                onClick={handleSave}
                className='flex items-center space-x-2'
              >
                <Save className='w-4 h-4' />
                <span>Save</span>
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
            <span>Back to Candidates</span>
          </Button>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Basic Information */}
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
                          className={`w-4 h-4 ${
                            i < candidate.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.status)}`}>
                  {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                </span>
              </div>

              {/* Contact Information */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <div className='flex items-center space-x-3'>
                  <Mail className='w-5 h-5 text-gray-400' />
                  <span className='text-gray-700'>{candidate.email}</span>
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
                    Applied {new Date(candidate.appliedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Experience */}
              <div className='border-t border-gray-200 pt-4'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>Experience</h3>
                <p className='text-gray-700'>{candidate.experience} years of experience</p>
              </div>

              {/* Tags */}
              <div className='border-t border-gray-200 pt-4 mt-4'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>Skills & Tags</h3>
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

            {/* Evaluation History */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Evaluation History</h2>
              {evaluations.length > 0 ? (
                <div className='space-y-4'>
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className='border border-gray-200 rounded-lg p-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <div>
                          <h4 className='font-medium text-gray-900'>{evaluation.type.charAt(0).toUpperCase() + evaluation.type.slice(1)} Interview</h4>
                          <p className='text-sm text-gray-600'>
                            by {evaluation.evaluatorName} • {new Date(evaluation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          evaluation.recommendation === 'strong-hire' ? 'bg-green-100 text-green-800' :
                          evaluation.recommendation === 'hire' ? 'bg-blue-100 text-blue-800' :
                          evaluation.recommendation === 'no-hire' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {evaluation.recommendation.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className='grid grid-cols-5 gap-4 mb-3'>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500'>Technical</p>
                          <p className='font-medium'>{evaluation.scores.technical}/5</p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500'>Communication</p>
                          <p className='font-medium'>{evaluation.scores.communication}/5</p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500'>Problem Solving</p>
                          <p className='font-medium'>{evaluation.scores.problemSolving}/5</p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500'>Culture</p>
                          <p className='font-medium'>{evaluation.scores.culture}/5</p>
                        </div>
                        <div className='text-center'>
                          <p className='text-xs text-gray-500'>Overall</p>
                          <p className='font-medium'>{evaluation.scores.overall}/5</p>
                        </div>
                      </div>
                      
                      <p className='text-sm text-gray-700'>{evaluation.comments}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-gray-500'>No evaluations yet</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* HR Fields */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>HR Fields</h2>
              
              {isEditing ? (
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='priority'>Priority</Label>
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
                        <SelectItem value='low'>Low</SelectItem>
                        <SelectItem value='medium'>Medium</SelectItem>
                        <SelectItem value='high'>High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor='nextAction'>Next Action</Label>
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
                    <Label htmlFor='nextActionDate'>Next Action Date</Label>
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
                    <Label htmlFor='hrNotes'>HR Notes</Label>
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
                    <Label className='text-sm font-medium text-gray-500'>Priority</Label>
                    <p className={`text-sm font-medium ${getPriorityColor(candidate.hrFields.priority)}`}>
                      {candidate.hrFields.priority.charAt(0).toUpperCase() + candidate.hrFields.priority.slice(1)}
                    </p>
                  </div>
                  
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>Next Action</Label>
                    <p className='text-sm text-gray-900'>{candidate.hrFields.nextAction}</p>
                  </div>
                  
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>Next Action Date</Label>
                    <p className='text-sm text-gray-900'>
                      {new Date(candidate.hrFields.nextActionDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className='text-sm font-medium text-gray-500'>HR Notes</Label>
                    <p className='text-sm text-gray-900'>{candidate.hrFields.notes}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Documents */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Documents</h2>
              <div className='space-y-3'>
                {candidate.resumeUrl && (
                  <div className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'>
                    <FileText className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700'>Resume.pdf</span>
                  </div>
                )}
                {candidate.portfolioUrl && (
                  <div className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'>
                    <Globe className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700'>Portfolio</span>
                  </div>
                )}
                {candidate.linkedinUrl && (
                  <div className='flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer'>
                    <User className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-700'>LinkedIn Profile</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className='p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>Quick Actions</h2>
              <div className='space-y-2'>
                <Button variant='outline' className='w-full justify-start'>
                  <MessageSquare className='w-4 h-4 mr-2' />
                  Send Email
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Calendar className='w-4 h-4 mr-2' />
                  Schedule Interview
                </Button>
                <Button variant='outline' className='w-full justify-start'>
                  <Clock className='w-4 h-4 mr-2' />
                  Set Reminder
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
