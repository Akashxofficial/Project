// api/admin.js — Consolidated Vercel Serverless Function for Administrative Tasks
import { connectDB, ActivityModel, StudentModel, PaymentModel } from './_mongo.js';
import { sendSubscriptionApprovedEmail, sendSubscriptionRejectedEmail, sendBroadcastEmail } from './_mailer.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action || '';

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  try {
    await connectDB();

    // ──────────────────────────────────────────────────────────────────────────
    // GET ACTIONS
    // ──────────────────────────────────────────────────────────────────────────

    // 1. Fetch Admin Log Activities
    if (action === 'activities') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed for activities' });
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 20;
      const skip = (page - 1) * limit;

      const totalRecords = await ActivityModel.countDocuments({});
      const totalPages = Math.ceil(totalRecords / limit);

      const activities = await ActivityModel.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const mapped = activities.map(a => ({
        id: a._id.toString(),
        userId: a.userId,
        userName: a.userName,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt
      }));

      return res.status(200).json({
        success: true,
        activities: mapped,
        pagination: { currentPage: page, totalPages, totalRecords, limit }
      });
    }

    // 2. Fetch Student Registry list
    if (action === 'students') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed for students' });
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 20;
      const skip = (page - 1) * limit;

      const totalRecords = await StudentModel.countDocuments({});
      const totalPages = Math.ceil(totalRecords / limit);

      const students = await StudentModel.find({})
        .sort({ lastLoginAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        success: true,
        students,
        pagination: { currentPage: page, totalPages, totalRecords, limit }
      });
    }

    // 3. Fetch Payments list
    if (action === 'payments') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed for payments' });
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 20;
      const skip = (page - 1) * limit;

      const totalRecords = await PaymentModel.countDocuments({});
      const totalPages = Math.ceil(totalRecords / limit);

      const payments = await PaymentModel.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
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

      return res.status(200).json({
        success: true,
        payments: mapped,
        pagination: { currentPage: page, totalPages, totalRecords, limit }
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST ACTIONS
    // ──────────────────────────────────────────────────────────────────────────

    // 4. Handle Subscription Action (Approve / Reject)
    if (action === 'subscription-action') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed for subscription-action' });
      const subAction = req.query.subAction || req.body?.subAction;
      const { requestId, userId, userName, userEmail, utr, amount } = req.body;

      if (subAction !== 'revoke' && subAction !== 'grant' && !requestId) {
        return res.status(400).json({ error: 'Missing requestId' });
      }
      if (!userId && !userEmail) {
        return res.status(400).json({ error: 'Missing userId or userEmail' });
      }

      const queryCond = userId ? { uid: userId } : { email: userEmail };

      if (subAction === 'approve') {
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

        if (utr) {
          await PaymentModel.findOneAndUpdate({ utr }, { status: 'approved' });
        }

        const approvalActivity = new ActivityModel({
          userId: userId || 'admin',
          userName: userName || 'Admin',
          action: 'subscription_approved',
          details: `Approved Pro subscription for ${userName || userEmail || 'Student'} (UTR: ${utr})`
        });
        await approvalActivity.save();

        console.log(`✅ [Admin] Subscription approved for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

        if (userEmail) {
          sendSubscriptionApprovedEmail(userEmail, userName).catch(e =>
            console.error('⚠️ [Mailer] Approval email failed:', e.message)
          );
        }

        return res.status(200).json({ success: true, user: updated });
      } else if (subAction === 'reject') {
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

        if (utr) {
          await PaymentModel.findOneAndUpdate({ utr }, { status: 'rejected' });
        }

        const rejectActivity = new ActivityModel({
          userId: userId || 'admin',
          userName: userName || 'Admin',
          action: 'subscription_rejected',
          details: `Rejected subscription claim for ${userName || userEmail || 'Student'} (UTR: ${utr})`
        });
        await rejectActivity.save();

        console.log(`❌ [Admin] Subscription rejected for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

        if (userEmail) {
          sendSubscriptionRejectedEmail(userEmail, userName).catch(e =>
            console.error('⚠️ [Mailer] Rejection email failed:', e.message)
          );
        }

        return res.status(200).json({ success: true, user: updated });
      } else if (subAction === 'revoke') {
        const updated = await StudentModel.findOneAndUpdate(
          queryCond,
          {
            subscriptionActive: false,
            subscriptionPlan: 'None (Revoked by Admin)',
            subscriptionAmount: 0,
            updatedAt: new Date()
          },
          { new: true, upsert: false }
        );

        const revokeActivity = new ActivityModel({
          userId: userId || 'admin',
          userName: userName || 'Admin',
          action: 'subscription_revoked',
          details: `Revoked Pro subscription access for ${userName || userEmail || 'Student'}`
        });
        await revokeActivity.save();

        console.log(`🚫 [Admin] Subscription revoked for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}`);

        return res.status(200).json({ success: true, user: updated });
      } else if (subAction === 'grant') {
        const updated = await StudentModel.findOneAndUpdate(
          queryCond,
          {
            subscriptionActive: true,
            subscriptionPlan: 'Pro AI Member (Granted by Admin)',
            subscriptionAmount: 0,
            subscriptionUtr: 'GRANTED_BY_ADMIN',
            subscriptionActivatedAt: new Date(),
            updatedAt: new Date()
          },
          { new: true, upsert: false }
        );

        const grantActivity = new ActivityModel({
          userId: userId || 'admin',
          userName: userName || 'Admin',
          action: 'subscription_granted',
          details: `Granted Pro subscription access to ${userName || userEmail || 'Student'}`
        });
        await grantActivity.save();

        console.log(`👑 [Admin] Subscription granted for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}`);

        return res.status(200).json({ success: true, user: updated });
      } else {
        return res.status(400).json({ error: `Invalid subAction: ${subAction}` });
      }
    }

    // 4.5. Handle Role Toggle (Make Admin / Demote Student)
    if (action === 'toggle-role') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed for toggle-role' });
      const { userId, userEmail, userName, role } = req.body;
      if (!userId && !userEmail) {
        return res.status(400).json({ error: 'Missing userId or userEmail' });
      }
      if (role !== 'admin' && role !== 'student') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const queryCond = userId ? { uid: userId } : { email: userEmail };

      const updated = await StudentModel.findOneAndUpdate(
        queryCond,
        { role, updatedAt: new Date() },
        { new: true, upsert: false }
      );

      const roleActivity = new ActivityModel({
        userId: userId || 'admin',
        userName: userName || 'Admin',
        action: 'role_changed',
        details: `Changed role for ${userName || userEmail || 'Student'} to ${role}`
      });
      await roleActivity.save();

      console.log(`👤 [Admin] Role changed for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'} to ${role}`);

      return res.status(200).json({ success: true, user: updated });
    }

    // 5. Handle Broadcast Announcement Email
    if (action === 'broadcast') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed for broadcast' });
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

      const result = await sendBroadcastEmail(recipients, subject, messageHtml);
      console.log(`📢 [Broadcast] Finished: ${result.sent} sent, ${result.failed} failed`);

      return res.status(200).json({
        success: true,
        queued: recipients.length,
        sent: result.sent,
        failed: result.failed,
        message: `Broadcast finished: ${result.sent} sent, ${result.failed} failed`
      });
    }

    return res.status(400).json({ error: `Unsupported action: ${action}` });

  } catch (error) {
    console.error(`❌ [Admin API] Failure during action "${action}":`, error);
    return res.status(500).json({ error: `Admin action failed: ${error.message}` });
  }
}
