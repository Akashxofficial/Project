// api/admin/notify/stats.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const total = await StudentModel.countDocuments({});
    const optedOut = await StudentModel.countDocuments({ emailOptOut: true });
    const welcomeSent = await StudentModel.countDocuments({ welcomeEmailSent: true });
    return res.status(200).json({ total, optedOut, optedIn: total - optedOut, welcomeSent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
