import cronReminderHandler from '../api/admin/notify.js';

// We mock the response object to capture the JSON response
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

async function runTest(simulatedHourIST) {
  console.log(`\n--- Simulating IST hour: ${simulatedHourIST} ---`);
  
  // We mock Date.prototype.getUTCHours and getUTCMinutes to simulate specific times of day
  const originalGetUTCHours = Date.prototype.getUTCHours;
  const originalGetUTCMinutes = Date.prototype.getUTCMinutes;
  
  // simulatedHourIST = (utcHour * 60 + utcMinute + 330) % 1440 / 60
  // To simulate hour X in IST:
  // (utcHour + 5.5) = X => utcHour = X - 5.5
  let simulatedUTCHour = simulatedHourIST - 5.5;
  if (simulatedUTCHour < 0) simulatedUTCHour += 24;
  
  Date.prototype.getUTCHours = function() {
    return Math.floor(simulatedUTCHour);
  };
  Date.prototype.getUTCMinutes = function() {
    return (simulatedUTCHour % 1) * 60;
  };

  const req = {
    method: 'GET',
    query: { action: 'cron-reminder' },
    headers: {
      'x-bypass-key': 'tanios-cron-bypass-key-2026'
    }
  };

  try {
    const result = await new Promise((resolve) => {
      const res = makeMockRes(resolve);
      cronReminderHandler(req, res).catch(resolve);
    });
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Handler error:", err);
  } finally {
    // Restore original Date methods
    Date.prototype.getUTCHours = originalGetUTCHours;
    Date.prototype.getUTCMinutes = originalGetUTCMinutes;
  }
}

async function main() {
  // 1. Test morning: 8:00 AM IST
  await runTest(8);
  
  // 2. Test afternoon: 1:30 PM IST
  await runTest(13.5);
  
  // 3. Test evening: 7:30 PM IST
  await runTest(19.5);
  
  process.exit(0);
}

main().catch(console.error);
