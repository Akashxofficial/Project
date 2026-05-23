// api/generate.js

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ USE gemini-2.5-flash (WORKS!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    console.log(`[API] Generating content...`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    clearTimeout(timeoutId);

    console.log(`[API] ✅ Success!`);

    return res.status(200).json({
      success: true,
      text: text,
      model: "gemini-2.5-flash"
    });

  } catch (error) {
    console.error('[API] Error:', error.message);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    }

    if (error.status === 429 || error.message.includes('429')) {
      return res.status(429).json({
        error: 'API rate limit exceeded. Please wait.',
        code: 'RATE_LIMIT'
      });
    }

    return res.status(500).json({
      error: error.message || 'An error occurred',
      code: 'INTERNAL_ERROR'
    });
  }
}