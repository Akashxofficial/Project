// Local development server that mimics the Vercel serverless /api/generate endpoint.
// Run this alongside `npm run dev` using: node server.js

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

// Manually load .env since we're not using dotenv as a dep
const envFile = readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val && !key.startsWith('#')) {
    process.env[key.trim()] = val.trim();
  }
});

const app = express();
app.use(express.json());

// In-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

app.post('/api/generate', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // Uses GEMINI_API_KEY (NOT VITE_ prefixed, so it's never exposed to the browser)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in .env' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error('AI Error:', error.message);
    if (error.message?.includes('429')) {
      return res.status(429).json({ error: 'AI service is busy. Please wait a few seconds.' });
    }
    return res.status(500).json({ error: 'AI generation failed.' });
  }
});

app.listen(3001, () => {
  console.log('✅ Local API server running on http://localhost:3001');
});
