'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QuestionComponentProps } from '@/types/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Upload, Link as LinkIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/utils/supabase/client'

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
  jobFormId,
  applicationId,
  onUploadComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const savedAudioUrl =
    value && typeof value === 'object'
      ? ((value as any).audio_url || (value as any).url || null)
      : null

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl)
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed = 180 - timeLeft
  const canStop = isRecording && elapsed >= 30

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const startTick = () => {
    stopTick()
    tickRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // timer finished -> auto stop
          void stopAndFinalize(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const uploadAudio = async (file: File) => {
    const supabase = createClient()
    const buckets = ['files', 'resumes']
    const base = jobFormId || applicationId || 'general'
    // Sanitize path components to prevent InvalidKey errors
    const safeBase = String(base).replace(/[^a-zA-Z0-9-]/g, '_')
    const safeFieldId = String(field.id).replace(/[^a-zA-Z0-9-]/g, '_')
    
    const ext = (file.name.split('.').pop() || 'webm').toLowerCase()
    const path = `voice/${safeBase}/${safeFieldId}/${crypto.randomUUID()}.${ext}`

    console.log(`[VoiceQuestion] Uploading to bucket: ${buckets[0]}, path: ${path}`);

    let lastError: any = null
    for (const bucket of buckets) {
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        console.log(`[VoiceQuestion] Upload success: ${data.publicUrl}`);
        return { url: data.publicUrl, error: null as string | null }
      }
      console.error(`[VoiceQuestion] Upload failed to ${bucket}:`, upErr);
      lastError = upErr
    }
    return { url: null as string | null, error: lastError?.message || 'Failed to upload audio' }
  }

  const stopAndFinalize = async (autoStopped: boolean) => {
    const recorder = recorderRef.current
    if (!recorder) {
      setIsRecording(false)
      stopTick()
      return
    }

    setIsRecording(false)
    stopTick()

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      try {
        recorder.stop()
      } catch {
        resolve()
      }
    })

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {}
    recorderRef.current = null
    streamRef.current = null

    const mimeType = recorder.mimeType || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type: mimeType })
    chunksRef.current = []

    const objectUrl = URL.createObjectURL(blob)
    setLocalAudioUrl(objectUrl)

    setUploading(true)
    setUploadError(null)
    // Mark field as "present but uploading" so required validation doesn't falsely fail.
    onChange({ uploading: true })
    try {
      const fileName = `voice-${field.id}-${Date.now()}.webm`
      const file = new File([blob], fileName, { type: mimeType })
      const { url, error: upErr } = await uploadAudio(file)
      if (upErr || !url) {
        setUploadError(upErr || 'Failed to upload audio')
        return
      }

      const durationSeconds = Math.max(0, Math.min(180, 180 - timeLeft))
      const voiceJson = {
        audio_url: url,
        mime_type: file.type,
        file_name: file.name,
        size: file.size,
        duration_seconds: durationSeconds,
        created_at: new Date().toISOString(),
        auto_stopped: autoStopped,
      }

      onChange(voiceJson)
      setHasRecorded(true)
      onUploadComplete?.(field.id, voiceJson)
    } finally {
      setUploading(false)
    }
  }

  const startRecording = () => {
    // Reveal the question only when the applicant starts recording (per UX requirement).
    setIsRevealed(true);
    if (hasRecorded || uploading) return

    setUploadError(null)
    setTimeLeft(180)

    if (typeof window === 'undefined') return
    if (!navigator?.mediaDevices?.getUserMedia || typeof (window as any).MediaRecorder === 'undefined') {
      setUploadError('Audio recording is not supported in this browser.')
      return
    }

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        const recorder = new MediaRecorder(stream)
        recorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.start()
        setIsRecording(true)
        startTick()
      } catch (e: any) {
        setUploadError(e?.message || 'Microphone permission was denied.')
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop())
        } catch {}
        streamRef.current = null
        recorderRef.current = null
      }
    })()
  };

  const stopRecording = () => {
    // Can be stopped only after 30 seconds, and cannot be restarted after stopping.
    if (!canStop) return
    void stopAndFinalize(false)
  }

  return (
    <div className={`space-y-4 ${rtl ? 'text-right' : 'text-left'}`}>
      {isRevealed ? (
        <Label>
          {field.label}
          {field.required && <span className='text-red-500 ml-1'>*</span>}
        </Label>
      ) : (
        <div className='text-sm text-gray-600'>
          The question will appear here when you start recording.
        </div>
      )}
      
      <Card className={`${isRecording ? 'border-red-300 bg-red-50' : hasRecorded || savedAudioUrl || localAudioUrl ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
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
                  Recording… You can stop after 30 seconds. You cannot restart after stopping.
                </p>
                <Button
                  onClick={stopRecording}
                  variant='outline'
                  className='mt-2'
                  disabled={!canStop}
                >
                  Stop Recording {canStop ? '' : `(${30 - Math.max(0, elapsed)}s)`}
                </Button>
              </div>
            ) : hasRecorded || savedAudioUrl || localAudioUrl ? (
              <div className='flex flex-col items-center space-y-3 w-full'>
                <div className='w-16 h-16 bg-green-500 rounded-full flex items-center justify-center'>
                  <MicOff className='w-8 h-8 text-white' />
                </div>
                <p className='text-sm text-green-700 font-medium'>
                  {savedAudioUrl ? 'Recording saved' : uploading ? 'Uploading…' : 'Recording saved'}
                </p>
                <div className='w-full'>
                  <audio controls src={savedAudioUrl || localAudioUrl || undefined} className='w-full' />
                </div>
                {uploading && <p className='text-xs text-gray-600'>Uploading…</p>}
              </div>
            ) : (
              <div className='flex flex-col items-center space-y-2'>
                <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center'>
                  <MicOff className='w-8 h-8 text-gray-500' />
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-2 max-w-sm">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ Warning: You cannot re-record once you stop.
                  </p>
                </div>

                <Button
                  onClick={startRecording}
                  className='bg-blue-600 hover:bg-blue-700'
                  disabled={isRecording || hasRecorded}
                >
                  <Mic className='w-4 h-4 mr-2' />
                  Start Recording
                </Button>
                <p className='text-xs text-gray-500'>
                  The question will appear when you start recording.
                  <br />
                  3-minute recording timer will start automatically.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadError && (
        <p className='text-sm text-red-600'>{uploadError}</p>
      )}
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
  applicationId,
  onUploadComplete
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const uploadFile = async (file: File) => {
    const supabase = createClient()
    const buckets = ['files', 'resumes']
    const base = jobFormId || applicationId || 'general'
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const path = `uploads/${base}/${field.id}/${crypto.randomUUID()}.${ext}`

    let lastError: any = null
    for (const bucket of buckets) {
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        return { url: data.publicUrl, bucket, path, error: null as string | null }
      }
      lastError = upErr
    }
    return { url: null as string | null, bucket: null as any, path: null as any, error: lastError?.message || 'Failed to upload file' }
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    const acceptedTypes =
      field.validation?.acceptedTypes || [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];
    if (!acceptedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOC, DOCX, TXT, JPG, PNG, or WEBP file');
      return;
    }

    // Validate file size
    const maxSize = field.validation?.maxFileSize || 5; // 5MB default
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    setFileName(file.name);
    
    // Format file size
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    setFileSize(formatFileSize(file.size));

    setUploading(true)
    setUploadError(null)
    // Mark field as "present but uploading" so required validation doesn't falsely fail.
    onChange({ uploading: true, file_name: file.name, size: file.size, mime_type: file.type })
    void (async () => {
      try {
        const { url, bucket, path, error: upErr } = await uploadFile(file)
        if (upErr || !url) {
          setUploadError(upErr || 'Failed to upload file')
          return
        }
        // Store URL in formData so Review + submit can persist it.
        onChange(url)
        onUploadComplete?.(field.id, {
          url,
          bucket,
          path,
          file_name: file.name,
          mime_type: file.type,
          size: file.size,
          created_at: new Date().toISOString(),
        })
      } finally {
        setUploading(false)
      }
    })()
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
    setUploadError(null)
  };

  return (
    <div className='space-y-2 text-start'>
      <Label>
        {field.label}
        {field.required && <span className='text-red-500 ms-1'>*</span>}
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
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          <Upload className='w-12 h-12 mx-auto text-gray-400 mb-4' />
          <p className='text-lg font-medium text-gray-700 mb-2'>
            Upload your file
          </p>
          <p className='text-sm text-gray-500 mb-4'>
            Drag and drop your file here, or click to browse
          </p>
          <p className='text-xs text-gray-400 mb-4'>
            Accepted formats: PDF, DOC, DOCX, TXT, JPG, PNG, WEBP • Max size: {field.validation?.maxFileSize || 5}MB
          </p>
          
          <input
            ref={inputRef}
            type='file'
            accept='.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,image/webp'
            onChange={handleFileInput}
            className='hidden'
            id={field.id}
          />
          <Button
            type='button'
            variant='outline'
            className='cursor-pointer'
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Choose File'}
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
                  <p className='text-sm text-green-600'>{fileSize}</p>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    inputRef.current?.click()
                  }}
                  disabled={uploading}
                >
                  Change
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={removeFile}
                  className='text-red-600 hover:text-red-700'
                  disabled={uploading}
                >
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadError && (
        <p className='text-sm text-red-600'>{uploadError}</p>
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