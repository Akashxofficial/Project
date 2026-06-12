// api/track.js — Unified Vercel Serverless Function for Ingest Metrics
import { connectDB, ActivityModel, StudentModel, PaymentModel } from './_mongo.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Differentiate track type from query parameter or path fallback
  const type = req.query.type || req.url?.split('/').pop()?.split('?')[0];

  try {
    await connectDB();

    // ── 1. Activity Tracking ─────────────────────────────────────────────────
    if (type === 'activity') {
      const { userId, userName, action, details } = req.body;
      const newActivity = new ActivityModel({
        userId:   userId   || 'anonymous',
        userName: userName || 'Guest',
        action,
        details
      });
      await newActivity.save();
      return res.status(200).json({ success: true, id: newActivity._id });
    }

    // ── 2. User/Student Ingestion & Login Stats Sync ──────────────────────────
    if (type === 'user') {
      const { uid, email, displayName, photoURL } = req.body;
      if (!uid) return res.status(400).json({ error: 'Missing uid' });

      const existing = await StudentModel.findOne({ uid });
      const newLoginCount = (existing?.loginCount || 0) + 1;

      const updated = await StudentModel.findOneAndUpdate(
        { uid },
        {
          uid,
          email:       email       || 'no-email@student.com',
          displayName: displayName || 'Student',
          photoURL:    photoURL    || '',
          lastLoginAt: new Date(),
          loginCount:  newLoginCount,
          updatedAt:   new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(200).json({ success: true, user: updated });
    }

    // ── 3. Payment Tracking ──────────────────────────────────────────────────
    if (type === 'payment') {
      const { userId, userEmail, amount, utr, status, method } = req.body;
      const newPayment = new PaymentModel({ userId, userEmail, amount, utr, status, method });
      await newPayment.save();
      return res.status(200).json({ success: true });
    }

    // ── 4. Subscription State Updates ─────────────────────────────────────────
    if (type === 'subscription') {
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
    }

    return res.status(400).json({ error: `Invalid track action: ${type}` });

  } catch (error) {
    console.error(`❌ [MongoDB] Tracking failed for type "${type}":`, error);
    return res.status(500).json({ error: `Failed to track ${type}`, details: error.message });
  }
}
