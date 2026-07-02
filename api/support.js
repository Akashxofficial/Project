// api/support.js — Serverless Function (Handles user support tickets)
import { sendEmail } from './_mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Missing email, subject, or message' });
  }

  try {
    // 1. Notify Admin (taniosai00@gmail.com)
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; color: #fff; background: #0d0f17; padding: 24px; border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
        <h2 style="color: #6366f1; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-top: 0;">
          🎫 New Support Ticket Raised
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.45); width: 120px; font-size: 0.88rem;">Student Name:</td>
            <td style="padding: 8px 0; color: #fff; font-weight: bold; font-size: 0.88rem;">${name || 'Anonymous Student'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.45); font-size: 0.88rem;">Student Email:</td>
            <td style="padding: 8px 0; color: #fff; font-size: 0.88rem;"><a href="mailto:${email}" style="color: #6366f1; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.45); font-size: 0.88rem;">Subject:</td>
            <td style="padding: 8px 0; color: #fff; font-weight: bold; font-size: 0.88rem;">${subject}</td>
          </tr>
        </table>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 16px; margin-top: 12px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            Issue Description
          </div>
          <div style="color: #ffffff; font-size: 0.9rem; line-height: 1.6; white-space: pre-wrap;">${message}</div>
        </div>
      </div>
    `;

    await sendEmail({
      to: 'taniosai00@gmail.com',
      subject: `🎫 Support Ticket: ${subject} (${name || email})`,
      html: adminHtml
    });

    // 2. Send automated receipt confirmation to the Student
    const studentHtml = `
      <div style="font-family: Arial, sans-serif; color: #fff; background: #0d0f17; padding: 24px; border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
        <h2 style="color: #6366f1; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-top: 0;">
          ✨ TaniOS AI Support Ticket Received
        </h2>
        <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.92rem; line-height: 1.6;">
          Hi ${name || 'Student'},
        </p>
        <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.92rem; line-height: 1.6;">
          Thank you for reaching out. We have successfully registered your support query. Our developer team will review your ticket and get back to you shortly (usually within 12-24 hours).
        </p>
        <div style="background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 14px; margin: 18px 0;">
          <strong style="color: #fff; display: block; font-size: 0.88rem; margin-bottom: 4px;">Ticket Details:</strong>
          <span style="color: rgba(255,255,255,0.5); font-size: 0.8rem; display: block;">Subject: ${subject}</span>
          <span style="color: rgba(255,255,255,0.5); font-size: 0.8rem; display: block;">Status: Open & Pending Review</span>
        </div>
        <p style="color: rgba(255, 255, 255, 0.45); font-size: 0.8rem; line-height: 1.5; margin: 20px 0 0;">
          Regards,<br/>
          TaniOS AI Support Team
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `🎫 Support Request Received: "${subject}"`,
      html: studentHtml
    });

    return res.status(200).json({ success: true, message: 'Support ticket sent successfully' });
  } catch (err) {
    console.error('❌ [Support] Error sending ticket:', err.message);
    return res.status(500).json({ error: 'Failed to submit support ticket: ' + err.message });
  }
}
