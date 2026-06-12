// api/admin/notify.js — Unified Vercel Serverless Function
import { connectDB, StudentModel } from '../_mongo.js';
import { sendStreakReminderEmail, sendStudyReminderEmail, sendDynamicDailyEmail } from '../_mailer.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vercel-cron, x-bypass-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Determine action from query, body, or URL path
  let action = req.query.action || req.body?.action || '';
  if (!action) {
    const urlPath = req.url || '';
    if (urlPath.includes('stats')) action = 'stats';
    else if (urlPath.includes('streak-reminder')) action = 'streak-reminder';
    else if (urlPath.includes('study-reminder')) action = 'study-reminder';
    else if (urlPath.includes('cron-reminder')) action = 'cron-reminder';
  }

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  // 1. STATS ACTION
  if (action === 'stats') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed for stats' });
    }
    try {
      await connectDB();
      const total = await StudentModel.countDocuments({});
      const optedOut = await StudentModel.countDocuments({ emailOptOut: true });
      const welcomeSent = await StudentModel.countDocuments({ welcomeEmailSent: true });
      return res.status(200).json({ total, optedOut, optedIn: total - optedOut, welcomeSent });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. STREAK REMINDER ACTION
  if (action === 'streak-reminder') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed for streak-reminder' });
    }
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

  // 3. STUDY REMINDER ACTION
  if (action === 'study-reminder') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed for study-reminder' });
    }
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

  // 4. CRON REMINDER ACTION
  if (action === 'cron-reminder') {
    // Validate security to prevent arbitrary trigger spamming
    const isCron = req.headers['x-vercel-cron'] === 'true';
    const isDev = process.env.NODE_ENV === 'development';
    const bypassKey = process.env.CRON_BYPASS_KEY || 'tanios-cron-bypass-key-2026';
    const hasBypass = req.headers['x-bypass-key'] === bypassKey;

    if (!isCron && !isDev && !hasBypass) {
      console.warn('⚠️ [Cron] Unauthorized access attempt blocked. Missing Vercel Cron signature.');
      return res.status(401).json({ error: 'Unauthorized: Cron signature mismatch' });
    }

    try {
      await connectDB();

      // Calculate Indian Standard Time (IST) (UTC + 5:30)
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();
      const totalMinutesIST = (utcHour * 60 + utcMinute + 330) % 1440;
      const hourIST = Math.floor(totalMinutesIST / 60);

      // Determine target greeting phase
      let timeOfDay = 'evening';
      if (hourIST >= 5 && hourIST < 12) {
        timeOfDay = 'morning';
      } else if (hourIST >= 12 && hourIST < 17) {
        timeOfDay = 'afternoon';
      }

      console.log(`⏰ [Cron] Run initiated. System time: ${now.toISOString()} | IST Time: ${hourIST}:${utcMinute.toString().padStart(2, '0')} | Determined phase: ${timeOfDay}`);

      // Query active, non-opted-out students with preferences matching current phase
      const query = { emailOptOut: { $ne: true } };
      if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
        query['notificationPrefs.studyReminder'] = { $ne: false };
      } else if (timeOfDay === 'evening') {
        query['notificationPrefs.streakReminder'] = { $ne: false };
      }

      const students = await StudentModel.find(query);
      console.log(`📋 [Cron] Found ${students.length} students matching phase "${timeOfDay}" notification filter.`);

      if (!students.length) {
        return res.status(200).json({
          success: true,
          message: `No active students found for notification phase: ${timeOfDay}`,
          sent: 0,
          timeOfDay
        });
      }

      let sent = 0;
      let failed = 0;
      const results = [];

      // Send emails sequentially with small rate-limit delay
      for (const student of students) {
        try {
          if (!student.email || student.email.includes('no-email@')) {
            results.push({ email: student.email, success: false, reason: 'Invalid email placeholder' });
            failed++;
            continue;
          }

          const r = await sendDynamicDailyEmail(student, timeOfDay);
          if (r.success) {
            sent++;
            results.push({ email: student.email, success: true });
            
            // Log timestamp of email in database to prevent double send loops
            await StudentModel.findOneAndUpdate(
              { uid: student.uid },
              { lastEmailSentAt: new Date() }
            );
          } else {
            failed++;
            results.push({ email: student.email, success: false, error: r.error || 'SMTP rejection' });
          }
        } catch (err) {
          failed++;
          results.push({ email: student?.email, success: false, error: err.message });
          console.error(`❌ [Cron] Error sending daily email to ${student?.email}:`, err.message);
        }

        // Small rate limiting gap (250ms) to respect smtp delivery limits
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      console.log(`🎯 [Cron] Daily notification batch completed. Phase: ${timeOfDay}. Sent: ${sent}, Failed: ${failed}.`);

      return res.status(200).json({
        success: true,
        phase: timeOfDay,
        totalStudentsMatched: students.length,
        sent,
        failed,
        details: results
      });

    } catch (error) {
      console.error('❌ [Cron] Critical failure during cron pipeline execution:', error);
      return res.status(500).json({ error: 'Critical cron server error', details: error.message });
    }
  }

  return res.status(400).json({ error: `Unsupported action: ${action}` });
}
