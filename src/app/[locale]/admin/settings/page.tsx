'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSystemSettings, updateSystemSettings } from '@/actions/settings';
import { SystemSettings } from '@/types/admin';
import { useToast } from '@/context/ToastContext';
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
  Info,
  Globe
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useUser } from '@/context/UserContext';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('general');
  const [showPasswords, setShowPasswords] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { addToast } = useToast();
  
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isSuperAdmin, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await getSystemSettings();
        if (isMounted) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        if (isMounted) {
          addToast('error', 'Failed to load settings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const handleSettingChange = (section: keyof SystemSettings, field: string, value: any) => {
    if (!isSuperAdmin) {
      addToast('info', 'Read-only mode: only Super Admin can change settings.');
      return;
    }
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleNestedSettingChange = (section: keyof SystemSettings, subsection: string, field: string, value: any) => {
    if (!isSuperAdmin) {
      addToast('info', 'Read-only mode: only Super Admin can change settings.');
      return;
    }
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...(prev[section] as any)[subsection],
            [field]: value
          }
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    if (!isSuperAdmin) {
      addToast('error', 'Access denied: Settings are read-only for Admin.');
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateSystemSettings(settings);
      if (result.success) {
        addToast('success', 'Settings saved successfully');
        setHasUnsavedChanges(false);
      } else {
        addToast('error', result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!isSuperAdmin) {
      addToast('info', 'Read-only mode: no changes to discard.');
      return;
    }
    setLoading(true);
    try {
      const data = await getSystemSettings();
      setSettings(data);
      setHasUnsavedChanges(false);
      addToast('info', 'Changes discarded');
    } catch (error) {
      console.error('Error resetting settings:', error);
      addToast('error', 'Failed to reset settings');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      id: 'general',
      title: 'General Settings',
      icon: Globe,
      description: 'Configure language and regional preferences'
    },
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

  const renderGeneralSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Language & Region</h3>
        <div className='max-w-md'>
          <Label htmlFor='language'>Display Language</Label>
          <Select
            value={locale}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger id='language' className='mt-1.5'>
              <SelectValue placeholder='Select language' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='en'>English (US)</SelectItem>
              <SelectItem value='ar'>العربية (Arabic)</SelectItem>
            </SelectContent>
          </Select>
          <p className='text-sm text-gray-500 mt-2'>
            Select the language you want to use for the admin interface.
          </p>
        </div>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>SMTP Configuration</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <Label htmlFor='smtpHost'>SMTP Host</Label>
            <Input
              id='smtpHost'
              value={settings?.email.smtpHost || ''}
              onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='smtpPort'>SMTP Port</Label>
            <Input
              id='smtpPort'
              type='number'
              value={settings?.email.smtpPort || ''}
              onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor='smtpUsername'>Username</Label>
            <Input
              id='smtpUsername'
              value={settings?.email.smtpUsername || ''}
              onChange={(e) => handleSettingChange('email', 'smtpUsername', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='smtpPassword'>Password</Label>
            <div className='relative'>
              <Input
                id='smtpPassword'
                type={showPasswords ? 'text' : 'password'}
                value={settings?.email.smtpPassword || ''}
                onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
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
              value={settings?.email.fromName || ''}
              onChange={(e) => handleSettingChange('email', 'fromName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='fromEmail'>From Email</Label>
            <Input
              id='fromEmail'
              type='email'
              value={settings?.email.fromEmail || ''}
              onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
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
            variant={settings?.email.enableNotifications ? 'default' : 'outline'}
            onClick={() => handleSettingChange('email', 'enableNotifications', !settings?.email.enableNotifications)}
            className='min-w-[80px]'
          >
            {settings?.email.enableNotifications ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className='space-y-6'>
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
              variant={(settings as any)?.ai?.[feature.key] ? 'default' : 'outline'}
              onClick={() =>
                handleSettingChange('ai', feature.key as any, !(settings as any)?.ai?.[feature.key])
              }
              disabled={!isSuperAdmin}
              className='min-w-[80px]'
            >
              {(settings as any)?.ai?.[feature.key] ? 'Enabled' : 'Disabled'}
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
              value={settings?.security.passwordPolicy.minLength || 8}
              onChange={(e) => handleNestedSettingChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
              readOnly={!isSuperAdmin}
            />
            {!isSuperAdmin && <p className='text-xs text-gray-500 mt-1'>Read-only</p>}
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Require Uppercase Letters</Label>
              <Button
                variant={settings?.security.passwordPolicy.requireUppercase ? 'default' : 'outline'}
                onClick={() =>
                  handleNestedSettingChange(
                    'security',
                    'passwordPolicy',
                    'requireUppercase',
                    !settings?.security.passwordPolicy.requireUppercase
                  )
                }
                disabled={!isSuperAdmin}
                className='min-w-[80px]'
              >
                {settings?.security.passwordPolicy.requireUppercase ? 'On' : 'Off'}
              </Button>
            </div>
            <div className='flex items-center justify-between'>
              <Label>Require Numbers</Label>
              <Button
                variant={settings?.security.passwordPolicy.requireNumbers ? 'default' : 'outline'}
                onClick={() =>
                  handleNestedSettingChange(
                    'security',
                    'passwordPolicy',
                    'requireNumbers',
                    !settings?.security.passwordPolicy.requireNumbers
                  )
                }
                disabled={!isSuperAdmin}
                className='min-w-[80px]'
              >
                {settings?.security.passwordPolicy.requireNumbers ? 'On' : 'Off'}
              </Button>
            </div>
            <div className='flex items-center justify-between'>
              <Label>Require Special Characters</Label>
              <Button
                variant={settings?.security.passwordPolicy.requireSymbols ? 'default' : 'outline'}
                onClick={() =>
                  handleNestedSettingChange(
                    'security',
                    'passwordPolicy',
                    'requireSymbols',
                    !settings?.security.passwordPolicy.requireSymbols
                  )
                }
                disabled={!isSuperAdmin}
                className='min-w-[80px]'
              >
                {settings?.security.passwordPolicy.requireSymbols ? 'On' : 'Off'}
              </Button>
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
              value={settings?.security.sessionTimeout || 30}
              onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
              readOnly={!isSuperAdmin}
            />
            {!isSuperAdmin && <p className='text-xs text-gray-500 mt-1'>Read-only</p>}
          </div>
          <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg'>
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className='text-sm text-gray-500'>Require 2FA for all admin users</p>
            </div>
            <Button
              variant={settings?.security.twoFactorRequired ? 'default' : 'outline'}
              onClick={() => handleSettingChange('security', 'twoFactorRequired', !settings?.security.twoFactorRequired)}
              disabled={!isSuperAdmin}
              className='min-w-[80px]'
            >
              {settings?.security.twoFactorRequired ? 'On' : 'Off'}
            </Button>
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
          value={settings?.export.defaultFormat || 'csv'}
          onValueChange={(value) => handleSettingChange('export', 'defaultFormat', value)}
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
            variant={settings?.export.includePersonalData ? 'default' : 'outline'}
            onClick={() => handleSettingChange('export', 'includePersonalData', !settings?.export.includePersonalData)}
            className='min-w-[80px]'
          >
            {settings?.export.includePersonalData ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        <div className='flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50 border-green-200'>
          <div>
            <Label>Anonymize Data</Label>
            <p className='text-sm text-gray-500'>Automatically anonymize personal identifiers in exports</p>
          </div>
          <Button
            variant={settings?.export.anonymizeData ? 'default' : 'outline'}
            onClick={() => handleSettingChange('export', 'anonymizeData', !settings?.export.anonymizeData)}
            disabled={!isSuperAdmin}
            className='min-w-[80px]'
          >
            {settings?.export.anonymizeData ? 'Enabled' : 'Disabled'}
          </Button>
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
      case 'general':
        return renderGeneralSettings();
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

  if ((loading && !settings) || isUserLoading) {
    return (
      <AdminLayout
        title="Settings"
        subtitle="Manage system configuration and preferences"
      >
        <div className="flex items-center justify-center h-96">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
 }

 if (!settings) {
   return (
       <AdminLayout
        title="Settings"
        subtitle="Manage system configuration and preferences"
      >
        <div className="flex flex-col items-center justify-center h-96">
           <p className="text-red-500 mb-4">Failed to load settings</p>
           <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AdminLayout>
   )
 }

 return (
   <AdminLayout
     title="Settings"
     subtitle="Manage system configuration and preferences"
   >
     <div className='space-y-6'>
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
                  <Button variant='outline' onClick={handleReset} disabled={loading || !isSuperAdmin}>
                     Reset
                   </Button>
                  <Button onClick={handleSave} disabled={loading || !isSuperAdmin}>
                     {loading ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                     ) : (
                       <Save className='w-4 h-4 mr-2' />
                     )}
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