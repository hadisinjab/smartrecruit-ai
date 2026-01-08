'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
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
        type: 'select',
        label: 'Highest Degree',
        placeholder: 'Select your degree',
        required: true,
        options: [
          { label: 'High School', value: 'high_school' },
          { label: 'Associate Degree', value: 'associate' },
          { label: 'Bachelor\'s Degree', value: 'bachelor' },
          { label: 'Master\'s Degree', value: 'master' },
          { label: 'Ph.D.', value: 'phd' }
        ]
      },
      {
        id: 'university',
        type: 'text',
        label: 'University/Institution',
        placeholder: 'Stanford University',
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
      }
    ]
  },
  {
    id: 'voice-intro',
    title: 'Voice Introduction',
    description: 'Introduce yourself in a short voice recording',
    fields: [
      {
        id: 'introRecording',
        type: 'voice',
        label: 'Record your introduction (max 2 minutes)',
        required: true
      }
    ]
  }
];

export default function Home() {
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const handleFormComplete = (data: any) => {
    console.log('Form completed with data:', data);
    setFormData(data);
    setIsFormComplete(true);
  };

  if (isFormComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              Application Submitted Successfully!
            </CardTitle>
            <CardDescription>
              Thank you for submitting your application. Here&apos;s a summary of your data:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
              {JSON.stringify(formData, null, 2)}
            </pre>
            <Button 
              className="mt-6 w-full" 
              onClick={() => {
                setIsFormComplete(false);
                setFormData(null);
              }}
            >
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          SmartRecruit AI Application
        </h1>
        <p className="text-lg text-gray-600">
          Please complete the following steps to submit your application.
          Your voice recording will be analyzed by our AI system.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <MultiStepForm 
          steps={sampleFormSteps} 
          onComplete={handleFormComplete}
        />
      </div>
    </div>
  );
}
