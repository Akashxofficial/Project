// api/admin/payments.js — Vercel Serverless Function
// Fetches all payment records from MongoDB for the Admin Subscription Queue.
// Mirrors the GET /api/admin/payments route in server.js (lines 300-327).
import { connectDB, PaymentModel, StudentModel } from '../_mongo.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();

    const limit = parseInt(req.query?.limit) || 100;
    const payments = await PaymentModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    // Join with StudentModel to resolve userName from displayName
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

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('❌ [MongoDB] Error fetching payments:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
}
