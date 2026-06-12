// api/admin/approve-subscription.js — Vercel Serverless Function
import { connectDB, StudentModel, PaymentModel, ActivityModel } from '../_mongo.js';
import { sendSubscriptionApprovedEmail } from '../_mailer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();

    const { requestId, userId, userName, userEmail, utr, amount } = req.body;

    if (!requestId || (!userId && !userEmail)) {
      return res.status(400).json({ error: 'Missing requestId, userId, or userEmail' });
    }

    // Update student subscription status in MongoDB (by uid or email)
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

    // Update the corresponding payment record to approved
    if (utr) {
      await PaymentModel.findOneAndUpdate(
        { utr },
        { status: 'approved' }
      );
    }

    // Log the admin action
    const approvalActivity = new ActivityModel({
      userId: userId || 'admin',
      userName: userName || 'Admin',
      action: 'subscription_approved',
      details: `Approved Pro subscription for ${userName || userEmail || 'Student'} (UTR: ${utr})`
    });
    await approvalActivity.save();

    console.log(`✅ [Admin] Subscription approved for userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}, UTR: ${utr}`);

    // Send approval email (fire-and-forget — do not block the response)
    if (userEmail) {
      sendSubscriptionApprovedEmail(userEmail, userName).catch(e =>
        console.error('⚠️  [Mailer] Approval email failed:', e.message)
      );
    }

    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [Admin] Error approving subscription:', error);
    return res.status(500).json({ error: 'Failed to approve subscription: ' + error.message });
  }
}
