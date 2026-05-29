/**
 * TaniOS — End-to-End Payment Flow Test
 * Tests: MongoDB APIs + Firestore UTR submission + Admin approval simulation
 *
 * Run: node test-payment-flow.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';

// ── Config ─────────────────────────────────────────────────────────────────
const BACKEND = 'http://localhost:3001';

const firebaseConfig = {
  apiKey:            'YOUR_FIREBASE_API_KEY_PLACEHOLDER',
  authDomain:        'tanios-3cd37.firebaseapp.com',
  projectId:         'tanios-3cd37',
  storageBucket:     'tanios-3cd37.firebasestorage.app',
  messagingSenderId: '635893073596',
  appId:             '1:635893073596:web:1839eead55e75b7f3972b9'
};

// Test user (simulated student)
const TEST_USER = {
  uid:         'test_student_uid_001',
  email:       'teststudent@tanios.ai',
  displayName: 'Test Student',
};
const TEST_UTR    = '123456789012'; // fake 12-digit UTR
const REQUEST_ID  = `pay_upi_${TEST_UTR}`;

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app, 'default');

// ── Helpers ─────────────────────────────────────────────────────────────────
const pass = (msg) => console.log(`  ✅ PASS — ${msg}`);
const fail = (msg) => console.log(`  ❌ FAIL — ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const sep  = ()    => console.log('\n' + '─'.repeat(60));

async function apiPost(path, body) {
  const r = await fetch(`${BACKEND}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  return { status: r.status, data: await r.json() };
}

async function apiGet(path) {
  const r = await fetch(`${BACKEND}${path}`);
  return { status: r.status, data: await r.json() };
}

// ── TEST SUITE ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🚀 TaniOS Payment Flow — E2E Test Suite');
  console.log('=========================================\n');

  // ── 1. MongoDB: Track user sync ──────────────────────────────────────────
  sep();
  console.log('TEST 1: MongoDB — User Sync (/api/track/user)');
  try {
    const { status, data } = await apiPost('/api/track/user', TEST_USER);
    if (status === 200 && data.success) {
      pass(`User synced to MongoDB. LoginCount: ${data.user?.loginCount ?? '?'}`);
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── 2. MongoDB: Track activity ───────────────────────────────────────────
  sep();
  console.log('TEST 2: MongoDB — Activity Logging (/api/track/activity)');
  try {
    const { status, data } = await apiPost('/api/track/activity', {
      userId:   TEST_USER.uid,
      userName: TEST_USER.displayName,
      action:   'test_payment_flow',
      details:  `E2E test UTR submission: ${TEST_UTR}`
    });
    if (status === 200 && data.success) {
      pass(`Activity logged. ID: ${data.id}`);
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── 3. MongoDB: Fetch activities ─────────────────────────────────────────
  sep();
  console.log('TEST 3: MongoDB — Fetch Activities (/api/admin/activities)');
  try {
    const { status, data } = await apiGet('/api/admin/activities?limit=5');
    if (status === 200 && Array.isArray(data)) {
      pass(`Fetched ${data.length} activities from MongoDB`);
      if (data.length > 0) {
        info(`Latest: [${data[0].action}] by ${data[0].userName} — ${data[0].details}`);
      }
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── 4. MongoDB: Fetch students ───────────────────────────────────────────
  sep();
  console.log('TEST 4: MongoDB — Fetch Students (/api/admin/students)');
  try {
    const { status, data } = await apiGet('/api/admin/students?limit=5');
    if (status === 200 && Array.isArray(data)) {
      pass(`Fetched ${data.length} students from MongoDB`);
      if (data.length > 0) {
        info(`First student: ${data[0].displayName} <${data[0].email}>`);
      }
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── 5. MongoDB: Track payment (pending) ──────────────────────────────────
  sep();
  console.log('TEST 5: MongoDB — Payment Tracking (/api/track/payment)');
  try {
    const { status, data } = await apiPost('/api/track/payment', {
      userId:    TEST_USER.uid,
      userEmail: TEST_USER.email,
      amount:    199,
      utr:       TEST_UTR,
      status:    'pending',
      method:    'UPI QR Code'
    });
    if (status === 200 && data.success) {
      pass('Payment tracked in MongoDB as pending');
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── 6. Firestore: Write PENDING payment_request ───────────────────────────
  sep();
  console.log('TEST 6: Firestore — Submit UTR as PENDING (simulates student flow)');
  try {
    await setDoc(doc(db, 'payment_requests', REQUEST_ID), {
      requestId:          REQUEST_ID,
      userId:             TEST_USER.uid,
      userEmail:          TEST_USER.email,
      userName:           TEST_USER.displayName,
      utr:                TEST_UTR,
      amount:             199,
      status:             'pending',
      verificationMethod: 'UPI QR UTR',
      createdAt:          new Date(),
      updatedAt:          new Date()
    });
    pass(`Payment request written to Firestore with status=pending`);
    info(`Request ID: ${REQUEST_ID}`);
    info(`→ Go to Admin Panel → Subscription Queue → you should see this UTR now!`);
  } catch (e) {
    fail(`Firestore write error: ${e.message}`);
  }

  // ── 7. Firestore: Real-time listener test ─────────────────────────────────
  sep();
  console.log('TEST 7: Firestore — Real-time onSnapshot listener (simulates student waiting)');
  info('Starting listener on payment_requests doc...');
  info('Will auto-approve in 4 seconds to simulate admin action.\n');

  await new Promise((resolve) => {
    let approved = false;

    // Start listener (mimics what Subscribe.jsx does)
    const unsub = onSnapshot(doc(db, 'payment_requests', REQUEST_ID), (snap) => {
      if (!snap.exists()) return;
      const status = snap.data().status;
      info(`[onSnapshot fired] status = "${status}"`);

      if (status === 'approved' && !approved) {
        approved = true;
        pass('Real-time listener detected approval! Student would be auto-redirected NOW 🎉');
        unsub();
        resolve();
      }
    });

    // Simulate admin clicking "Approve" after 4 seconds
    setTimeout(async () => {
      info('Simulating admin clicking "Approve"...');
      try {
        await updateDoc(doc(db, 'payment_requests', REQUEST_ID), {
          status:    'approved',
          updatedAt: new Date()
        });
        // Also update user Firestore doc (as admin panel does)
        await setDoc(doc(db, 'users', TEST_USER.uid), {
          subscriptionActive:      true,
          subscriptionStatus:      'active',
          subscriptionPlan:        'Pro AI Member (Test)',
          subscriptionAmount:      199,
          subscriptionUtr:         TEST_UTR,
          subscriptionActivatedAt: new Date()
        }, { merge: true });
        info('Admin approval written to Firestore...');
      } catch (e) {
        fail(`Admin approval error: ${e.message}`);
        unsub();
        resolve();
      }
    }, 4000);

    // Timeout safety after 15s
    setTimeout(() => {
      if (!approved) {
        fail('onSnapshot did NOT fire within 15s — check Firestore rules or connectivity');
        unsub();
        resolve();
      }
    }, 15000);
  });

  // ── 8. MongoDB: Subscription sync ────────────────────────────────────────
  sep();
  console.log('TEST 8: MongoDB — Subscription Sync (/api/track/subscription)');
  try {
    const { status, data } = await apiPost('/api/track/subscription', {
      uid:                     TEST_USER.uid,
      subscriptionActive:      true,
      subscriptionPlan:        'Pro AI Member (Test)',
      subscriptionAmount:      199,
      subscriptionUtr:         TEST_UTR,
      subscriptionActivatedAt: new Date().toISOString()
    });
    if (status === 200 && data.success) {
      pass('Subscription synced to MongoDB Atlas');
    } else {
      fail(`Status ${status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    fail(`Network error: ${e.message}`);
  }

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  sep();
  console.log('CLEANUP: Removing test data from Firestore...');
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'payment_requests', REQUEST_ID));
    pass('Test payment_request removed from Firestore');
  } catch (e) {
    info(`Cleanup skipped: ${e.message}`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  sep();
  console.log('\n✅ All tests complete! Check results above.\n');
  console.log('If all PASS:');
  console.log('  → MongoDB APIs are working ✅');
  console.log('  → Firestore real-time listener is working ✅');
  console.log('  → Admin approval triggers instant student redirect ✅\n');
  process.exit(0);
}

runTests().catch((e) => {
  console.error('\n❌ Test runner crashed:', e.message);
  process.exit(1);
});
