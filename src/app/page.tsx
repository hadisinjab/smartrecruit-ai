'use client';

import React, { useState } from 'react';
import { MultiStepForm } from '@/components/form/multi-step-form';
import { FormStep } from '@/types/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sample form steps configuration
const sampleFormSteps: FormStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    fields: [
      {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter your first name',
        required: true
      },
      {
        id: 'lastName',
        type: 'text',
        label: 'Last Name',
        placeholder: 'Enter your last name',
        required: true
      },
      {
        id: 'email',
        type: 'text',
        label: 'Email Address',
        placeholder: 'your.email@example.com',
        required: true,
        validation: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Please enter a valid email address'
        }
      },
      {
        id: 'phone',
        type: 'text',
        label: 'Phone Number',
        placeholder: '(123) 456-7890',
        required: true
      }
    ]
  },
  {
    id: 'professional-info',
    title: 'Professional Information',
    description: 'Your work experience and skills',
    fields: [
      {
        id: 'currentPosition',
        type: 'text',
        label: 'Current Position',
        placeholder: 'Software Engineer',
        required: true
      },
      {
        id: 'yearsExperience',
        type: 'number',
        label: 'Years of Experience',
        placeholder: '5',
        required: true,
        validation: {
          min: 0,
          max: 50
        }
      },
      {
        id: 'currentSalary',
        type: 'number',
        label: 'Current Salary (USD)',
        placeholder: '75000',
        required: false,
        validation: {
          min: 0,
          max: 1000000
        }
      },
      {
        id: 'bio',
        type: 'textarea',
        label: 'Professional Bio',
        placeholder: 'Tell us about your professional background and achievements...',
        required: true
      }
    ]
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Your educational background',
    fields: [
      {
        id: 'highestDegree',
        type: 'text',
        label: 'Highest Degree',
        placeholder: 'Bachelor\'s in Computer Science',
        required: true
      },
      {
        id: 'graduationYear',
        type: 'number',
        label: 'Graduation Year',
        placeholder: '2020',
        required: true,
        validation: {
          min: 1950,
          max: 2030
        }
      },
      {
        id: 'university',
        type: 'text',
        label: 'University/Institution',
        placeholder: 'University Name',
        required: true
      },
      {
        id: 'additionalNotes',
        type: 'textarea',
        label: 'Additional Notes',
        placeholder: 'Any additional information about your education...',
        required: false
      }
    ]
  },
  {
    id: 'personal-experience',
    title: 'Personal & Experience Information',
    description: 'Additional details about your background',
    fields: [
      {
        id: 'age',
        type: 'select',
        label: 'Age',
        placeholder: 'Select your age',
        required: true,
        options: Array.from({ length: 48 }, (_, i) => (i + 18).toString())
      },
      {
        id: 'yearsExperience',
        type: 'select',
        label: 'Years of Work Experience',
        placeholder: 'Select years of experience',
        required: true,
        options: Array.from({ length: 9 }, (_, i) => i.toString())
      },
      {
        id: 'previousCompanies',
        type: 'text',
        label: 'Previous Companies',
        placeholder: 'List company names you worked at (comma separated)',
        required: true
      }
    ]
  },
  {
    id: 'additional-requirements',
    title: 'Final Materials',
    description: 'Upload your CV and complete the final requirements',
    fields: [
      {
        id: 'portfolioUrl',
        type: 'url',
        label: 'Portfolio/LinkedIn URL',
        placeholder: 'https://linkedin.com/in/yourprofile or https://behance.net/yourportfolio',
        required: true
      },
      {
        id: 'cvUpload',
        type: 'file',
        label: 'Upload Your CV/Resume',
        placeholder: 'Upload PDF, DOC, or DOCX file',
        required: true,
        validation: {
          maxFileSize: 5,
          acceptedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        }
      },
      {
        id: 'videoIntroduction',
        type: 'voice',
        label: 'Video Introduction',
        placeholder: 'Record a 3-minute introduction about yourself',
        required: true
      }
    ]
  }
];

export default function Home() {
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [rtl, setRtl] = useState(false);

  const handleFormComplete = (data: any) => {
    setSubmittedData(data);
    setApplicationSubmitted(true);
    console.log('Form submitted with data:', data);
  };

  const handleReset = () => {
    setApplicationSubmitted(false);
    setSubmittedData(null);
  };

  if (applicationSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-green-600">
                Application Submitted Successfully!
              </CardTitle>
              <CardDescription>
                Thank you for applying. We'll review your application and get back to you soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Submitted Data (for demo purposes):</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(submittedData, null, 2)}
                </pre>
              </div>
              <div className="flex justify-center">
                <Button onClick={handleReset} variant="outline">
                  Submit Another Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with RTL toggle for demo */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SmartRecruit AI</h1>
              <p className="text-gray-600">AI-Powered Hiring Platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={rtl}
                  onChange={(e) => setRtl(e.target.checked)}
                  className="rounded"
                />
                <span>RTL Layout</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <MultiStepForm
        steps={sampleFormSteps}
        onComplete={handleFormComplete}
        rtl={rtl}
      />
    </div>
  );
}