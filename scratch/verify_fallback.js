import cronReminderHandler from '../api/admin/notify.js';

const makeMockRes = (resolve) => ({
  setHeader: (name, val) => {},
  status: (code) => {
    return {
      json: (data) => {
        resolve({ code, data });
      },
      end: () => {
        resolve({ code });
      }
    };
  }
});

async function runTest() {
  console.log("Simulating Vercel cron call with NO action query param, only the 'x-vercel-cron' header...");

  // Mock standard Vercel cron request
  const req = {
    method: 'GET',
    url: '/api/admin/notify',
    query: {}, // Empty query parameters
    headers: {
      'x-vercel-cron': 'true' // Vercel cron header
    }
  };

  try {
    const result = await new Promise((resolve) => {
      const res = makeMockRes(resolve);
      cronReminderHandler(req, res).catch(resolve);
    });
    console.log("Response Code:", result.code);
    console.log("Response Data:", JSON.stringify(result.data, null, 2));
    
    if (result.code === 200 && result.data && result.data.success) {
      console.log("✅ SUCCESS: The fallback handler correctly identified the Vercel cron header!");
    } else {
      console.error("❌ FAILURE: Fallback header detection failed.");
    }
  } catch (err) {
    console.error("❌ Unexpected test script error:", err);
  }
}

runTest().then(() => process.exit(0)).catch(console.error);
