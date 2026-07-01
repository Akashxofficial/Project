// api/admin/subscription-action.js — Vercel Serverless Function (Handles Approve / Reject)
import { connectDB, StudentModel, PaymentModel, ActivityModel } from '../_mongo.js';
import { sendSubscriptionApprovedEmail, sendSubscriptionRejectedEmail } from '../_mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();

    const action = req.query.action; // 'approve' or 'reject'
    const { requestId, userId, userName, userEmail, utr, amount } = req.body;

    if (!requestId || (!userId && !userEmail)) {
      return res.status(400).json({ error: 'Missing requestId, userId, or userEmail' });
    }

    const queryCond = userId ? { uid: userId } : { email: userEmail };

    if (action === 'approve') {
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
    } else if (action === 'reject') {
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
    } else {
      return res.status(400).json({ error: `Invalid action: ${action}` });
    }
  } catch (error) {
    console.error('❌ [Admin] Error performing subscription action:', error);
    return res.status(500).json({ error: 'Subscription action failed: ' + error.message });
  }
}
