import express from 'express';
import handler from './api/generate.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();

// Parse JSON request bodies with larger limit for images
app.use(express.json({ limit: '10mb' }));

// Enable CORS for local Vite development server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Razorpay with key from environment
const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
let razorpay = null;

if (razorpayKeyId && !razorpayKeyId.includes('placeholder') && razorpayKeySecret && !razorpayKeySecret.includes('placeholder')) {
  try {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
    console.log("💳 [Razorpay] Active production/test secret key initialized.");
  } catch (err) {
    console.error("❌ [Razorpay] Initialization failed:", err.message);
  }
}

// POST endpoint to create Razorpay orders
app.post('/api/razorpay-order', async (req, res) => {
  const { userId, userEmail, userName } = req.body;

  if (!userId || !userEmail) {
    return res.status(400).json({ error: "Missing required student metadata: userId, userEmail" });
  }

  // 1. If key is placeholder or Razorpay SDK is not initialized, fire highly polished local sandbox flow
  if (!razorpay) {
    console.log(`💻 [Razorpay Sandbox] Initializing mock checkout order for user: ${userEmail}`);
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return res.status(200).json({
      orderId: mockOrderId,
      amount: 19900,
      keyId: "rzp_test_placeholder_tanios",
      isMock: true
    });
  }

  // 2. Real Razorpay SDK Order Creator
  try {
    const options = {
      amount: 19900, // ₹199 in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        userId,
        userEmail,
        userName: userName || 'Student'
      }
    };

    const order = await razorpay.orders.create(options);
    console.log(`💳 [Razorpay] Created order: ${order.id} for user: ${userEmail}`);
    
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      keyId: razorpayKeyId,
      isMock: false
    });
  } catch (error) {
    const errorMsg = error.description || error.error?.description || error.message || "Unknown error";
    console.error("❌ [Razorpay] Order creation error:", errorMsg, error);
    res.status(500).json({ error: `Razorpay Order creation error: ${errorMsg}` });
  }
});

// POST endpoint to verify Razorpay signatures (idempotent, anti-tampering)
app.post('/api/razorpay-verify', async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    userId, 
    userEmail, 
    userName 
  } = req.body;

  if (!razorpay_order_id || !userId || !userEmail) {
    return res.status(400).json({ error: "Missing required verification data." });
  }

  // 1. If mock sandbox order, bypass cryptographic signature check
  if (razorpay_order_id.startsWith('order_mock_')) {
    console.log(`💻 [Razorpay Sandbox] Verifying mock order: ${razorpay_order_id}`);
    return res.status(200).json({
      success: true,
      message: "Mock payment successfully verified",
      isMock: true
    });
  }

  if (!razorpay) {
    return res.status(500).json({ error: "Razorpay SDK is not initialized, but a non-mock order ID was provided." });
  }

  // 2. Real cryptographic verification via HMAC SHA-256
  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.warn(`❌ [Razorpay] Cryptographic signature mismatch. Possible tampering detected for order: ${razorpay_order_id}`);
      return res.status(400).json({ error: "Payment verification failed. Cryptographic signature mismatch." });
    }

    console.log(`✅ [Razorpay] Payment verified successfully for order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`);
    res.status(200).json({
      success: true,
      message: "Payment successfully verified",
      isMock: false
    });
  } catch (error) {
    const errorMsg = error.description || error.error?.description || error.message || "Unknown error";
    console.error("❌ [Razorpay] Verification execution error:", errorMsg, error);
    res.status(500).json({ error: `Signature verification execution error: ${errorMsg}` });
  }
});

// Map POST /api/generate directly to Vercel handler
app.post('/api/generate', handler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 TaniOS Local Backend Server running on http://localhost:${PORT}`);
});

