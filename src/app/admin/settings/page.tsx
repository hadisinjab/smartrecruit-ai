'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockSystemSettings } from '@/data/mockData';
import { SystemSettings } from '@/types/admin';
import {
  Mail,
  Brain,
  Shield,
  Download,
  Save,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(mockSystemSettings);
  const [activeSection, setActiveSection] = useState('email');
  const [showPasswords, setShowPasswords] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSettingChange = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleNestedSettingChange = (section: keyof SystemSettings, subsection: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...(prev[section] as any)[subsection],
          [field]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    setHasUnsavedChanges(false);
    // In a real app, this would call an API
  };

  const handleReset = () => {
    setSettings(mockSystemSettings);
    setHasUnsavedChanges(false);
  };

  const sections = [
    {
      id: 'email',
      title: 'Email Settings',
      icon: Mail,
      description: 'Configure email server and notification preferences'
    },
    {
      id: 'ai',
      title: 'AI Integrations',
      icon: Brain,
      description: 'Manage AI-powered features and automation'
    },
    {
      id: 'security',
      title: 'Security Settings',
      icon: Shield,
      description: 'Configure security policies and access controls'
    },
    {
      id: 'export',
      title: 'Export Defaults',
      icon: Download,
      description: 'Set default export formats and data handling'
    }
  ];

  const renderEmailSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>SMTP Configuration</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <Label htmlFor='smtpHost'>SMTP Host</Label>
            <Input
              id='smtpHost'
              value={settings.email.smtpHost}
              onChange={(e) => handleNestedSettingChange('email', 'smtpHost', '', e.target.value)}
              onChangeCapture={(e) => handleNestedSettingChange('email', 'smtpHost', 'host', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <Label htmlFor='smtpPort'>SMTP Port</Label>
            <Input
              id='smtpPort'
              type='number'
              value={settings.email.smtpPort}
              onChange={(e) => handleNestedSettingChange('email', 'smtpPort', 'port', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor='smtpUsername'>Username</Label>
            <Input
              id='smtpUsername'
              value={settings.email.smtpUsername}
              onChange={(e) => handleNestedSettingChange('email', 'smtpUsername', 'username', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='smtpPassword'>Password</Label>
            <div className='relative'>
              <Input
                id='smtpPassword'
                type={showPasswords ? 'text' : 'password'}
                value={settings.email.smtpPassword}
                onChange={(e) => handleNestedSettingChange('email', 'smtpPassword', 'password', e.target.value)}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor='fromName'>From Name</Label>
            <Input
              id='fromName'
              value={settings.email.fromName}
              onChange={(e) => handleNestedSettingChange('email', 'fromName', 'fromName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='fromEmail'>From Email</Label>
            <Input
              id='fromEmail'
              type='email'
              value={settings.email.fromEmail}
              onChange={(e) => handleNestedSettingChange('email', 'fromEmail', 'fromEmail', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className='border-t pt-6'>
        <div className='flex items-center justify-between'>
          <div>
            <Label>Enable Email Notifications</Label>
            <p className='text-sm text-gray-500'>Send automatic notifications for application updates</p>
          </div>
          <Button
            variant={settings.email.enableNotifications ? 'default' : 'outline'}
            onClick={() => handleNestedSettingChange('email', 'enableNotifications', 'enableNotifications', !settings.email.enableNotifications)}
            className='min-w-[80px]'
          >
            {settings.email.enableNotifications ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className='space-y-6'>
      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
        <div className='flex items-start space-x-3'>
          <AlertTriangle className='w-5 h-5 text-yellow-600 mt-0.5' />
          <div>
            <h3 className='text-sm font-medium text-yellow-900'>AI Features (Currently Disabled)</h3>
            <p className='text-sm text-yellow-800 mt-1'>
              These AI-powered features are currently disabled in your subscription plan. 
              Contact your account manager to enable advanced AI capabilities.
            </p>
          </div>
        </div>
      </div>

      <div className='space-y-4'>
        {[
          { key: 'resumeParsing', title: 'Resume Parsing', description: 'Automatically extract candidate information from resumes' },
          { key: 'candidateScoring', title: 'Candidate Scoring', description: 'AI-powered candidate evaluation and scoring' },
          { key: 'interviewScheduling', title: 'Smart Interview Scheduling', description: 'Automated interview scheduling based on availability' },
          { key: 'smartMatching', title: 'Smart Job Matching', description: 'Intelligent matching between candidates and job requirements' }
        ].map((feature) => (
          <div key={feature.key} className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
            <div className='flex-1'>
              <h4 className='font-medium text-gray-900'>{feature.title}</h4>
              <p className='text-sm text-gray-500'>{feature.description}</p>
            </div>
            <Button
              variant='outline'
              disabled
              className='min-w-[80px]'
            >
              Disabled
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Password Policy</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <Label htmlFor='minLength'>Minimum Password Length</Label>
            <Input
              id='minLength'
              type='number'
              value={settings.security.passwordPolicy.minLength}
              onChange={(e) => handleNestedSettingChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
              readOnly
            />
            <p className='text-xs text-gray-500 mt-1'>Read-only in demo mode</p>
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Require Uppercase Letters</Label>
              <CheckCircle className='w-5 h-5 text-green-500' />
            </div>
            <div className='flex items-center justify-between'>
              <Label>Require Numbers</Label>
              <CheckCircle className='w-5 h-5 text-green-500' />
            </div>
            <div className='flex items-center justify-between'>
              <Label>Require Special Characters</Label>
              <AlertTriangle className='w-5 h-5 text-yellow-500' />
            </div>
          </div>
        </div>
      </div>

      <div className='border-t pt-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <Label htmlFor='sessionTimeout'>Session Timeout (minutes)</Label>
            <Input
              id='sessionTimeout'
              type='number'
              value={settings.security.sessionTimeout}
              onChange={(e) => handleNestedSettingChange('security', 'sessionTimeout', 'sessionTimeout', parseInt(e.target.value))}
              readOnly
            />
            <p className='text-xs text-gray-500 mt-1'>Read-only in demo mode</p>
          </div>
          <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className='text-sm text-gray-500'>Require 2FA for all admin users</p>
            </div>
            <AlertTriangle className='w-5 h-5 text-yellow-500' />
          </div>
        </div>
      </div>
    </div>
  );

  const renderExportSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Default Export Format</h3>
        <Select
          value={settings.export.defaultFormat}
          onValueChange={(value) => handleNestedSettingChange('export', 'defaultFormat', 'defaultFormat', value)}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='csv'>CSV (Comma Separated Values)</SelectItem>
            <SelectItem value='xlsx'>Excel (XLSX)</SelectItem>
            <SelectItem value='pdf'>PDF Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
          <div>
            <Label>Include Personal Data</Label>
            <p className='text-sm text-gray-500'>Include sensitive personal information in exports</p>
          </div>
          <Button
            variant={settings.export.includePersonalData ? 'default' : 'outline'}
            onClick={() => handleNestedSettingChange('export', 'includePersonalData', 'includePersonalData', !settings.export.includePersonalData)}
            className='min-w-[80px]'
          >
            {settings.export.includePersonalData ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50 border-green-200'>
          <div>
            <Label>Anonymize Data</Label>
            <p className='text-sm text-gray-500'>Automatically anonymize personal identifiers in exports</p>
          </div>
          <CheckCircle className='w-5 h-5 text-green-500' />
        </div>
      </div>

      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <div className='flex items-start space-x-3'>
          <Info className='w-5 h-5 text-blue-600 mt-0.5' />
          <div>
            <h3 className='text-sm font-medium text-blue-900'>Export Compliance</h3>
            <p className='text-sm text-blue-800 mt-1'>
              Data anonymization helps ensure compliance with GDPR and other privacy regulations.
              Enable both personal data inclusion and anonymization for maximum compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'email':
        return renderEmailSettings();
      case 'ai':
        return renderAISettings();
      case 'security':
        return renderSecuritySettings();
      case 'export':
        return renderExportSettings();
      default:
        return renderEmailSettings();
    }
  };

  return (
    <AdminLayout
      title="Settings"
      subtitle="Manage system configuration and preferences"
    >
      <div className='space-y-6'>
        {/* Permission Notice */}
        <Card className='p-4 bg-orange-50 border border-orange-200'>
          <div className='flex items-start space-x-3'>
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className='text-sm font-medium text-orange-900'>Demo Mode</h3>
              <p className='text-sm text-orange-800 mt-1'>
                Settings are read-only in demo mode. Changes will not be persisted. 
                Contact your administrator to modify system settings.
              </p>
            </div>
          </div>
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Settings Navigation */}
          <div className='lg:col-span-1'>
            <Card className='p-4'>
              <h3 className='text-sm font-semibold text-gray-900 mb-4'>Settings Categories</h3>
              <nav className='space-y-1'>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className='w-4 h-4' />
                      <div>
                        <div className='font-medium'>{section.title}</div>
                        <div className='text-xs text-gray-500'>{section.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Settings Content */}
          <div className='lg:col-span-3'>
            <Card className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  {(() => {
                    const section = sections.find(s => s.id === activeSection);
                    const Icon = section?.icon || Settings;
                    return <Icon className='w-5 h-5 text-gray-600' />;
                  })()}
                  <h2 className='text-xl font-semibold text-gray-900'>
                    {sections.find(s => s.id === activeSection)?.title}
                  </h2>
                </div>
                {hasUnsavedChanges && (
                  <div className='flex items-center space-x-2'>
                    <Button variant='outline' onClick={handleReset}>
                      Reset
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className='w-4 h-4 mr-2' />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
              
              {renderActiveSection()}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}