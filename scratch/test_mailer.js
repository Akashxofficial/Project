import { connectDB, StudentModel } from '../api/_mongo.js';
import { sendDynamicDailyEmail } from '../api/_mailer.js';

async function run() {
  await connectDB();
  const student = await StudentModel.findOne({ email: "akashxofficial.in@gmail.com" });
  if (!student) {
    console.error("Student not found!");
    process.exit(1);
  }
  console.log(`Attempting to send dynamic daily email to ${student.email} for 'morning' phase...`);
  const result = await sendDynamicDailyEmail(student, 'morning');
  console.log("Result:", result);
  process.exit(0);
}

run().catch(console.error);
