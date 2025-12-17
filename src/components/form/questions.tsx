'use client';

import React, { useState, useEffect } from 'react';
import { QuestionComponentProps } from '@/types/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Upload, Link as LinkIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TextQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      <Input
        id={field.id}
        type='text'
        placeholder={field.placeholder}
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'border-red-500' : ''}
        dir={rtl ? 'rtl' : 'ltr'}
      />
      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const NumberQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      <Input
        id={field.id}
        type='number'
        placeholder={field.placeholder}
        value={value as number || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={field.validation?.min}
        max={field.validation?.max}
        className={error ? 'border-red-500' : ''}
        dir={rtl ? 'rtl' : 'ltr'}
      />
      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const TextareaQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      <Textarea
        id={field.id}
        placeholder={field.placeholder}
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'border-red-500' : ''}
        dir={rtl ? 'rtl' : 'ltr'}
        rows={4}
      />
      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const VoiceQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasRecorded, setHasRecorded] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRecording(false);
            setHasRecorded(true);
            onChange(true); // Mark as completed
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRecording, timeLeft, onChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setIsRecording(true);
    setTimeLeft(180);
    setHasRecorded(false);
  };

  return (
    <div className={`space-y-4 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      
      <Card className={`${isRecording ? 'border-red-300 bg-red-50' : hasRecorded ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
        <CardContent className='p-6 text-center space-y-4'>
          <div className='flex justify-center'>
            {isRecording ? (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse'>
                  <Mic className='w-8 h-8 text-white' />
                </div>
                <div className='text-2xl font-mono font-bold text-red-600'>
                  {formatTime(timeLeft)}
                </div>
                <p className='text-sm text-red-600'>
                  Recording... Cannot pause or re-record
                </p>
              </div>
            ) : hasRecorded ? (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-green-500 rounded-full flex items-center justify-center'>
                  <MicOff className='w-8 h-8 text-white' />
                </div>
                <p className='text-sm text-green-600 font-medium'>
                  Recording completed successfully
                </p>
                <p className='text-xs text-gray-500'>
                  Duration: 3:00
                </p>
              </div>
            ) : (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center'>
                  <MicOff className='w-8 h-8 text-gray-500' />
                </div>
                <Button
                  onClick={startRecording}
                  className='bg-blue-600 hover:bg-blue-700'
                  disabled={isRecording}
                >
                  <Mic className='w-4 h-4 mr-2' />
                  Start Recording
                </Button>
                <p className='text-xs text-gray-500'>
                  3-minute recording timer will start automatically
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const FileUploadQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  const handleFileSelect = (file: File) => {
    // Validate file type
    const acceptedTypes = field.validation?.acceptedTypes || ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!acceptedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size
    const maxSize = field.validation?.maxFileSize || 5; // 5MB default
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2));
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setFileName('');
    setFileSize('');
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      
      {!fileName ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload className='w-12 h-12 mx-auto text-gray-400 mb-4' />
          <p className='text-lg font-medium text-gray-700 mb-2'>
            Upload your CV/Resume
          </p>
          <p className='text-sm text-gray-500 mb-4'>
            Drag and drop your file here, or click to browse
          </p>
          <p className='text-xs text-gray-400 mb-4'>
            Accepted formats: PDF, DOC, DOCX • Max size: {field.validation?.maxFileSize || 5}MB
          </p>
          
          <input
            type='file'
            accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            onChange={handleFileInput}
            className='hidden'
            id={field.id}
          />
          <label htmlFor={field.id}>
            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
            >
              Choose File
            </Button>
          </label>
        </div>
      ) : (
        <Card className='border-green-200 bg-green-50'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-green-500 rounded-full flex items-center justify-center'>
                  <Upload className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='font-medium text-green-800'>{fileName}</p>
                  <p className='text-sm text-green-600'>{fileSize} MB</p>
                </div>
              </div>
              <div className='flex space-x-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const input = document.getElementById(field.id) as HTMLInputElement;
                    input?.click();
                  }}
                >
                  Change
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={removeFile}
                  className='text-red-600 hover:text-red-700'
                >
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const URLQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  const [url, setUrl] = useState(value as string || '');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    onChange(newUrl);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getUrlIcon = (url: string) => {
    if (url.includes('linkedin.com')) return '🔗';
    if (url.includes('behance.net')) return '🎨';
    if (url.includes('github.com')) return '💻';
    return '🌐';
  };

  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      
      <div className='relative'>
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <LinkIcon className='h-5 w-5 text-gray-400' />
        </div>
        <Input
          id={field.id}
          type='url'
          placeholder={field.placeholder || 'https://example.com'}
          value={url}
          onChange={handleUrlChange}
          className={`pl-10 ${error ? 'border-red-500' : ''} ${
            url && !isValidUrl(url) ? 'border-yellow-500' : ''
          }`}
          dir={rtl ? 'rtl' : 'ltr'}
        />
      </div>

      {url && !isValidUrl(url) && (
        <p className='text-sm text-yellow-600'>
          Please enter a valid URL (including http:// or https://)
        </p>
      )}

      {url && isValidUrl(url) && (
        <div className='flex items-center space-x-2 text-sm text-green-600'>
          <span>{getUrlIcon(url)}</span>
          <span>Valid URL format</span>
        </div>
      )}

      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};

export const SelectQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  return (
    <div className={`space-y-2 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      <Select
        value={value as string || ''}
        onValueChange={(newValue) => onChange(newValue)}
      >
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={field.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option, index) => (
            <SelectItem key={index} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};