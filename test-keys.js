import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";

// Load .env
try {
  const envFile = readFileSync(".env", "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valParts] = line.split("=");
    if (key && valParts.length > 0 && !key.trim().startsWith("#")) {
      process.env[key.trim()] = valParts.join("=").trim();
    }
  });
  console.log("✅ Loaded .env file successfully.");
} catch (err) {
  console.error("❌ Failed to load .env file:", err.message);
}

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
if (!rawKeys) {
  console.error("❌ No GEMINI_API_KEYS found in env.");
  process.exit(1);
}

const apiKeys = rawKeys
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

console.log(`🔍 Found ${apiKeys.length} keys to test...\n`);

async function testKey(key, index) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    // Use gemini-2.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Say 'Key works!'");
    const response = await result.response;
    const text = response.text();
    console.log(`🟢 [Key ${index}] SUCCESS! Output: "${text.trim()}"`);
    return true;
  } catch (error) {
    console.error(`🔴 [Key ${index}] FAILED!`);
    console.error(`   Error Message: ${error.message.split("\n")[0]}`);
    if (error.status) console.error(`   HTTP Status: ${error.status}`);
    return false;
  }
}

async function runTests() {
  for (let i = 0; i < apiKeys.length; i++) {
    await testKey(apiKeys[i], i);
    console.log("-----------------------------------------");
  }
}

runTests();
