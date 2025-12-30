'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/admin-card';
import { Switch } from '@/components/ui/switch'
import { FormStep, FormField } from '@/types/form';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  GripVertical, 
  Mic, 
  FileText, 
  AlignLeft, 
  Upload, 
  Link as LinkIcon 
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUser } from '@/context/UserContext';
import { createJob } from '@/actions/jobs';

export default function CreateJobPage() {
  const t = useTranslations('Jobs');
  const tCreate = useTranslations('Jobs.create');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const { addToast } = useToast();
  const { isReviewer, isSuperAdmin, isAdmin } = useUser();

  const [loading, setLoading] = useState(false);
  
  // Protect page: Redirect Reviewers to Jobs list
  if (isReviewer) {
    // Ideally this should be done in useEffect or middleware, but for client-side rendering protection:
    React.useEffect(() => {
        router.push('/admin/jobs');
    }, [router]);
    return null; // Or show Access Denied message
  }
  const [jobData, setJobData, clearJobData] = useAutoSave('create-job-data', {
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    status: 'active',
    salary: {
      min: '',
      max: '',
      currency: 'USD'
    },
    description: '',
    requirements: [''],
    benefits: [''],
    deadline: '',
    hiringManager: '',
    assignment_enabled: false,
    assignment_required: false,
    assignment_type: 'text_only',
    assignment_description: '',
    assignment_weight: ''
  });

  const [formSteps, setFormSteps, clearFormSteps] = useAutoSave<FormStep[]>('create-job-form', [
    {
      id: 'step-1',
      title: 'Application Questions',
      description: 'Please answer the following questions',
      fields: []
    }
  ]);

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...jobData.requirements];
    newRequirements[index] = value;
    setJobData({ ...jobData, requirements: newRequirements });
  };

  const addRequirement = () => {
    setJobData({ ...jobData, requirements: [...jobData.requirements, ''] });
  };

  const removeRequirement = (index: number) => {
    const newRequirements = jobData.requirements.filter((_, i) => i !== index);
    setJobData({ ...jobData, requirements: newRequirements });
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...jobData.benefits];
    newBenefits[index] = value;
    setJobData({ ...jobData, benefits: newBenefits });
  };

  const addBenefit = () => {
    setJobData({ ...jobData, benefits: [...jobData.benefits, ''] });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = jobData.benefits.filter((_, i) => i !== index);
    setJobData({ ...jobData, benefits: newBenefits });
  };

  const addQuestion = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: tCreate('questionText'),
      required: true,
      placeholder: tCreate('questionText'),
      pageNumber: 1 // Default to page 1
    };

    const newSteps = [...formSteps];
    newSteps[0].fields.push(newField);
    setFormSteps(newSteps);
  };

  const updateQuestion = (index: number, updates: Partial<FormField>) => {
    const newSteps = [...formSteps];
    newSteps[0].fields[index] = { ...newSteps[0].fields[index], ...updates };
    setFormSteps(newSteps);
  };

  const removeQuestion = (index: number) => {
    const newSteps = [...formSteps];
    newSteps[0].fields = newSteps[0].fields.filter((_, i) => i !== index);
    setFormSteps(newSteps);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = [];
    if (!jobData.title) missingFields.push('Title');
    if (!jobData.department) missingFields.push('Department');
    if (!jobData.location) missingFields.push('Location');
    if (!jobData.type) missingFields.push('Type');
    if (!jobData.description) missingFields.push('Description');
    if (!jobData.salary.min) missingFields.push('Salary Min');
    if (!jobData.salary.max) missingFields.push('Salary Max');
    if (!jobData.deadline) missingFields.push('Deadline');
    if (!jobData.hiringManager) missingFields.push('Hiring Manager');
    
    // Check if at least one requirement and benefit is added and not empty
    const hasRequirements = jobData.requirements.some(r => r.trim() !== '');
    if (!hasRequirements) missingFields.push('Requirements');

    const hasBenefits = jobData.benefits.some(b => b.trim() !== '');
    if (!hasBenefits) missingFields.push('Benefits');

    if (missingFields.length > 0) {
      addToast('error', `Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const formData = {
        title: jobData.title,
        department: jobData.department,
        location: jobData.location,
        type: jobData.type,
        status: jobData.status,
        salary_min: parseInt(jobData.salary.min) || 0,
        salary_max: parseInt(jobData.salary.max) || 0,
        salary_currency: jobData.salary.currency,
        description: jobData.description,
        requirements: jobData.requirements.filter(r => r.trim() !== ''),
        benefits: jobData.benefits.filter(b => b.trim() !== ''),
        deadline: jobData.deadline || null,
        hiring_manager_name: jobData.hiringManager,
        // Send questions separately to be inserted into the questions table
        questions: formSteps[0].fields,
        // Keep evaluation_criteria for other potential uses or backward compatibility
        evaluation_criteria: formSteps,
        assignment_enabled: !!(jobData as any).assignment_enabled,
        assignment_required: !!(jobData as any).assignment_required,
        assignment_type: (jobData as any).assignment_enabled ? (jobData as any).assignment_type : null,
        assignment_description: (jobData as any).assignment_enabled ? (jobData as any).assignment_description : null,
        assignment_weight: (jobData as any).assignment_enabled && (jobData as any).assignment_weight !== '' ? parseInt((jobData as any).assignment_weight) : null
      };

      const result = await createJob(formData);
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      addToast('success', 'Job created successfully!');
      
      // Clear saved data
      clearJobData();
      clearFormSteps();

      router.push('/admin/jobs');
      router.refresh();
    } catch (error: any) {
      console.error('Error creating job:', error);
      addToast('error', `Failed to create job: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'text': return <AlignLeft className="w-4 h-4" />;
      case 'textarea': return <FileText className="w-4 h-4" />;
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'file': return <Upload className="w-4 h-4" />;
      case 'url': return <LinkIcon className="w-4 h-4" />;
      default: return <AlignLeft className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout
      title={tCreate('title')}
      subtitle={tCreate('subtitle')}
      actions={
        <div className="flex space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => {
              if (confirm('Are you sure you want to clear the draft? This action cannot be undone.')) {
                clearJobData();
                clearFormSteps();
                addToast('info', 'Draft cleared');
              }
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear Draft
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            {tCreate('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tCreate('creating') : tCreate('createJob')}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{tCreate('jobDetails')}</h3>
              <div className="space-y-4">
                <div>
                  <Label>{tCreate('jobTitle')}</Label>
                  <Input 
                    value={jobData.title}
                    onChange={(e) => setJobData({...jobData, title: e.target.value})}
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{tCreate('department')}</Label>
                    <Select 
                      value={jobData.department} 
                      onValueChange={(val) => setJobData({...jobData, department: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tCreate('selectDepartment')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{tCreate('location')}</Label>
                    <Select 
                      value={jobData.location} 
                      onValueChange={(val) => setJobData({...jobData, location: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tCreate('selectLocation')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{tCreate('description')}</Label>
                  <Textarea 
                    value={jobData.description}
                    onChange={(e) => setJobData({...jobData, description: e.target.value})}
                    placeholder="Enter detailed job description..."
                    rows={6}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{tCreate('requirementsBenefits')}</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>{tCreate('requirements')}</Label>
                    <Button variant="ghost" size="sm" onClick={addRequirement}>
                      <Plus className="w-4 h-4 mr-1" /> {tCreate('add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {jobData.requirements.map((req, index) => (
                      <div key={index} className="flex gap-2">
                        <Input 
                          value={req}
                          onChange={(e) => handleRequirementChange(index, e.target.value)}
                          placeholder="e.g. 5+ years of React experience"
                        />
                        {jobData.requirements.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeRequirement(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>{tCreate('benefits')}</Label>
                    <Button variant="ghost" size="sm" onClick={addBenefit}>
                      <Plus className="w-4 h-4 mr-1" /> {tCreate('add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {jobData.benefits.map((benefit, index) => (
                      <div key={index} className="flex gap-2">
                        <Input 
                          value={benefit}
                          onChange={(e) => handleBenefitChange(index, e.target.value)}
                          placeholder="e.g. Health Insurance"
                        />
                        {jobData.benefits.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeBenefit(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Form Builder Section */}
            <Card className="p-6 border-blue-200 bg-blue-50/30">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">{tCreate('formBuilder')}</h3>
                  <p className="text-sm text-blue-700">{tCreate('formBuilderDesc')}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {formSteps[0].fields.map((field, index) => (
                  <div key={field.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm group">
                    <div className="flex items-start gap-4">
                      <div className="mt-2 text-gray-400 cursor-move">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-1 block">{tCreate('questionText')}</Label>
                            <Input 
                              value={field.label}
                              onChange={(e) => updateQuestion(index, { label: e.target.value })}
                            />
                          </div>
                          <div className="w-1/3">
                            <Label className="text-xs text-gray-500 mb-1 block">{tCreate('type')}</Label>
                            <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 text-sm text-gray-600">
                              {getQuestionIcon(field.type)}
                              <span className="ml-2 capitalize">{field.type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={`req-${field.id}`}
                              checked={field.required}
                              onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor={`req-${field.id}`} className="cursor-pointer">{tCreate('required')}</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Label className="text-sm text-gray-600">Page:</Label>
                            <Select
                              value={(field.pageNumber || 1).toString()}
                              onValueChange={(val) => updateQuestion(index, { pageNumber: parseInt(val) })}
                            >
                              <SelectTrigger className="w-16 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Config inputs based on type */}
                          {field.type === 'voice' && (
                            <div className="flex items-center gap-2">
                               <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                 {tCreate('voiceEnabled')}
                               </div>
                               <Input 
                                 type="number" 
                                 placeholder="Duration (sec)" 
                                 className="w-24 h-8 text-xs"
                                 value={(() => {
                                   const opt = field.options?.[0];
                                   if (typeof opt === 'object' && opt !== null) {
                                      return opt.value;
                                   }
                                   return '';
                                 })()}
                                 onChange={(e) => {
                                    const val = e.target.value;
                                    updateQuestion(index, { options: [{ label: 'duration', value: val }] });
                                 }}
                               />
                            </div>
                          )}
                          
                          {field.type === 'file' && (
                            <div className="flex items-center gap-2">
                               <Input 
                                 placeholder="Max size (MB)" 
                                 className="w-24 h-8 text-xs"
                                 type="number"
                                 value={(() => {
                                   const opt = field.options?.[0];
                                   if (typeof opt === 'object' && opt !== null) {
                                      return opt.value;
                                   }
                                   return '';
                                 })()}
                                 onChange={(e) => {
                                    const val = e.target.value;
                                    updateQuestion(index, { options: [{ label: 'maxSize', value: val }] });
                                 }}
                               />
                            </div>
                          )}
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                {formSteps[0].fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">{tCreate('noQuestions')}</p>
                    <p className="text-sm text-gray-400">{tCreate('addFromToolbar')}</p>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <span className="text-sm font-medium text-gray-700 my-auto mr-2">{tCreate('addQuestion')}</span>
                <Button variant="outline" size="sm" onClick={() => addQuestion('text')}>
                  <AlignLeft className="w-4 h-4 mr-2" /> {tCreate('shortText')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('textarea')}>
                  <FileText className="w-4 h-4 mr-2" /> {tCreate('longText')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('voice')} className="border-orange-200 text-orange-700 hover:bg-orange-50">
                  <Mic className="w-4 h-4 mr-2" /> {tCreate('voiceRecording')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('file')}>
                  <Upload className="w-4 h-4 mr-2" /> {tCreate('fileUpload')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('url')}>
                  <LinkIcon className="w-4 h-4 mr-2" /> {tCreate('urlLink')}
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{tCreate('settings')}</h3>
              <div className="space-y-4">
                <div>
                  <Label>{tCreate('employmentType')}</Label>
                  <Select 
                    value={jobData.type} 
                    onValueChange={(val) => setJobData({...jobData, type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{tCreate('hiringManager')}</Label>
                  <Select 
                    value={jobData.hiringManager} 
                    onValueChange={(val) => setJobData({...jobData, hiringManager: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tCreate('selectManager')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager1">John Doe</SelectItem>
                      <SelectItem value="manager2">Sarah Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{tCreate('deadline')}</Label>
                  <Input 
                    type="date"
                    value={jobData.deadline}
                    onChange={(e) => setJobData({...jobData, deadline: e.target.value})}
                  />
                </div>
              </div>
            </Card>

            {/* Assignment Configuration */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Assignment Configuration</h3>

              <div className="flex items-center space-x-3 mb-4">
                <Switch
                  checked={!!(jobData as any).assignment_enabled}
                  onCheckedChange={(checked) => setJobData({ ...(jobData as any), assignment_enabled: checked })}
                />
                <Label className="cursor-pointer">Enable Assignment for this job</Label>
              </div>

              {!!(jobData as any).assignment_enabled && (
                <div className="space-y-4">
                  <div>
                    <Label>Assignment Task Description</Label>
                    <Textarea
                      placeholder="e.g., Build a REST API using Node.js..."
                      value={(jobData as any).assignment_description}
                      onChange={(e) => setJobData({ ...(jobData as any), assignment_description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Assignment Type</Label>
                    <Select
                      value={(jobData as any).assignment_type}
                      onValueChange={(value) => setJobData({ ...(jobData as any), assignment_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text_only">Text Only (explanation/code)</SelectItem>
                        <SelectItem value="text_and_links">Text + Links (GitHub, Video, Demo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={!!(jobData as any).assignment_required}
                      onCheckedChange={(checked) => setJobData({ ...(jobData as any), assignment_required: checked })}
                    />
                    <Label className="cursor-pointer">Make assignment required</Label>
                  </div>

                  <div>
                    <Label>Assignment Weight (optional)</Label>
                    <Input
                      type="number"
                      value={(jobData as any).assignment_weight}
                      onChange={(e) => setJobData({ ...(jobData as any), assignment_weight: e.target.value })}
                      placeholder="e.g. 30"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used later for AI scoring.</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{tCreate('salaryRange')}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{tCreate('min')}</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={jobData.salary.min}
                      onChange={(e) => setJobData({
                        ...jobData, 
                        salary: {...jobData.salary, min: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label>{tCreate('max')}</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={jobData.salary.max}
                      onChange={(e) => setJobData({
                        ...jobData, 
                        salary: {...jobData.salary, max: e.target.value}
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{tCreate('currency')}</Label>
                  <Select 
                    value={jobData.salary.currency} 
                    onValueChange={(val) => setJobData({
                      ...jobData, 
                      salary: {...jobData.salary, currency: val}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
