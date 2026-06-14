import { sendStudyReminderEmail } from '../api/_mailer.js';

async function run() {
  console.log("Testing study reminder email with current time... (Should print dynamic greeting and send to akashxofficial.in@gmail.com)");
  const result = await sendStudyReminderEmail("akashxofficial.in@gmail.com", "Akash");
  console.log("Result:", result);
  process.exit(0);
}

run().catch(console.error);
