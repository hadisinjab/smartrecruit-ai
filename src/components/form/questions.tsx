'use client';

import React, { useEffect, useRef, useState } from 'react';
import { QuestionComponentProps } from '@/types/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/utils/supabase/client';

export const TextQuestion: React.FC<QuestionComponentProps> = ({
  field,
  value,
  onChange,
  rtl = false,
  error
}) => {
  return (
    <div className='space-y-2 text-start'>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ms-1'>*</span>}
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
    <div className='space-y-2 text-start'>
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className='text-red-500 ms-1'>*</span>}
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
  error,
  jobFormId
}) => {
  const maxSeconds = 180;
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadBlobToStorage = async (blob: Blob) => {
    const supabase = createClient();
    const buckets = ['voice', 'audio', 'voice-recordings'];
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'webm';
    const folder = jobFormId || 'unknown-job';
    const path = `voice/${folder}/${crypto.randomUUID()}-${field.id}.${ext}`;

    let lastError: any = null;
    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: blob.type || 'audio/webm',
        upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return { url: data.publicUrl, error: null as string | null };
      }
      lastError = error;
    }
    return { url: null as string | null, error: lastError?.message || 'Failed to upload recording' };
  };

  const stopRecording = async () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    recorderRef.current.stop();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setHasRecorded(false);
    setSeconds(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        setAudioUrl(localUrl);
        setIsRecording(false);
        setHasRecorded(true);

        // Upload immediately
        setIsUploading(true);
        const { url, error } = await uploadBlobToStorage(blob);
        if (error || !url) {
          setErrorMessage(error || 'Failed to upload recording');
          setIsUploading(false);
          return;
        }

        const audioJson = {
          audio_url: url,
          duration_seconds: seconds,
          mime_type: blob.type || recorder.mimeType || 'audio/webm',
          size_bytes: blob.size,
          transcription: { status: 'pending' }
        };

        onChange(audioJson);
        setIsUploading(false);
      };

      recorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= maxSeconds) {
            // auto stop at max duration
            try { stopRecording(); } catch {}
          }
          return next;
        });
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'Microphone permission denied');
    }
  };

  return (
    <div className={`space-y-4 ${rtl ? 'text-right' : 'text-left'}`}>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ml-1'>*</span>}
      </Label>
      
      <Card className={`${isRecording ? 'border-red-300 bg-red-50' : hasRecorded ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
        <CardContent className='p-6 text-center space-y-4'>
          {errorMessage && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-sm text-red-700'>{errorMessage}</p>
            </div>
          )}
          <div className='flex justify-center'>
            {isRecording ? (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse'>
                  <Mic className='w-8 h-8 text-white' />
                </div>
                <div className='text-2xl font-mono font-bold text-red-600'>
                  {formatTime(seconds)}
                </div>
                <p className='text-sm text-red-600'>
                  Recording…
                </p>
                <Button
                  type='button'
                  variant='outline'
                  onClick={stopRecording}
                  className='border-red-300 text-red-700 hover:bg-red-100'
                >
                  <MicOff className='w-4 h-4 mr-2' />
                  Stop Recording
                </Button>
              </div>
            ) : hasRecorded ? (
              <div className='flex flex-col items-center space-y-2'>
                {isUploading ? (
                  <>
                    <div className='w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse'>
                      <Loader2 className='w-8 h-8 text-white animate-spin' />
                    </div>
                    <p className='text-sm text-blue-700 font-medium'>Uploading…</p>
                    <p className='text-xs text-gray-500'>Please wait</p>
                  </>
                ) : (
                  <>
                    <div className='w-16 h-16 bg-green-500 rounded-full flex items-center justify-center'>
                      <MicOff className='w-8 h-8 text-white' />
                    </div>
                    <p className='text-sm text-green-700 font-medium'>Recording uploaded</p>
                    <p className='text-xs text-gray-500'>Duration: {formatTime(seconds)}</p>
                    {audioUrl && (
                      <audio controls src={audioUrl} className='w-full max-w-md mt-2' />
                    )}
                  </>
                )}
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
                  Max duration: {formatTime(maxSeconds)}
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
  error,
  jobFormId,
  onFileUploadComplete
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadFileToStorage = async (file: File) => {
    const supabase = createClient();
    const buckets = ['files', 'resumes'];
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const folder = jobFormId || 'unknown-job';
    const path = `applications/${folder}/${crypto.randomUUID()}-${field.id}.${ext}`;

    let lastError: any = null;
    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return { url: data.publicUrl, error: null as string | null };
      }
      lastError = error;
    }
    return { url: null as string | null, error: lastError?.message || 'Failed to upload file' };
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    // Validate file size
    const maxSize = field.validation?.maxFileSize || 5; // 5MB default
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2));

    // Upload immediately so submit is faster
    setIsUploading(true);
    const { url, error: upErr } = await uploadFileToStorage(file);
    if (upErr || !url) {
      setUploadError(upErr || 'Failed to upload file');
      setIsUploading(false);
      return;
    }

    onChange(url);
    onFileUploadComplete?.(field.id, url);
    setIsUploading(false);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
  };

  return (
    <div className='space-y-2 text-start'>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ms-1'>*</span>}
      </Label>

      {/* Keep input mounted so "Choose/Change" always works */}
      <input
        ref={fileInputRef}
        type='file'
        accept='*/*'
        onChange={handleFileInput}
        className='hidden'
      />
      
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
            Accepted formats: Any file type • Max size: {field.validation?.maxFileSize || 5}MB
          </p>

          <Button
            type='button'
            variant='outline'
            className='cursor-pointer'
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Uploading…
              </>
            ) : (
              'Choose File'
            )}
          </Button>
        </div>
      ) : (
        <Card className='border-green-200 bg-green-50'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-green-500 rounded-full flex items-center justify-center'>
                  <Upload className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='font-medium text-green-800'>{fileName}</p>
                  <p className='text-sm text-green-600'>{fileSize} MB</p>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Change
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={removeFile}
                  className='text-red-600 hover:text-red-700'
                  disabled={isUploading}
                >
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadError && (
        <p className='text-sm text-red-500'>{uploadError}</p>
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
    <div className='space-y-2 text-start'>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ms-1'>*</span>}
      </Label>
      <Select
        value={value as string || ''}
        onValueChange={(newValue) => onChange(newValue)}
      >
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={field.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option, index) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            return (
              <SelectItem key={index} value={value}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error && (
        <p className='text-sm text-red-500'>{error}</p>
      )}
    </div>
  );
};