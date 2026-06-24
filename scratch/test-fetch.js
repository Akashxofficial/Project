// scratch/test-fetch.js
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
} catch (err) {}

const apiKey = process.env.GEMINI_API_KEY || (process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',')[0].trim() : null);

if (!apiKey) {
  console.error("No API key found.");
  process.exit(1);
}

async function run() {
  const prompt = `You are a CBSE and RBSE board syllabus expert. 
Generate a list of exactly 4 to 6 core chronological sub-topics or key concepts for Class 10, CBSE Board, Subject: Chemistry, Chapter: "Chapter 1: Solutions".
Return ONLY a valid JSON array of strings, where each string represents a specific chronological sub-topic or key concept.
Do not include any markdown, code blocks, or conversational text. Output raw JSON only. E.g.:
["Topic 1", "Topic 2", "Topic 3", "Topic 4"]`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Raw Response Text:\n", text);
    const parsed = JSON.parse(text);
    console.log("Parsed JSON successfully:", parsed);
  } catch (err) {
    console.error("Generation failed:", err);
  }
}

run();
