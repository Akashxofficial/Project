import { connectDB, StudentModel } from '../api/_mongo.js';

async function run() {
  await connectDB();
  const students = await StudentModel.find({});
  console.log(`Found ${students.length} students:`);
  for (const s of students) {
    console.log(JSON.stringify({
      uid: s.uid,
      email: s.email,
      displayName: s.displayName,
      streak: s.streak,
      lastLoginAt: s.lastLoginAt,
      welcomeEmailSent: s.welcomeEmailSent,
      lastEmailSentAt: s.lastEmailSentAt,
      emailOptOut: s.emailOptOut,
      notificationPrefs: s.notificationPrefs,
      subscriptionActive: s.subscriptionActive
    }, null, 2));
  }
  process.exit(0);
}

run().catch(console.error);
