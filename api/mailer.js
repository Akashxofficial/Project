/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TaniOS AI — Email Notification Engine
 * Uses Nodemailer + Gmail App Password
 * ─────────────────────────────────────────────────────────────────────────────
 */

import nodemailer from 'nodemailer';

// ── Transporter ───────────────────────────────────────────────────────────────
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass || user.includes('your-gmail')) {
    console.warn('⚠️  [Mailer] EMAIL_USER or EMAIL_APP_PASSWORD not configured. Emails will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

// ── Base HTML Shell ───────────────────────────────────────────────────────────
const emailShell = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaniOS AI</title>
</head>
<body style="margin:0;padding:0;background:#0d0f17;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f17;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#12151f;border-radius:20px;
                      border:1px solid rgba(99,102,241,0.2);
                      box-shadow:0 25px 60px rgba(0,0,0,0.6);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#f59e0b);
                                  border-radius:10px;display:inline-block;vertical-align:middle;
                                  line-height:36px;text-align:center;font-size:18px;">✨</div>
                      <span style="font-size:1.35rem;font-weight:800;color:#fff;vertical-align:middle;
                                   letter-spacing:-0.02em;margin-left:10px;">
                        TaniOS <span style="background:linear-gradient(90deg,#6366f1,#f59e0b);
                                            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">AI</span>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:0.75rem;color:rgba(255,255,255,0.25);text-align:center;line-height:1.6;">
                TaniOS AI — Smart Study Platform for Indian Students<br/>
                <a href="https://project-ar2s.vercel.app" style="color:#6366f1;text-decoration:none;">project-ar2s.vercel.app</a>
                &nbsp;·&nbsp;
                <a href="https://project-ar2s.vercel.app/unsubscribe" style="color:rgba(255,255,255,0.25);text-decoration:none;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Core Send Function ─────────────────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) return { success: false, skipped: true };

  try {
    const info = await transporter.sendMail({
      from: `"TaniOS AI 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 [Mailer] Sent "${subject}" → ${to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [Mailer] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ── Batch Send (for broadcast) ─────────────────────────────────────────────────
export const sendEmailBatch = async (recipients, subject, html, delayMs = 300) => {
  const results = [];
  for (const to of recipients) {
    const r = await sendEmail({ to, subject, html });
    results.push({ to, ...r });
    if (delayMs) await new Promise(res => setTimeout(res, delayMs)); // rate-limit
  }
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success && !r.skipped).length;
  console.log(`📧 [Mailer] Broadcast done: ${sent} sent, ${failed} failed`);
  return { results, sent, failed };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📨 EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Welcome Email ──────────────────────────────────────────────────────────
export const sendWelcomeEmail = (email, name) => {
  const firstName = (name || 'Student').split(' ')[0];
  const html = emailShell(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:-0.02em;">
        Welcome, ${firstName}!
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.7;margin:0;">
        You've just joined the smartest AI-powered study platform for Indian students.
      </p>
    </div>

    <!-- Feature highlights -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${[
        ['💬', 'AI Doubt Solver', 'Ask any question in English or Hindi — get instant board-focused answers.'],
        ['📝', 'AI Notes Generator', 'Generate structured notes for any topic in seconds.'],
        ['📅', 'Smart Study Planner', 'Personalized timetable based on your board & exam date.'],
        ['🔥', 'Daily Streak', 'Keep your study streak going to earn XP and climb levels!'],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:8px 0;">
            <table cellpadding="0" cellspacing="0" width="100%"
                   style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);
                          border-radius:12px;padding:14px 18px;">
              <tr>
                <td width="36" style="font-size:1.3rem;vertical-align:top;">${icon}</td>
                <td style="padding-left:14px;vertical-align:top;">
                  <div style="font-weight:700;color:#fff;font-size:0.9rem;margin-bottom:3px;">${title}</div>
                  <div style="color:rgba(255,255,255,0.45);font-size:0.8rem;line-height:1.5;">${desc}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `).join('')}
    </table>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;font-weight:700;font-size:0.95rem;
                border-radius:10px;text-decoration:none;
                box-shadow:0 6px 20px rgba(99,102,241,0.4);">
        Start Studying Now →
      </a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `🎉 Welcome to TaniOS AI, ${firstName}!`,
    html,
  });
};

// ── 2. Streak Reminder ─────────────────────────────────────────────────────────
export const sendStreakReminderEmail = (email, name, currentStreak) => {
  const firstName = (name || 'Student').split(' ')[0];
  const html = emailShell(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:3.5rem;margin-bottom:12px;">🔥</div>
      <h1 style="font-size:1.5rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:-0.02em;">
        ${firstName}, don't lose your streak!
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.7;margin:0;">
        You haven't studied today yet. Come back and keep your
        <strong style="color:#f59e0b;">${currentStreak || 0}-day streak</strong> alive!
      </p>
    </div>

    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,146,60,0.08));
                border:1px solid rgba(245,158,11,0.25);border-radius:14px;
                padding:20px 24px;margin-bottom:28px;text-align:center;">
      <div style="font-size:2rem;font-weight:900;color:#f59e0b;margin-bottom:4px;">
        🔥 ${currentStreak || 0} Days
      </div>
      <div style="color:rgba(255,255,255,0.4);font-size:0.82rem;">
        Current study streak — keep it going!
      </div>
    </div>

    <p style="color:rgba(255,255,255,0.45);font-size:0.875rem;line-height:1.7;margin-bottom:24px;">
      Just 5 minutes of studying today is enough to keep your streak alive.
      Ask an AI doubt, generate notes, or take a quick revision quiz!
    </p>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app/chat"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#f59e0b,#ef4444);
                color:#fff;font-weight:700;font-size:0.95rem;
                border-radius:10px;text-decoration:none;
                box-shadow:0 6px 20px rgba(245,158,11,0.4);">
        Resume Studying 🔥
      </a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `🔥 Don't break your ${currentStreak || 0}-day streak, ${firstName}!`,
    html,
  });
};

// ── 3. Study Reminder (Daily) ─────────────────────────────────────────────────
export const sendStudyReminderEmail = (email, name) => {
  const firstName = (name || 'Student').split(' ')[0];
  const tips = [
    "Solve at least 5 MCQs today — it rewires your memory!",
    "Read your AI-generated notes for 10 minutes before school.",
    "Ask TaniOS AI to explain your toughest concept today.",
    "Generate a revision sheet and revise 3 topics in 15 minutes.",
    "Consistency beats intensity — even 15 mins counts!",
  ];
  const tip = tips[new Date().getDay() % tips.length];

  const html = emailShell(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:3rem;margin-bottom:12px;">📚</div>
      <h1 style="font-size:1.5rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:-0.02em;">
        Good morning, ${firstName}!
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.7;margin:0;">
        Your study session for today is ready. Let's crush it!
      </p>
    </div>

    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);
                border-left:3px solid #6366f1;border-radius:0 12px 12px 0;
                padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;
                  letter-spacing:0.1em;color:#6366f1;margin-bottom:6px;">💡 Today's Tip</div>
      <div style="color:#fff;font-size:0.9rem;line-height:1.6;">${tip}</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        ${[
          ['💬', 'Ask a Doubt', '/chat'],
          ['📝', 'Generate Notes', '/notes'],
          ['🧪', 'Take a Test', '/test'],
        ].map(([icon, label, path]) => `
          <td width="33%" style="padding:0 6px;text-align:center;">
            <a href="https://project-ar2s.vercel.app${path}"
               style="display:block;background:rgba(255,255,255,0.04);
                      border:1px solid rgba(255,255,255,0.08);border-radius:10px;
                      padding:16px 8px;text-decoration:none;
                      transition:background 0.2s;">
              <div style="font-size:1.5rem;margin-bottom:6px;">${icon}</div>
              <div style="color:#fff;font-size:0.78rem;font-weight:600;">${label}</div>
            </a>
          </td>
        `).join('')}
      </tr>
    </table>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app"
         style="display:inline-block;padding:13px 32px;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;font-weight:700;font-size:0.9rem;
                border-radius:10px;text-decoration:none;">
        Open TaniOS AI →
      </a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `📚 Ready to study, ${firstName}? Your AI tutor is waiting!`,
    html,
  });
};

// ── 4. Subscription Approved ──────────────────────────────────────────────────
export const sendSubscriptionApprovedEmail = (email, name, plan = 'Pro AI Member') => {
  const firstName = (name || 'Student').split(' ')[0];
  const html = emailShell(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:3.5rem;margin-bottom:14px;">✅</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:-0.02em;">
        You're now a Pro Member!
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.7;margin:0;">
        Congratulations, ${firstName}! Your <strong style="color:#10b981;">${plan}</strong> subscription
        has been activated successfully.
      </p>
    </div>

    <!-- Pro perks -->
    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05));
                border:1px solid rgba(16,185,129,0.2);border-radius:16px;
                padding:24px;margin-bottom:28px;">
      <div style="font-weight:800;color:#10b981;font-size:0.85rem;
                  text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">
        👑 Your Pro Perks
      </div>
      ${[
        ['♾️', 'Unlimited AI Requests', 'No daily limits — ask as many doubts as you want'],
        ['📚', 'Textbook RAG Upload', 'Upload your textbooks and get instant answers from them'],
        ['🧪', 'Unlimited Mock Tests', 'Generate unlimited tests for any subject & chapter'],
        ['🏆', 'Priority AI Responses', 'Faster and more detailed responses tailored for you'],
      ].map(([icon, title, desc]) => `
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <span style="font-size:1.1rem;margin-right:12px;flex-shrink:0;">${icon}</span>
          <div>
            <div style="color:#fff;font-weight:600;font-size:0.88rem;">${title}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:0.78rem;margin-top:2px;">${desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app/chat"
         style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#10b981,#059669);
                color:#fff;font-weight:700;font-size:0.95rem;
                border-radius:10px;text-decoration:none;
                box-shadow:0 6px 20px rgba(16,185,129,0.35);">
        Start Using Pro Features →
      </a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `✅ Your TaniOS Pro subscription is active, ${firstName}! 🎓`,
    html,
  });
};

// ── 5. Subscription Rejected ──────────────────────────────────────────────────
export const sendSubscriptionRejectedEmail = (email, name) => {
  const firstName = (name || 'Student').split(' ')[0];
  const html = emailShell(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:3rem;margin-bottom:14px;">❌</div>
      <h1 style="font-size:1.5rem;font-weight:800;color:#fff;margin:0 0 10px;letter-spacing:-0.02em;">
        Payment Could Not Be Verified
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.95rem;line-height:1.7;margin:0;">
        Hi ${firstName}, unfortunately we could not verify your payment for TaniOS Pro.
      </p>
    </div>

    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
                border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-weight:700;color:#ef4444;font-size:0.85rem;margin-bottom:10px;">
        Common reasons for rejection:
      </div>
      <ul style="margin:0;padding-left:18px;color:rgba(255,255,255,0.5);font-size:0.875rem;line-height:1.8;">
        <li>UTR number entered incorrectly</li>
        <li>Payment sent to wrong UPI ID</li>
        <li>Transaction amount was different from ₹199</li>
        <li>Payment is still pending at your bank</li>
      </ul>
    </div>

    <p style="color:rgba(255,255,255,0.45);font-size:0.875rem;line-height:1.7;margin-bottom:24px;">
      Please try again with the correct UTR number, or contact us on Instagram/WhatsApp for help.
      We're happy to resolve this quickly for you!
    </p>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app/subscribe"
         style="display:inline-block;padding:13px 32px;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;font-weight:700;font-size:0.9rem;
                border-radius:10px;text-decoration:none;margin-right:10px;">
        Try Again →
      </a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `❌ TaniOS Pro — Payment verification failed`,
    html,
  });
};

// ── 6. Admin Broadcast ────────────────────────────────────────────────────────
export const sendBroadcastEmail = (recipients, subject, messageHtml) => {
  const html = emailShell(`
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:rgba(99,102,241,0.12);
                  border:1px solid rgba(99,102,241,0.25);border-radius:6px;
                  padding:4px 12px;font-size:0.72rem;font-weight:700;
                  color:#a78bfa;text-transform:uppercase;letter-spacing:0.08em;
                  margin-bottom:16px;">
        📢 Announcement
      </div>
      <div style="color:#fff;font-size:0.95rem;line-height:1.75;">
        ${messageHtml}
      </div>
    </div>

    <div style="text-align:center;">
      <a href="https://project-ar2s.vercel.app"
         style="display:inline-block;padding:13px 32px;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;font-weight:700;font-size:0.9rem;
                border-radius:10px;text-decoration:none;">
        Open TaniOS AI →
      </a>
    </div>
  `);

  return sendEmailBatch(recipients, subject, html, 400);
};
