// api/track/subscription.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const {
      uid,
      subscriptionActive,
      subscriptionPlan,
      subscriptionAmount,
      subscriptionUtr,
      subscriptionActivatedAt
    } = req.body;

    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    const updated = await StudentModel.findOneAndUpdate(
      { uid },
      {
        subscriptionActive:      subscriptionActive      || false,
        subscriptionPlan:        subscriptionPlan        || 'Free',
        subscriptionAmount:      subscriptionAmount      || 0,
        subscriptionUtr:         subscriptionUtr         || '',
        subscriptionActivatedAt: subscriptionActivatedAt ? new Date(subscriptionActivatedAt) : null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Student not found' });

    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ [MongoDB] Error updating subscription:', error);
    return res.status(500).json({ error: 'Failed to update subscription' });
  }
}
