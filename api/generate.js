import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // ─────────────────────────────────────────────────────────────────────────
  // CORS Headers - Allow cross-origin requests
  // ─────────────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Only allow POST requests
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ───────────────────────────────────────────────────────────────────────
    // Extract prompt from request
    // ───────────────────────────────────────────────────────────────────────
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // ───────────────────────────────────────────────────────────────────────
    // Check API key exists
    // ───────────────────────────────────────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // ───────────────────────────────────────────────────────────────────────
    // Initialize Gemini API
    // ───────────────────────────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ USE FASTER MODEL: gemini-1.5-flash (faster for free tier)
    // If you want higher quality, use: "gemini-pro" (slower, costs more)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ───────────────────────────────────────────────────────────────────────
    // Call Gemini API with timeout
    // ───────────────────────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    console.log(`[API] Generating content for prompt: ${prompt.substring(0, 50)}...`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    clearTimeout(timeoutId);

    // ───────────────────────────────────────────────────────────────────────
    // Return success response
    // ───────────────────────────────────────────────────────────────────────
    console.log(`[API] ✅ Success! Response length: ${text.length} characters`);

    return res.status(200).json({
      success: true,
      text: text,
      model: "gemini-1.5-flash"
    });

  } catch (error) {
    // ───────────────────────────────────────────────────────────────────────
    // Error Handling
    // ───────────────────────────────────────────────────────────────────────
    console.error('[API] Error:', error.message);

    // Handle timeout
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout - Gemini API response took too long',
        code: 'TIMEOUT'
      });
    }

    // Handle invalid API key
    if (error.message.includes('API key') || error.message.includes('authentication')) {
      return res.status(401).json({
        error: 'Invalid or expired API key',
        code: 'AUTH_ERROR'
      });
    }

    // Handle rate limiting (429)
    if (error.status === 429 || error.message.includes('429')) {
      return res.status(429).json({
        error: 'Gemini API rate limit exceeded. Please wait a moment.',
        code: 'RATE_LIMIT'
      });
    }

    // Handle quota exceeded
    if (error.message.includes('quota') || error.message.includes('Resource has been exhausted')) {
      return res.status(429).json({
        error: 'API quota exceeded for today. Try again tomorrow.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: error.message || 'An error occurred while generating content',
      code: 'INTERNAL_ERROR'
    });
  }
}
