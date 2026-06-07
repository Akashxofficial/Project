import express from 'express';
import handler from './api/generate.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { connectDB, ActivityModel, StudentModel, PaymentModel } from './api/mongo.js';
import {
  sendWelcomeEmail,
  sendStreakReminderEmail,
  sendStudyReminderEmail,
  sendSubscriptionApprovedEmail,
  sendSubscriptionRejectedEmail,
  sendBroadcastEmail,
} from './api/mailer.js';

const app = express();
// Connect to MongoDB
connectDB();

// Parse JSON request bodies with larger limit for images
app.use(express.json({ limit: '10mb' }));

// Enable CORS for local Vite development server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Razorpay with key from environment
const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
let razorpay = null;

if (razorpayKeyId && !razorpayKeyId.includes('placeholder') && razorpayKeySecret && !razorpayKeySecret.includes('placeholder')) {
  try {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
    console.log("💳 [Razorpay] Active production/test secret key initialized.");
  } catch (err) {
    console.error("❌ [Razorpay] Initialization failed:", err.message);
  }
}

// POST endpoint to create Razorpay orders
app.post('/api/razorpay-order', async (req, res) => {
  const { userId, userEmail, userName } = req.body;

  if (!userId || !userEmail) {
    return res.status(400).json({ error: "Missing required student metadata: userId, userEmail" });
  }

  // 1. If key is placeholder or Razorpay SDK is not initialized, fire highly polished local sandbox flow
  if (!razorpay) {
    console.log(`💻 [Razorpay Sandbox] Initializing mock checkout order for user: ${userEmail}`);
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return res.status(200).json({
      orderId: mockOrderId,
      amount: 19900,
      keyId: "rzp_test_placeholder_tanios",
      isMock: true
    });
  }

  // 2. Real Razorpay SDK Order Creator
  try {
    const options = {
      amount: 19900, // ₹199 in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        userId,
        userEmail,
        userName: userName || 'Student'
      }
    };

    const order = await razorpay.orders.create(options);
    console.log(`💳 [Razorpay] Created order: ${order.id} for user: ${userEmail}`);
    
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      keyId: razorpayKeyId,
      isMock: false
    });
  } catch (error) {
    const errorMsg = error.description || error.error?.description || error.message || "Unknown error";
    console.error("❌ [Razorpay] Order creation error:", errorMsg, error);
    res.status(500).json({ error: `Razorpay Order creation error: ${errorMsg}` });
  }
});

// POST endpoint to verify Razorpay signatures (idempotent, anti-tampering)
app.post('/api/razorpay-verify', async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    userId, 
    userEmail, 
    userName 
  } = req.body;

  if (!razorpay_order_id || !userId || !userEmail) {
    return res.status(400).json({ error: "Missing required verification data." });
  }

  // 1. If mock sandbox order, bypass cryptographic signature check
  if (razorpay_order_id.startsWith('order_mock_')) {
    console.log(`💻 [Razorpay Sandbox] Verifying mock order: ${razorpay_order_id}`);
    return res.status(200).json({
      success: true,
      message: "Mock payment successfully verified",
      isMock: true
    });
  }

  if (!razorpay) {
    return res.status(500).json({ error: "Razorpay SDK is not initialized, but a non-mock order ID was provided." });
  }

  // 2. Real cryptographic verification via HMAC SHA-256
  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.warn(`❌ [Razorpay] Cryptographic signature mismatch. Possible tampering detected for order: ${razorpay_order_id}`);
      return res.status(400).json({ error: "Payment verification failed. Cryptographic signature mismatch." });
    }

    console.log(`✅ [Razorpay] Payment verified successfully for order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`);
    res.status(200).json({
      success: true,
      message: "Payment successfully verified",
      isMock: false
    });
  } catch (error) {
    const errorMsg = error.description || error.error?.description || error.message || "Unknown error";
    console.error("❌ [Razorpay] Verification execution error:", errorMsg, error);
    res.status(500).json({ error: `Signature verification execution error: ${errorMsg}` });
  }
});

// Map POST /api/generate directly to Vercel handler
app.post('/api/generate', handler);

// ── MongoDB Analytics Tracking API ──

// Ingest activity tracking events
app.post('/api/track/activity', async (req, res) => {
  try {
    const { userId, userName, action, details } = req.body;
    
    // Create new activity doc
    const newActivity = new ActivityModel({
      userId: userId || 'anonymous',
      userName: userName || 'Guest',
      action,
      details
    });
    await newActivity.save();
    
    res.status(200).json({ success: true, id: newActivity._id });
  } catch (error) {
    console.error("❌ [MongoDB] Error tracking activity:", error);
    res.status(500).json({ error: "Failed to track activity" });
  }
});

// Fetch activities for Admin Panel
app.get('/api/admin/activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const activities = await ActivityModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
      
    // Map _id to id so it matches existing frontend expectations
    const mapped = activities.map(a => ({
      id: a._id.toString(),
      userId: a.userId,
      userName: a.userName,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt
    }));
    
    res.status(200).json(mapped);
  } catch (error) {
    console.error("❌ [MongoDB] Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// Sync user profile (login event — increments loginCount, updates lastLoginAt)
app.post('/api/track/user', async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;
    console.log(`[MongoDB Sync] Received user sync request:`, { uid, email, displayName });
    
    if (!uid) {
      console.warn(`[MongoDB Sync] Skipping user sync because uid is missing`);
      return res.status(400).json({ error: "Missing uid" });
    }

    // Find existing student first to increment loginCount
    const existing = await StudentModel.findOne({ uid });
    const newLoginCount = (existing?.loginCount || 0) + 1;

    const updated = await StudentModel.findOneAndUpdate(
      { uid },
      {
        uid,
        email: email || 'no-email@student.com',
        displayName: displayName || 'Student',
        photoURL: photoURL || '',
        lastLoginAt: new Date(),
        loginCount: newLoginCount,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[MongoDB Sync] Successfully saved user to DB:`, updated.email, `| Login count: ${newLoginCount}`);
    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error("❌ [MongoDB] Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user", details: error.message });
  }
});

// Track payment completion
app.post('/api/track/payment', async (req, res) => {
  try {
    const { userId, userEmail, amount, utr, status, method } = req.body;
    const newPayment = new PaymentModel({ userId, userEmail, amount, utr, status, method });
    await newPayment.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ [MongoDB] Error tracking payment:", error);
    res.status(500).json({ error: "Failed to track payment" });
  }
});

// Update subscription status in MongoDB (called when admin approves/rejects)
app.post('/api/track/subscription', async (req, res) => {
  try {
    const { uid, subscriptionActive, subscriptionPlan, subscriptionAmount, subscriptionUtr, subscriptionActivatedAt } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    const updated = await StudentModel.findOneAndUpdate(
      { uid },
      {
        subscriptionActive: subscriptionActive || false,
        subscriptionPlan: subscriptionPlan || 'Free',
        subscriptionAmount: subscriptionAmount || 0,
        subscriptionUtr: subscriptionUtr || '',
        subscriptionActivatedAt: subscriptionActivatedAt ? new Date(subscriptionActivatedAt) : null,
        updatedAt: new Date()
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Student not found' });
    console.log(`[MongoDB] Subscription updated for ${uid}: active=${subscriptionActive}`);
    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [MongoDB] Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Fetch all students for Admin Panel
app.get('/api/admin/students', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const students = await StudentModel.find({})
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(limit);
    res.status(200).json(students);
  } catch (error) {
    console.error('❌ [MongoDB] Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Fetch all payments for Admin Panel
app.get('/api/admin/payments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const payments = await PaymentModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    
    const mapped = [];
    for (const p of payments) {
      const student = await StudentModel.findOne({ uid: p.userId });
      mapped.push({
        id: p._id.toString(),
        userId: p.userId,
        userEmail: p.userEmail,
        userName: student?.displayName || p.userEmail.split('@')[0],
        utr: p.utr,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt
      });
    }
    
    res.status(200).json(mapped);
  } catch (error) {
    console.error("❌ [MongoDB] Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// ── Admin: Approve Subscription ──────────────────────────────────────────────
// Called by admin dashboard to approve a pending UTR payment.
// Uses MongoDB directly — bypasses all Firestore client permission rules.
app.post('/api/admin/approve-subscription', async (req, res) => {
  try {
    const { requestId, userId, userName, userEmail, utr, amount } = req.body;
    if (!requestId || (!userId && !userEmail)) {
      return res.status(400).json({ error: 'Missing requestId, userId, or userEmail' });
    }

    // Find and update student subscription status in MongoDB (by uid or email)
    const queryCond = userId ? { uid: userId } : { email: userEmail };
    const updated = await StudentModel.findOneAndUpdate(
      queryCond,
      {
        subscriptionActive: true,
        subscriptionPlan: 'Pro AI Member',
        subscriptionAmount: amount || 199,
        subscriptionUtr: utr || '',
        subscriptionActivatedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, upsert: false }
    );

    // Update corresponding PaymentModel log to approved
    if (utr) {
      await PaymentModel.findOneAndUpdate(
        { utr: utr },
        { status: 'approved' }
      );
    }

    // Log activity
    const approvalActivity = new ActivityModel({
      userId: userId || 'admin',
      userName: userName || 'Admin',
      action: 'subscription_approved',
      details: `Approved Pro subscription for ${userName || userEmail || 'Student'} (UTR: ${utr})`
    });
    await approvalActivity.save();

    console.log(`✅ [Admin] Subscription approved for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

    // ── Send approval email ────────────────────────────────────────────────
    if (userEmail) {
      sendSubscriptionApprovedEmail(userEmail, userName).catch(e =>
        console.error('⚠️  [Mailer] Approval email failed:', e.message)
      );
    }

    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [Admin] Error approving subscription:', error);
    res.status(500).json({ error: 'Failed to approve subscription: ' + error.message });
  }
});

// ── Admin: Reject Subscription ───────────────────────────────────────────────
app.post('/api/admin/reject-subscription', async (req, res) => {
  try {
    const { requestId, userId, userName, userEmail, utr } = req.body;
    if (!requestId || (!userId && !userEmail)) {
      return res.status(400).json({ error: 'Missing requestId, userId, or userEmail' });
    }

    const queryCond = userId ? { uid: userId } : { email: userEmail };
    const updated = await StudentModel.findOneAndUpdate(
      queryCond,
      {
        subscriptionActive: false,
        subscriptionPlan: 'None (Rejected)',
        subscriptionAmount: 0,
        updatedAt: new Date()
      },
      { new: true, upsert: false }
    );

    // Update corresponding PaymentModel log to rejected
    if (utr) {
      await PaymentModel.findOneAndUpdate(
        { utr: utr },
        { status: 'rejected' }
      );
    }

    const rejectActivity = new ActivityModel({
      userId: userId || 'admin',
      userName: userName || 'Admin',
      action: 'subscription_rejected',
      details: `Rejected subscription claim for ${userName || userEmail || 'Student'} (UTR: ${utr})`
    });
    await rejectActivity.save();

    console.log(`❌ [Admin] Subscription rejected for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

    // ── Send rejection email ───────────────────────────────────────────────
    if (userEmail) {
      sendSubscriptionRejectedEmail(userEmail, userName).catch(e =>
        console.error('⚠️  [Mailer] Rejection email failed:', e.message)
      );
    }

    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [Admin] Error rejecting subscription:', error);
    res.status(500).json({ error: 'Failed to reject subscription: ' + error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📧 EMAIL NOTIFICATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Send welcome email (called automatically on first user sync) ──────────────
app.post('/api/notify/welcome', async (req, res) => {
  try {
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

    res.status(200).json(result);
  } catch (err) {
    console.error('❌ [Notify] Welcome email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Broadcast: send custom email to all/selected students ───────────────
app.post('/api/admin/broadcast', async (req, res) => {
  try {
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

    // Fire and forget — returns immediately
    sendBroadcastEmail(recipients, subject, messageHtml)
      .then(r => console.log(`📢 [Broadcast] Finished: ${r.sent} sent, ${r.failed} failed`))
      .catch(e => console.error('❌ [Broadcast] Error:', e.message));

    res.status(200).json({
      success: true,
      queued: recipients.length,
      message: `Broadcast queued for ${recipients.length} students`
    });
  } catch (err) {
    console.error('❌ [Notify] Broadcast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Streak Reminder: send to students who haven't logged in today ─────────────
// Call this via cron at 7 PM daily (e.g., from a scheduler or admin panel)
app.post('/api/admin/notify/streak-reminder', async (req, res) => {
  try {
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
    res.status(200).json({ success: true, sent, failed, total: students.length });
  } catch (err) {
    console.error('❌ [Notify] Streak reminder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Daily Study Reminder: send to all opted-in students ───────────────────────
// Call this via cron at 8 AM daily
app.post('/api/admin/notify/study-reminder', async (req, res) => {
  try {
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
    res.status(200).json({ success: true, sent, failed, total: students.length });
  } catch (err) {
    console.error('❌ [Notify] Study reminder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Email stats: how many students opted in/out ───────────────────────────────
app.get('/api/admin/notify/stats', async (req, res) => {
  try {
    const total = await StudentModel.countDocuments({});
    const optedOut = await StudentModel.countDocuments({ emailOptOut: true });
    const welcomeSent = await StudentModel.countDocuments({ welcomeEmailSent: true });
    res.status(200).json({ total, optedOut, optedIn: total - optedOut, welcomeSent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 TaniOS Local Backend Server running on http://localhost:${PORT}`);
});
