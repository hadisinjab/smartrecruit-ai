'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { sendInterviewInvitationEmail } from '@/actions/email';

interface InterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  candidateId?: string;
}

export function InterviewDialog({
  open,
  onOpenChange,
  candidateName,
  candidateEmail,
  jobTitle,
  candidateId
}: InterviewDialogProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interviewDate: '',
    interviewTime: '',
    interviewLocation: '',
    additionalNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await sendInterviewInvitationEmail({
        candidateEmail,
        candidateName,
        jobTitle,
        interviewDate: formData.interviewDate,
        interviewTime: formData.interviewTime,
        interviewLocation: formData.interviewLocation,
        additionalNotes: formData.additionalNotes,
      });

      if (result.success) {
        addToast('success', 'Interview invitation sent successfully!');
        onOpenChange(false);
        // Reset form
        setFormData({
          interviewDate: '',
          interviewTime: '',
          interviewLocation: '',
          additionalNotes: '',
        });
      } else {
        addToast('error', result.error || 'Failed to send interview invitation');
      }
    } catch (error) {
      console.error('Error sending interview invitation:', error);
      addToast('error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Candidate</Label>
            <Input value={candidateName} disabled className="bg-gray-50" />
          </div>

          <div>
            <Label>Position</Label>
            <Input value={jobTitle} disabled className="bg-gray-50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interviewDate">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="interviewDate"
                  type="date"
                  value={formData.interviewDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, interviewDate: e.target.value }))}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="interviewTime">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="interviewTime"
                  type="time"
                  value={formData.interviewTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, interviewTime: e.target.value }))}
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="interviewLocation">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="interviewLocation"
                type="text"
                placeholder="e.g., Office, Zoom link, etc."
                value={formData.interviewLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, interviewLocation: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional information for the candidate..."
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.interviewDate || !formData.interviewTime}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}