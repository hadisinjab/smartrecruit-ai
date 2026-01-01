'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import type { InterviewAnalysis } from '@/types/interview'

interface InterviewAnalysisDialogProps {
  analysis: InterviewAnalysis
}

export function InterviewAnalysisDialog({ analysis }: InterviewAnalysisDialogProps) {
  const [open, setOpen] = useState(false)

  const stars = useMemo(() => {
    const score = typeof analysis?.overall_score === 'number' ? analysis.overall_score : 0
    const count = Math.max(0, Math.min(5, Math.round(score / 20)))
    return '★★★★★'.slice(0, count)
  }, [analysis])

  const getStressColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          View Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[650px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>AI Interview Analysis</DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          <div className='p-4 bg-blue-50 rounded-lg border border-blue-200'>
            <div className='text-sm font-semibold text-blue-900'>Overall Performance</div>
            <div className='text-3xl font-bold text-blue-600 mt-1'>
              {analysis.overall_score}/100
            </div>
            {stars ? (
              <div className='mt-1 text-yellow-500 text-lg leading-none'>{stars}</div>
            ) : null}
          </div>

          <div className='space-y-4'>
            <div>
              <div className='flex justify-between text-sm mb-1'>
                <span>Confidence</span>
                <span className='font-medium'>{analysis.confidence_level}%</span>
              </div>
              <Progress value={analysis.confidence_level} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-1'>
                <span>Clarity</span>
                <span className='font-medium'>{analysis.clarity}%</span>
              </div>
              <Progress value={analysis.clarity} className='h-2' />
            </div>

            <div className='flex items-center justify-between text-sm'>
              <span>Stress Level</span>
              <span className={`font-medium capitalize ${getStressColor(analysis.stress_level)}`}>
                {analysis.stress_level}
              </span>
            </div>

            <div>
              <div className='text-sm mb-1'>Communication Quality</div>
              <div className='font-medium capitalize'>{analysis.communication_quality}</div>
            </div>
          </div>

          {analysis.strengths?.length ? (
            <div>
              <h4 className='font-semibold mb-2'>Key Strengths</h4>
              <ul className='space-y-1'>
                {analysis.strengths.map((s, i) => (
                  <li key={i} className='text-sm text-gray-700 flex items-start gap-2'>
                    <span className='text-green-600 mt-0.5'>•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.weaknesses?.length ? (
            <div>
              <h4 className='font-semibold mb-2'>Areas for Improvement</h4>
              <ul className='space-y-1'>
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className='text-sm text-gray-700 flex items-start gap-2'>
                    <span className='text-yellow-600 mt-0.5'>•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.notable_timestamps?.length ? (
            <div>
              <h4 className='font-semibold mb-2'>Notable Moments</h4>
              <div className='space-y-2'>
                {analysis.notable_timestamps.map((t, i) => (
                  <div key={i} className='text-sm bg-gray-50 p-2 rounded'>
                    <span className='font-mono text-blue-600'>[{t.time}]</span>
                    <span className='ml-2 text-gray-700'>{t.note}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {analysis.suggested_follow_up?.length ? (
            <div>
              <h4 className='font-semibold mb-2'>Suggested Follow-up Questions</h4>
              <ul className='space-y-1'>
                {analysis.suggested_follow_up.map((q, i) => (
                  <li key={i} className='text-sm text-gray-700 flex items-start gap-2'>
                    <span className='text-purple-600 mt-0.5'>•</span>
                    <span className='italic'>"{q}"</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.transcript ? (
            <div>
              <h4 className='font-semibold mb-2'>Transcript</h4>
              <div className='text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-wrap'>
                {analysis.transcript}
              </div>
            </div>
          ) : null}
        </div>

        <div className='flex justify-end mt-6'>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}




