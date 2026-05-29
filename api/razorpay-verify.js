// api/razorpay-verify.js — Vercel Serverless Function
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    userEmail
  } = req.body;

  if (!razorpay_order_id || !userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required verification data.' });
  }

  // Allow sandbox mock orders through without signature check
  if (razorpay_order_id.startsWith('order_mock_')) {
    return res.status(200).json({ success: true, message: 'Mock payment verified', isMock: true });
  }

  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!razorpayKeySecret || razorpayKeySecret.includes('placeholder')) {
    return res
      .status(500)
      .json({ error: 'Razorpay secret not configured for production verification.' });
  }

  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res
        .status(400)
        .json({ error: 'Payment verification failed. Cryptographic signature mismatch.' });
    }

    return res.status(200).json({ success: true, message: 'Payment verified', isMock: false });
  } catch (error) {
    const errorMsg =
      error.description || error.error?.description || error.message || 'Unknown error';
    console.error('❌ [Razorpay] Verification error:', errorMsg);
    return res.status(500).json({ error: `Signature verification error: ${errorMsg}` });
  }
}
