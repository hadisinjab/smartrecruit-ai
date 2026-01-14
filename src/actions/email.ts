'use server'

import nodemailer from 'nodemailer';
import { getSystemSettings } from './settings';
import { requireStaff } from '@/utils/authz';

export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  await requireStaff();

  try {
    const settings = await getSystemSettings();
    const emailSettings = settings.email;

    if (!emailSettings.smtpHost || !emailSettings.smtpUsername || !emailSettings.smtpPassword) {
      return { success: false, error: 'SMTP settings are not configured' };
    }

    const transporter = nodemailer.createTransporter({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: emailSettings.smtpUsername,
        pass: emailSettings.smtpPassword,
      },
    });

    const mailOptions = {
      from: `${payload.fromName || emailSettings.fromName} <${payload.from || emailSettings.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendInterviewInvitationEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  interviewDate,
  interviewTime,
  interviewLocation,
  additionalNotes,
}: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  interviewTime: string;
  interviewLocation?: string;
  additionalNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const subject = `Interview Invitation - ${jobTitle}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Interview Invitation</h2>
      <p>Dear ${candidateName},</p>
      <p>We are pleased to invite you for an interview for the position of <strong>${jobTitle}</strong>.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e293b;">Interview Details</h3>
        <p><strong>Date:</strong> ${interviewDate}</p>
        <p><strong>Time:</strong> ${interviewTime}</p>
        ${interviewLocation ? `<p><strong>Location:</strong> ${interviewLocation}</p>` : ''}
        ${additionalNotes ? `<p><strong>Notes:</strong> ${additionalNotes}</p>` : ''}
      </div>
      
      <p>Please confirm your attendance by replying to this email.</p>
      <p>We look forward to meeting with you.</p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #64748b; font-size: 14px;">This is an automated message from SmartRecruit AI system.</p>
    </div>
  `;

  const text = `
Interview Invitation - ${jobTitle}

Dear ${candidateName},

We are pleased to invite you for an interview for the position of ${jobTitle}.

Interview Details:
Date: ${interviewDate}
Time: ${interviewTime}
${interviewLocation ? `Location: ${interviewLocation}\n` : ''}
${additionalNotes ? `Notes: ${additionalNotes}\n` : ''}

Please confirm your attendance by replying to this email.

We look forward to meeting with you.

---
This is an automated message from SmartRecruit AI system.
  `;

  return sendEmail({
    to: candidateEmail,
    subject,
    text,
    html,
  });
}