// api/admin/reject-subscription.js — Vercel Serverless Function
import { connectDB, StudentModel, PaymentModel, ActivityModel } from '../mongo.js';
import { sendSubscriptionRejectedEmail } from '../mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();

    const { requestId, userId, userName, userEmail, utr } = req.body;

    if (!requestId || (!userId && !userEmail)) {
      return res.status(400).json({ error: 'Missing requestId, userId, or userEmail' });
    }

    // Update student subscription status in MongoDB (by uid or email)
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

    // Update the corresponding payment record to rejected
    if (utr) {
      await PaymentModel.findOneAndUpdate(
        { utr },
        { status: 'rejected' }
      );
    }

    // Log the admin action
    const rejectActivity = new ActivityModel({
      userId: userId || 'admin',
      userName: userName || 'Admin',
      action: 'subscription_rejected',
      details: `Rejected subscription claim for ${userName || userEmail || 'Student'} (UTR: ${utr})`
    });
    await rejectActivity.save();

    console.log(`❌ [Admin] Subscription rejected for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

    // Send rejection email (fire-and-forget — do not block the response)
    if (userEmail) {
      sendSubscriptionRejectedEmail(userEmail, userName).catch(e =>
        console.error('⚠️  [Mailer] Rejection email failed:', e.message)
      );
    }

    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [Admin] Error rejecting subscription:', error);
    return res.status(500).json({ error: 'Failed to reject subscription: ' + error.message });
  }
}
