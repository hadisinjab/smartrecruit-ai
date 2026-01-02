'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: string
}

export default function ErrorPage({ error }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-red-600">Application Not Available</CardTitle>
          <CardDescription>{error || 'Job not found'}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            {error || 'The job you are looking for does not exist or is not available for applications.'}
          </p>
          <div className="text-sm text-gray-500 mb-4">
            <p>Possible reasons:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The job status is not &quot;active&quot;</li>
              <li>The job ID is incorrect</li>
              <li>The application deadline has passed</li>
            </ul>
          </div>
          <a href="/">
            <Button>Return to Home</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}



