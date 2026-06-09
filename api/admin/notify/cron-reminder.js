// api/admin/notify/cron-reminder.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../../mongo.js';
import { sendDynamicDailyEmail } from '../../mailer.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vercel-cron, x-bypass-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
