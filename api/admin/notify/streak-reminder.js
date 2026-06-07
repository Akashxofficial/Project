// api/admin/notify/streak-reminder.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../../mongo.js';
import { sendStreakReminderEmail } from '../../mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Students who have streak > 0 but haven't logged in today
    const students = await StudentModel.find({
      emailOptOut: { $ne: true },
      'notificationPrefs.streakReminder': { $ne: false },
      streak: { $gt: 0 },
      $or: [
        { lastLoginAt: null },
        { lastLoginAt: { $lt: todayStart } },
      ],
    }).select('email displayName streak -_id');

    if (!students.length) {
      return res.status(200).json({ success: true, sent: 0, message: 'All students are active today!' });
    }

    let sent = 0, failed = 0;
    for (const s of students) {
      const r = await sendStreakReminderEmail(s.email, s.displayName, s.streak);
      if (r.success) sent++; else failed++;
      await new Promise(resolve => setTimeout(resolve, 300)); // rate limit
    }

    console.log(`🔥 [Streak Reminder] Sent: ${sent}, Failed: ${failed}`);
    return res.status(200).json({ success: true, sent, failed, total: students.length });
  } catch (err) {
    console.error('❌ [Notify] Streak reminder error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
