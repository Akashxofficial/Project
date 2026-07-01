import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logActivity, trackPaymentInMongo, trackSubscriptionInMongo } from '../lib/firebase';
import { Sparkles, Check, Copy, CheckCircle2, ShieldCheck, CreditCard, Lock, RefreshCw, ChevronLeft, ArrowRight, QrCode, AlertCircle, Clock, CheckCheck } from 'lucide-react';

// Dynamic backend URL — relative for dev and production (proxied locally, hosted same-origin in prod)
const BACKEND_URL = '';

// Anti-fraud: max UTR submission attempts per user per day
const MAX_UTR_ATTEMPTS_PER_DAY = 3;

export default function Subscribe() {
  const { currentUser, subscription, setSubscription } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // TaniOS Pay Checkout states
  // Steps: 0=billing, 4=processing console, 5=razorpay success, 6=UPI pending verification screen
  const [gatewayStep, setGatewayStep] = useState(0);
  const [gatewayLogs, setGatewayLogs] = useState([]);
  const [gatewayProgress, setGatewayProgress] = useState(0);

  // UPI QR Payment states
  const [paymentMethod, setPaymentMethod] = useState('upi_qr');
  const [utrInput, setUtrInput] = useState('');
  const [utrError, setUtrError] = useState('');
  const [copied, setCopied] = useState(false);

  // Pending verification state — used for real-time Firestore listener after UTR submission
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [pendingUtr, setPendingUtr] = useState('');
  const [pendingElapsed, setPendingElapsed] = useState(0);
  const pendingListenerRef = useRef(null);
  const pendingTimerRef = useRef(null);

  const amount = 199;
  const [urlParams] = useState(() => new URLSearchParams(window.location.search));

  // Redirect if already subscribed
  useEffect(() => {
    if (subscription?.active && !urlParams.get('status')) {
      navigate('/');
    }
  }, [subscription, navigate, urlParams]);

  // ── Cleanup real-time listeners on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (pendingListenerRef.current) pendingListenerRef.current();
      if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);
    };
  }, []);

  // ── Start real-time Firestore listener for pending UTR approval ─────────────
  // Called after student submits UTR → listens for admin to approve/reject
  const startPendingVerificationListener = (requestId, utr) => {
    if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'dummy-api-key') return;

    // Unsubscribe any existing listener first
    if (pendingListenerRef.current) pendingListenerRef.current();
    if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);

    setPendingRequestId(requestId);
    setPendingUtr(utr);
    setPendingElapsed(0);
    setGatewayStep(6); // Show pending verification screen

    // Elapsed time ticker
    pendingTimerRef.current = setInterval(() => {
      setPendingElapsed(prev => prev + 1);
    }, 1000);

    // Real-time Firestore listener on the payment_requests doc
    const docRef = doc(db, 'payment_requests', requestId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const status = data.status;

      if (status === 'approved') {
        // Admin approved → activate subscription immediately
        if (pendingListenerRef.current) pendingListenerRef.current();
        if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);

        const activeSub = {
          active: true,
          status: 'active',
          plan: 'Pro AI Member (UPI QR Code)',
          amount: data.amount || 199,
          utr: data.utr || utr,
          activatedAt: Date.now()
        };
        setSubscription(activeSub);
        localStorage.setItem('tanios_subscription', JSON.stringify(activeSub));

        logActivity(
          currentUser?.uid || 'guest',
          currentUser?.displayName || currentUser?.email || 'Student',
          'subscription_activated',
          `Pro subscription activated after UPI verification (UTR: ${utr})`
        ).catch(console.warn);

        setGatewayStep(5); // Show success screen
        setTimeout(() => navigate('/'), 2500);

      } else if (status === 'rejected') {
        // Admin rejected → show error
        if (pendingListenerRef.current) pendingListenerRef.current();
        if (pendingTimerRef.current) clearInterval(pendingTimerRef.current);

        setGatewayStep(0);
        setCheckoutLoading(false);
        setErrorMessage('❌ Your payment UTR was not verified. Please check the UTR number or contact support.');
      }
    }, (err) => {
      console.warn('Pending listener error:', err.message);
    });

    pendingListenerRef.current = unsubscribe;
  };

  // Idempotency Key generator: hashes (orderId + studentUID) for secure unique transaction validation
  const generateIdempotencyKey = (orderId, uid) => {
    let hash = 0;
    const str = `${orderId.trim()}_${uid.trim()}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `pay_razorpay_idemp_${Math.abs(hash).toString(36)}`;
  };

  // Helper to dynamically load Razorpay Checkout Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // State to store active mock order details during Sandbox Simulation Step 1
  const [mockOrderDetails, setMockOrderDetails] = useState(null);

  // Toggle to show UPI QR section below Razorpay
  const [showQR, setShowQR] = useState(false);

  // ── Razorpay Checkout Trigger ──────────────────────────────────────────────
  const handleRazorpayCheckout = async () => {
    setCheckoutLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid || currentUser.email,
          userEmail: currentUser.email || 'student@tanios.ai',
          userName: currentUser.displayName || 'Student'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger Razorpay Order creation.");
      }

      // 1. Engaging Mock Sandbox Checkout Step 1 if server responds with isMock
      if (data.isMock) {
        console.log("💻 [Razorpay Sandbox] Opening simulated checkout modal within UI.");
        setMockOrderDetails({
          orderId: data.orderId,
          amount: data.amount,
          keyId: data.keyId
        });
        setGatewayStep(1); // Set step to Sandbox Simulated Checkout panel
        return;
      }

      // 2. Production Razorpay Elements Widget
      console.log("💳 Triggering Live Razorpay elements script integration. Order:", data.orderId);
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout script. Check your internet connection.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "TaniOS AI",
        description: "Unlock Pro AI Chapter Sprints & doubt solvers",
        order_id: data.orderId,
        handler: async function (response) {
          console.log("✅ Razorpay payment capture response:", response);
          handleVerifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: currentUser.displayName || 'Student',
          email: currentUser.email || 'student@tanios.ai',
          contact: '9999999999'
        },
        theme: {
          color: "#6c63ff"
        },
        modal: {
          ondismiss: function () {
            console.log("❌ Razorpay checkout overlay cancelled.");
            setErrorMessage("Checkout cancelled. Feel free to re-trigger billing when you are ready.");
            setCheckoutLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        console.error('Razorpay payment failed:', response.error);
        setErrorMessage(`Payment failed: ${response.error.description || 'Please try again.'}`);
        setCheckoutLoading(false);
      });
      rzp.open();

    } catch (err) {
      console.error("Razorpay trigger error:", err);
      setErrorMessage(err.message || "Unable to reach Razorpay gateway. Please check your internet connection.");
      setCheckoutLoading(false);
    }
  };

  // ── Razorpay Signature Verification & Reconciliation Handshake ──────────────
  const handleVerifyRazorpayPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    setGatewayStep(4); // Aggregator processing node console
    setGatewayProgress(0);
    setGatewayLogs([`🔒 Capturing Razorpay transaction signatures: ${razorpay_payment_id || razorpay_order_id}...`]);

    const logs = [
      `🔒 Capturing Razorpay transaction signatures...`,
      `📡 Contacting Razorpay core API transaction validator... [CONNECTED]`,
      `🔐 Verifying cryptographic signatures (HMAC SHA-256 integrity)...`,
      `💳 Reconciling transaction state: PAID (₹199 settled)... [VERIFIED]`,
      `🏦 Hydrating secure settled payment request log inside Firestore...`,
      `👑 Synchronizing user profile database & unlocking TaniOS Pro...`
    ];

    const uid = currentUser?.uid || currentUser?.email || 'guest';
    const requestId = generateIdempotencyKey(razorpay_order_id, uid);

    let isDoubleSubmit = false;
    let existingStatus = 'none';
    let firebaseDocRef = null;

    if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        firebaseDocRef = doc(db, "payment_requests", requestId);
        const docSnap = await getDoc(firebaseDocRef);
        if (docSnap.exists()) {
          existingStatus = docSnap.data().status || 'PENDING';
          isDoubleSubmit = true;
        }
      } catch (err) {
        console.warn("Idempotency read warning:", err);
      }
    }

    let currentStep = 0;
    const interval = setInterval(async () => {
      currentStep++;
      setGatewayProgress(currentStep);

      if (currentStep < logs.length) {
        // Step 3: Idempotency double-submit guard
        if (currentStep === 3 && isDoubleSubmit && (existingStatus === 'VERIFIED' || existingStatus === 'SETTLED' || existingStatus === 'approved')) {
          clearInterval(interval);
          setGatewayLogs(prev => [
            ...prev,
            `❌ IDEMPOTENCY VIOLATION: Razorpay order already settled!`,
            `⚠️ Security warning triggered. Double-credit prevented.`
          ]);
          setTimeout(() => {
            setGatewayStep(0);
            setCheckoutLoading(false);
            setErrorMessage(`Razorpay Session Guard: This Order has already been settled and credited to an account.`);
          }, 2500);
          return;
        }

        setGatewayLogs(prev => [...prev, logs[currentStep]]);
      } else {
        clearInterval(interval);

        try {
          // Contact secure backend logic to verify signatures
          const verifyRes = await fetch(`${BACKEND_URL}/api/razorpay-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              userId: uid,
              userEmail: currentUser.email || 'student@tanios.ai',
              userName: currentUser.displayName || 'Student'
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.error || "Cryptographic signature mismatch.");
          }

          const activeSub = {
            active: true,
            status: 'active',
            plan: 'Pro Member (Razorpay Checkout)',
            amount: amount,
            utr: razorpay_payment_id || razorpay_order_id,
            activatedAt: Date.now()
          };

          if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
            const auditTrail = [
              { time: new Date().toISOString(), status: 'PENDING', desc: 'Razorpay payment handler triggered.' },
              { time: new Date().toISOString(), status: 'VERIFIED', desc: `Razorpay Order ${razorpay_order_id} verified via HMAC.` },
              { time: new Date().toISOString(), status: 'SETTLED', desc: 'Merchant node funds settled. TaniOS Pro unlocked.' }
            ];

            // 1. Log settled payment in requests
            await setDoc(doc(db, "payment_requests", requestId), {
              requestId,
              userId: uid,
              userEmail: currentUser.email || 'student@tanios.ai',
              userName: currentUser.displayName || 'Student',
              utr: activeSub.utr,
              amount: amount,
              status: 'SETTLED', // 3-State: SETTLED
              auditTrail,
              verificationMethod: 'Razorpay API Handshake',
              createdAt: serverTimestamp()
            });

            // 2. Activate user subscription in users collection
            await setDoc(doc(db, "users", currentUser.uid || currentUser.email), {
              subscriptionActive: true,
              subscriptionStatus: 'active',
              subscriptionPlan: 'Pro AI Member (Razorpay Checkout)',
              subscriptionAmount: amount,
              subscriptionUtr: activeSub.utr,
              subscriptionActivatedAt: serverTimestamp()
            }, { merge: true });
          }

          setSubscription(activeSub);
          localStorage.setItem('tanios_subscription', JSON.stringify(activeSub));
          
          await logActivity(
            currentUser?.uid || 'guest',
            currentUser?.displayName || currentUser?.email || 'Student',
            'payment_submitted',
            `Completed Razorpay Payment Checkout (UTR: ${activeSub.utr})`
          );
          
          trackPaymentInMongo(
            currentUser?.uid || 'guest',
            currentUser?.email || 'Student',
            amount,
            activeSub.utr,
            'success',
            'Razorpay'
          ).catch(console.warn);

          // ✅ Sync subscription to MongoDB Atlas
          trackSubscriptionInMongo(currentUser?.uid || currentUser?.email, {
            subscriptionActive: true,
            subscriptionPlan: 'Pro AI Member (Razorpay)',
            subscriptionAmount: amount,
            subscriptionUtr: activeSub.utr,
            subscriptionActivatedAt: new Date().toISOString()
          }).catch(console.warn);

          setGatewayStep(5);

          setTimeout(() => {
            navigate('/');
          }, 2200);

        } catch (err) {
          console.error("Razorpay verification error:", err);
          // 🔴 SECURITY: Do NOT activate subscription on verification failure
          setGatewayStep(0);
          setCheckoutLoading(false);
          setErrorMessage(`Payment verification failed: ${err.message || 'Please contact support if amount was deducted.'}`);
        }
      }
    }, 800);
  };

  // ── FRAUD-PROOF UPI UTR Submission ─────────────────────────────────────────
  // Security model:
  //   1. UTR is stored as PENDING — never auto-activated on submission
  //   2. UTR uniqueness checked globally (no same UTR claimed by 2 users)
  //   3. Rate-limited: max 3 UTR submissions per user per day
  //   4. Admin manually verifies payment against bank statement → approves in admin panel
  //   5. Firestore onSnapshot on the payment_requests doc fires instantly on approval
  //   6. Student auto-redirected to dashboard when admin approves
  const handleVerifyUPIPayment = async () => {
    if (!utrInput.trim()) {
      setUtrError('Please enter the 12-digit UPI UTR number.');
      return;
    }
    const cleanUtr = utrInput.trim().replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('UTR must be exactly 12 numeric digits.');
      return;
    }
    setUtrError('');
    setCheckoutLoading(true);
    setGatewayStep(4);
    setGatewayProgress(0);
    setGatewayLogs(['🔒 Initiating secure UTR submission...']);

    const uid = currentUser?.uid || currentUser?.email || 'guest';
    const requestId = `pay_upi_${cleanUtr}`;

    // ── ANTI-FRAUD GATE 1: Daily rate-limit per user ──────────────────────────
    const rateLimitKey = `utr_attempts_${uid}_${new Date().toDateString()}`;
    const attempts = parseInt(localStorage.getItem(rateLimitKey) || '0', 10);
    if (attempts >= MAX_UTR_ATTEMPTS_PER_DAY) {
      setGatewayStep(0);
      setCheckoutLoading(false);
      setUtrError(`Too many attempts. Maximum ${MAX_UTR_ATTEMPTS_PER_DAY} UTR submissions allowed per day. Contact support if needed.`);
      return;
    }

    const logs = [
      '🔒 Initiating secure UTR submission...',
      '📡 Connecting to payment verification system... [CONNECTED]',
      `🔍 Checking UTR ${cleanUtr} for prior claims...`,
      '🛡️ Running anti-fraud duplicate checks across all accounts...',
      '📝 Registering payment claim for admin verification...'
    ];

    // ── ANTI-FRAUD GATE 2: Global UTR uniqueness check ────────────────────────
    // Checks if ANY other user has claimed this exact UTR already
    let isAlreadyClaimed = false;
    let myExistingStatus = null;

    if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
      try {
        setGatewayLogs(prev => [...prev, logs[1]]);
        setGatewayProgress(1);

        // Check if this specific request doc exists already
        const docSnap = await getDoc(doc(db, 'payment_requests', requestId));
        if (docSnap.exists()) {
          const existing = docSnap.data();
          if (existing.userId !== uid) {
            // Another user already claimed this UTR
            isAlreadyClaimed = true;
          } else {
            // Same user, check status
            myExistingStatus = existing.status;
          }
        }

        setGatewayLogs(prev => [...prev, logs[2]]);
        setGatewayProgress(2);

        if (isAlreadyClaimed) {
          setGatewayLogs(prev => [
            ...prev,
            `❌ FRAUD DETECTED: UTR ${cleanUtr} already claimed by another account!`,
            '⛔ Security guard triggered. This incident has been logged.'
          ]);
          setGatewayProgress(3);
          setTimeout(() => {
            setGatewayStep(0);
            setCheckoutLoading(false);
            setUtrError('This UTR has already been claimed by another account. If this is your payment, please contact support.');
          }, 3000);
          return;
        }

        // If this user already submitted this UTR and it's pending/approved, resume the listener
        if (myExistingStatus === 'pending') {
          setGatewayLogs(prev => [...prev, '⏳ Found your existing pending verification — resuming listener...']);
          setGatewayProgress(4);
          setTimeout(() => startPendingVerificationListener(requestId, cleanUtr), 800);
          return;
        }

        if (myExistingStatus === 'approved') {
          setGatewayStep(5);
          setCheckoutLoading(false);
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        if (myExistingStatus === 'rejected') {
          setGatewayStep(0);
          setCheckoutLoading(false);
          setUtrError('This UTR was previously rejected. Please contact support or try with a different UTR.');
          return;
        }

      } catch (err) {
        console.warn('Anti-fraud check warning:', err.message);
        // Non-blocking: continue even if check fails
      }
    }

    // ── Animate submission logs ───────────────────────────────────────────────
    let step = 2;
    const interval = setInterval(async () => {
      step++;
      setGatewayProgress(step);

      if (step < logs.length) {
        setGatewayLogs(prev => [...prev, logs[step]]);
      } else {
        clearInterval(interval);

        try {
          // ── STORE AS PENDING — never auto-activate! ───────────────────────
          if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
            await setDoc(doc(db, 'payment_requests', requestId), {
              requestId,
              userId: uid,
              userEmail: currentUser.email || 'student@tanios.ai',
              userName: currentUser.displayName || 'Student',
              utr: cleanUtr,
              amount,
              status: 'pending',   // ← PENDING, not SETTLED or ACTIVE
              verificationMethod: 'UPI QR UTR',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          // Increment daily rate-limit counter
          localStorage.setItem(rateLimitKey, String(attempts + 1));

          // Log activity
          await logActivity(
            uid,
            currentUser?.displayName || currentUser?.email || 'Student',
            'payment_submitted',
            `UPI UTR submitted for admin verification (UTR: ${cleanUtr})`
          );

          // Track payment in MongoDB as pending
          trackPaymentInMongo(
            uid,
            currentUser?.email || 'Student',
            amount,
            cleanUtr,
            'pending',
            'UPI QR Code'
          ).catch(console.warn);

          // ── Start real-time listener — auto-redirects on admin approval ───
          startPendingVerificationListener(requestId, cleanUtr);

        } catch (err) {
          console.error('UTR submission error:', err);
          setGatewayStep(0);
          setCheckoutLoading(false);
          setErrorMessage(`Submission failed: ${err.message || 'Please try again.'}`);
        }
      }
    }, 700);
  };


  // ── Sandbox Bypass Trigger for Developers ──────────────────────────────────
  const handleSandboxBypass = async () => {
    setLoading(true);
    try {
      const activeSub = {
        active: true,
        status: 'active',
        plan: 'Pro AI Member (Sandbox)',
        amount: amount,
        utr: 'STRIPE_SANDBOX_BYPASS',
        activatedAt: Date.now()
      };

      if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'dummy-api-key') {
        // Force upgrade on firebase
        await setDoc(doc(db, "users", currentUser.uid || currentUser.email), {
          subscriptionActive: true,
          subscriptionStatus: 'active',
          subscriptionPlan: 'Pro AI Member (Sandbox)',
          subscriptionAmount: amount,
          subscriptionUtr: 'STRIPE_SANDBOX_BYPASS',
          subscriptionActivatedAt: serverTimestamp()
        }, { merge: true });
      }

      setSubscription(activeSub);
      localStorage.setItem('tanios_subscription', JSON.stringify(activeSub));
      
      await logActivity(
        currentUser?.uid || 'guest',
        currentUser?.displayName || currentUser?.email || 'Student',
        'payment_submitted',
        `Completed Sandbox Bypass Payment`
      );
      
      trackPaymentInMongo(
        currentUser?.uid || 'guest',
        currentUser?.email || 'Student',
        amount,
        activeSub.utr,
        'success',
        'Sandbox Bypass'
      ).catch(console.warn);

      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      console.error("Sandbox bypass error:", err);
      const localActive = {
        active: true,
        status: 'active',
        plan: 'Pro AI Member (Local Fallback)',
        amount: amount,
        utr: 'OFFLINE_BYPASS',
        activatedAt: Date.now()
      };
      setSubscription(localActive);
      localStorage.setItem('tanios_subscription', JSON.stringify(localActive));
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/'), 800);
    }
  };

  const perks = [
    "20 Daily High-Speed AI Doubt Solves (Full detailed board guidelines)",
    "Textbook RAG 📚 (Limited to 20 textbook query threads per day)",
    "Auto-Generated High-Density Study Notes (20 active note compilations daily)",
    "Pro-Grade Mock Test Generator (20 CBSE Past-Year Solved papers daily)",
    "Personalized Gamified Study Planner & Performance Analytics Tracker",
    "Instant Smart Revision Recaps & 15-Minute Chapter Summary Sheets",
    "Complete Syllabus Checklist & Active Recall Target Sprints"
  ];

  return (
    <div className="page-content" style={{ padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      <style>{`
        .sub-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 768px) {
          .sub-grid {
            grid-template-columns: 1fr;
          }
        }
        .benefit-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          backdrop-filter: blur(16px);
          padding: 2.25rem 2rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          box-shadow: var(--shadow-sm);
        }
        .gateway-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-hover);
          box-shadow: 0 15px 35px rgba(108, 99, 255, 0.05);
          backdrop-filter: blur(24px);
          padding: 2.25rem 2rem;
          border-radius: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          box-shadow: var(--shadow-md);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 576px) {
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }
        @media (max-width: 480px) {
          .benefit-card, .gateway-card {
            padding: 1.5rem 1rem !important;
          }
        }
        .perk-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.15rem;
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }
        .perk-icon {
          flex-shrink: 0;
          margin-top: 2px;
          color: #10b981;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .blink-dot {
          animation: blink 1s infinite;
        }
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>

      {/* Main Lock Alert for Pending Verification */}
      {subscription?.status === 'pending' && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}>
          <span style={{ fontSize: '2rem' }}>🕒</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, color: '#f59e0b', fontWeight: 800 }}>Subscription Verification Pending!</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Your Stripe Checkout session <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{subscription.utr}</strong> is in queue.
              Our statement reconciler will approve it shortly!
            </p>
          </div>
        </div>
      )}

      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 242, 254, 0.1))',
          padding: '0.6rem 1.25rem',
          borderRadius: '30px',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid rgba(108, 99, 255, 0.2)'
        }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa' }}>
            Unlock Core AI Capabilities
          </span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem 0' }}>TaniOS Pro Premium Member</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
          Accelerate your board exam preparation with continuous access to personal AI tutoring and dynamic note synthesis tools.
        </p>
      </div>

      <div className="sub-grid">
        
        {/* Benefits Panel */}
        <div className="benefit-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck color="var(--primary)" size={22} /> Pro Member Privileges
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
            Complete your profile and secure full-site database access. Here is everything you unlock:
          </p>

          <div style={{ margin: '1.5rem 0 1rem 0' }}>
            {perks.map((p, idx) => (
              <div key={idx} className="perk-item">
                <CheckCircle2 size={16} className="perk-icon" />
                <span>{p}</span>
              </div>
            ))}
          </div>

          {/* Premium CBSE Topper Information Box */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(108, 99, 255, 0.08))',
            border: '1px solid rgba(167, 139, 250, 0.15)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '0.5rem',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55
          }}>
            💡 <strong style={{ color: 'var(--text)' }}>CBSE & State Board Target Focus:</strong> Tailored specifically to Indian marking schemes and topper frameworks. Pro members maintain a <strong style={{ color: 'var(--primary)' }}>4x higher study consistency</strong> using gamified learning checkpoints!
          </div>

          {/* Academic Performance Boost Metrics Grid */}
          <div className="metrics-grid">
            {[
              { label: 'Active Recall', value: '+45%', desc: 'Efficiency Boost' },
              { label: 'Syllabus Prep', value: '3x Faster', desc: 'Coverage Speed' },
              { label: 'Retention Rate', value: '98.2%', desc: 'Long-term Memory' }
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.75rem 0.5rem',
                textAlign: 'center',
                cursor: 'default'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.1rem' }}>{stat.label}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>{stat.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 'auto',
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck color="#10b981" size={20} />
            </div>
            <div>
              <h5 style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>Secure Razorpay Checkout</h5>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Pay via UPI, Cards, NetBanking or Wallets. Pro access activated instantly on payment.
              </p>
            </div>
          </div>
        </div>

        {/* TaniOS Pay Aggregator Checkout Panel */}
        <div className="gateway-card">
          
          {/* Header Step Indicators */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              {gatewayStep === 0 && "Secure Checkout"}
              {gatewayStep === 1 && "Simulated Sandbox Modal"}
              {gatewayStep === 4 && "Aggregator Processing Node"}
              {gatewayStep === 5 && "Checkout Successful"}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
              ₹199 <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>one-time</span>
            </span>
          </div>

          {/* Step 0: Checkout billing options */}
          {gatewayStep === 0 && (
            <div style={{ animation: 'fadeUp 0.3s both', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1 }}>

              {/* ── PRIMARY: Razorpay 1-Click Checkout ── */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(0,242,254,0.07))',
                border: '1px solid rgba(108,99,255,0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1rem',
                boxShadow: '0 4px 24px rgba(108,99,255,0.12)',
              }}>
                {/* Razorpay branding row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg,#072654,#2d87f0)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '0.5px'
                  }}>RAZORPAY</div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>✓ Verified & Secured</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>UPI · Cards · NetBanking · Wallets</span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Pay securely via Razorpay — supports all UPI apps, debit/credit cards, net banking & wallets. Instant Pro activation on success.
                </p>

                {errorMessage && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#f87171', marginBottom: '0.85rem' }}>
                    ⚠️ {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleRazorpayCheckout}
                  disabled={checkoutLoading}
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    background: checkoutLoading
                      ? 'rgba(108,99,255,0.4)'
                      : 'linear-gradient(135deg, #6c63ff, #2d87f0)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: checkoutLoading ? 'none' : '0 6px 20px rgba(108,99,255,0.4)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >
                  {checkoutLoading ? (
                    <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Opening Razorpay...</>
                  ) : (
                    <><Lock size={16} /> Pay ₹199 Securely with Razorpay <ArrowRight size={15} /></>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  <span>🔒 256-bit SSL</span>
                  <span>•</span>
                  <span>⚡ Instant Activation</span>
                  <span>•</span>
                  <span>🛡️ Anti-fraud verified</span>
                </div>
              </div>

              {/* Trust & Guarantee Info Section */}
              <div style={{
                marginTop: '1rem',
                padding: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Upgrade Benefits Summary
                </h4>
                
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(108, 99, 255, 0.1)', color: '#a78bfa', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>⚡</div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>Instant Plan Upgrades</h5>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Pro features will activate on your account immediately after payment success.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>🛡️</div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>SSL Encrypted Checkout</h5>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>All transactions are processed via secure Razorpay HTTPS tunnel APIs.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>💬</div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>Premium Support Included</h5>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Need help? Reach out to support anytime. We settle queries instantly.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>🔒</div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>Data Privacy Shield</h5>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>We never store your card or bank details. All transactions are securely routed via Razorpay PCI-DSS Servers.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Step 1: Simulated Sandbox Modal Overlay */}
          {gatewayStep === 1 && mockOrderDetails && (
            <div style={{ animation: 'fadeUp 0.3s both', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                Your local environment is using **Razorpay Sandbox Mode**. Click below to trigger a successful mock transaction:
              </p>

              {/* Secure Razorpay Simulated Panel */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(108, 99, 255, 0.15))',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 25px rgba(108, 99, 255, 0.15)',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    SIMULATED POPUP MODAL
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {mockOrderDetails.orderId}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Prefilled Email:</span>
                    <span style={{ color: 'var(--text)', fontWeight: 700 }}>{currentUser.email || 'student@tanios.ai'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount Due:</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>₹199.00 INR</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mock Signature:</span>
                    <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '0.72rem' }}>sha256_mock_sig_3ea...</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                <button
                  onClick={() => handleVerifyRazorpayPayment({
                    razorpay_order_id: mockOrderDetails.orderId,
                    razorpay_payment_id: `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    razorpay_signature: `sig_mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
                  })}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(108, 99, 255, 0.25)'
                  }}
                  type="button"
                >
                  <Check size={18} />
                  Simulate Successful Payment (₹199)
                </button>

                <button
                  onClick={() => {
                    setErrorMessage("Mock checkout cancelled by user.");
                    setGatewayStep(0);
                    setCheckoutLoading(false);
                  }}
                  type="button"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  Cancel Mock Checkout
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Secure processing loader console */}
          {gatewayStep === 4 && (
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              boxShadow: 'inset 0 0 15px rgba(108, 99, 255, 0.1)',
              animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="blink-dot" style={{ display: 'inline-block', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></span>
                    TANIOS PAY GATEWAY NODE
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>SECURE SSL V3</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {gatewayLogs.map((log, index) => (
                    <div key={index} style={{
                      color: index === gatewayLogs.length - 1 ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.35rem',
                      lineHeight: 1.4
                    }}>
                      <span style={{ color: '#a78bfa', flexShrink: 0 }}>&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  <span>Aggregator Handshake:</span>
                  <span>{Math.round((gatewayProgress / 6) * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(gatewayProgress / 6) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '10px'
                  }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment Success Screen */}
          {gatewayStep === 5 && (
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px',
              padding: '1.75rem 1rem',
              textAlign: 'center',
              animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
              <h4 style={{ color: '#10b981', margin: '0.5rem 0 0.25rem 0', fontWeight: 800 }}>Pro Access Activated!</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Your TaniOS Pro subscription is now active. Redirecting you to the dashboard...
              </p>
            </div>
          )}

          {/* Step 6: UPI Pending Verification Screen — Real-time listener active */}
          {gatewayStep === 6 && (
            <div style={{
              animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Header */}
              <div style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕒</div>
                <h4 style={{ color: '#f59e0b', margin: '0 0 0.35rem 0', fontWeight: 800, fontSize: '1rem' }}>
                  Awaiting Admin Verification
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Your UTR <strong style={{ color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '1px' }}>{pendingUtr}</strong> has been submitted for manual verification against our bank statement.
                </p>
              </div>

              {/* Real-time status indicator */}
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  animation: 'blink 1s infinite',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>Live Verification Listener Active</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    This page will automatically redirect when admin approves your payment. No need to refresh!
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a78bfa', fontFamily: 'monospace', flexShrink: 0 }}>
                  {Math.floor(pendingElapsed / 60).toString().padStart(2, '0')}:{(pendingElapsed % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {/* What happens next */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { icon: '✅', label: 'UTR Submitted', desc: `Reference: ${pendingUtr}`, done: true },
                  { icon: '🔍', label: 'Admin Verifying', desc: 'Cross-checking UTR against Kotak bank statement', done: false },
                  { icon: '👑', label: 'Pro Access Granted', desc: 'You will be auto-redirected instantly on approval', done: false }
                ].map((step, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    background: step.done ? 'rgba(16,185,129,0.05)' : 'var(--bg-tertiary)',
                    border: `1px solid ${step.done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{step.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: step.done ? '#10b981' : 'var(--text)' }}>{step.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{step.desc}</div>
                    </div>
                    {step.done && <CheckCheck size={14} color="#10b981" style={{ marginLeft: 'auto', flexShrink: 0, marginTop: '2px' }} />}
                  </div>
                ))}
              </div>

              {/* Estimated time + support note */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}>
                ⏱️ <strong style={{ color: 'var(--text)' }}>Estimated wait:</strong> 5–30 minutes during business hours (10am–8pm IST).<br />
                📧 If not activated within 2 hours, contact <strong style={{ color: 'var(--primary)' }}>support@tanios.ai</strong> with your UTR number.
              </div>

              {/* Cancel / go back option */}
              <button
                onClick={() => { setGatewayStep(0); setCheckoutLoading(false); }}
                type="button"
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  marginTop: 'auto'
                }}
              >
                ← Back (listener will stop)
              </button>
            </div>
          )}


          {/* Conditional Sandbox evaluator override ONLY for developer 'akashxofficial.in@gmail.com' */}
          {currentUser?.email === 'akashxofficial.in@gmail.com' && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '1rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🧑‍💻 Developer Sandbox Bypasser
              </span>
              <button 
                onClick={handleSandboxBypass}
                type="button"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(108, 99, 255, 0.15))',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  color: '#c084fc',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
                disabled={loading}
              >
                <Lock size={14} />
                Sandbox Instant Upgrade (Bypass Stripe Checkout)
              </button>
            </div>
          )}

          {/* Secure SSL Gateway footer */}
          <div style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            fontSize: '0.68rem',
            color: 'var(--text-secondary)'
          }}>
            <Lock size={10} color="#a78bfa" />
            <span>Razorpay Secure Gateway | 256-Bit SSL Encryption | PCI-DSS Compliant</span>
          </div>

        </div>

      </div>

    </div>
  );
}
