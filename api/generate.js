import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  // Reset window if expired
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get client IP for rate limiting
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error:
        "Too many requests. Please wait a moment and try again.",
    });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // API key is only accessible server-side (no VITE_ prefix = never sent to browser)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI service is not configured." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return res.status(200).json({ text });
  } catch (error) {
    console.error("AI Generation Error:", error.message);

    if (error.message?.includes("429") || error.message?.toLowerCase().includes("quota")) {
      return res.status(429).json({
        error: "AI service is busy. Please wait a few seconds and try again.",
      });
    }
    if (error.message?.toLowerCase().includes("safety")) {
      return res.status(400).json({
        error: "That message was blocked by safety filters.",
      });
    }
    return res.status(500).json({ error: "AI generation failed. Please try again." });
  }
}
