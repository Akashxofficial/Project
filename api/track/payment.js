// api/track/payment.js — Vercel Serverless Function
import { connectDB, PaymentModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { userId, userEmail, amount, utr, status, method } = req.body;

    const newPayment = new PaymentModel({ userId, userEmail, amount, utr, status, method });
    await newPayment.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ [MongoDB] Error tracking payment:', error);
    return res.status(500).json({ error: 'Failed to track payment' });
  }
}
