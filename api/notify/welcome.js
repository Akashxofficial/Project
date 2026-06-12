// api/notify/welcome.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../_mongo.js';
import { sendWelcomeEmail } from '../_mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { uid, email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // Prevent duplicate welcome emails
    const student = uid ? await StudentModel.findOne({ uid }) : null;
    if (student?.welcomeEmailSent) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Already sent' });
    }

    const result = await sendWelcomeEmail(email, name);

    // Mark welcome email as sent
    if (uid && result.success) {
      await StudentModel.findOneAndUpdate({ uid }, { welcomeEmailSent: true, lastEmailSentAt: new Date() });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ [Notify] Welcome email error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
