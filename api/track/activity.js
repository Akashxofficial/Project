// api/track/activity.js — Vercel Serverless Function
import { connectDB, ActivityModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { userId, userName, action, details } = req.body;

    const newActivity = new ActivityModel({
      userId:   userId   || 'anonymous',
      userName: userName || 'Guest',
      action,
      details
    });
    await newActivity.save();

    return res.status(200).json({ success: true, id: newActivity._id });
  } catch (error) {
    console.error('❌ [MongoDB] Error tracking activity:', error);
    return res.status(500).json({ error: 'Failed to track activity' });
  }
}
