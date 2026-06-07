// api/admin/notify/study-reminder.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../../mongo.js';
import { sendStudyReminderEmail } from '../../mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const students = await StudentModel.find({
      emailOptOut: { $ne: true },
      'notificationPrefs.studyReminder': { $ne: false },
    }).select('email displayName -_id');

    if (!students.length) {
      return res.status(200).json({ success: true, sent: 0 });
    }

    let sent = 0, failed = 0;
    for (const s of students) {
      const r = await sendStudyReminderEmail(s.email, s.displayName);
      if (r.success) sent++; else failed++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`📚 [Study Reminder] Sent: ${sent}, Failed: ${failed}`);
    return res.status(200).json({ success: true, sent, failed, total: students.length });
  } catch (err) {
    console.error('❌ [Notify] Study reminder error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
