// api/admin/broadcast.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../_mongo.js';
import { sendBroadcastEmail } from '../_mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { subject, message, targetGroup } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Missing subject or message' });

    // Build recipient list
    let query = { emailOptOut: { $ne: true } };
    if (targetGroup === 'pro') query.subscriptionActive = true;
    if (targetGroup === 'free') query.subscriptionActive = { $ne: true };

    const students = await StudentModel.find(query).select('email displayName -_id');
    if (!students.length) return res.status(200).json({ success: true, sent: 0, message: 'No recipients found' });

    const recipients = students.map(s => s.email);
    const messageHtml = message.replace(/\n/g, '<br/>');

    // Await email dispatch to ensure execution completes under serverless context
    const result = await sendBroadcastEmail(recipients, subject, messageHtml);
    console.log(`📢 [Broadcast] Finished: ${result.sent} sent, ${result.failed} failed`);

    return res.status(200).json({
      success: true,
      queued: recipients.length,
      sent: result.sent,
      failed: result.failed,
      message: `Broadcast finished: ${result.sent} sent, ${result.failed} failed`
    });
  } catch (err) {
    console.error('❌ [Notify] Broadcast error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
