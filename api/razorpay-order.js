// api/razorpay-order.js — Vercel Serverless Function
import Razorpay from 'razorpay';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { userId, userEmail, userName } = req.body;

  if (!userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required student metadata: userId, userEmail' });
  }

  const razorpayKeyId     = process.env.VITE_RAZORPAY_KEY_ID     || '';
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

  // If keys are missing or placeholders, return a mock order for sandbox testing
  if (
    !razorpayKeyId ||
    razorpayKeyId.includes('placeholder') ||
    !razorpayKeySecret ||
    razorpayKeySecret.includes('placeholder')
  ) {
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return res.status(200).json({
      orderId: mockOrderId,
      amount:  19900,
      keyId:   'rzp_test_placeholder_tanios',
      isMock:  true
    });
  }

  try {
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

    const order = await razorpay.orders.create({
      amount:   19900, // ₹199 in paise
      currency: 'INR',
      receipt:  `receipt_order_${Date.now()}`,
      notes:    { userId, userEmail, userName: userName || 'Student' }
    });

    return res.status(200).json({
      orderId: order.id,
      amount:  order.amount,
      keyId:   razorpayKeyId,
      isMock:  false
    });
  } catch (error) {
    const errorMsg =
      error.description || error.error?.description || error.message || 'Unknown error';
    console.error('❌ [Razorpay] Order creation error:', errorMsg);
    return res.status(500).json({ error: `Razorpay Order creation error: ${errorMsg}` });
  }
}
