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

    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
    if (!rawKeys) {
      console.error('No Gemini API keys configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Split by commas, semicolons, newlines, or general whitespace so it never breaks!
    const apiKeys = rawKeys.split(/[\s,;\n]+/).map(k => k.trim()).filter(Boolean);
    let lastError = null;
    let responseText = null;
    let chosenModel = "gemini-2.5-flash";

    // ✅ KEY ROTATION & MODEL FALLBACK LOOP
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Try the premium 2.5-flash first
        let model = genAI.getGenerativeModel({ model: chosenModel });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        console.log(`[API] Attempting with Key index ${i} using ${chosenModel}...`);
        
        let result;
        try {
          result = await model.generateContent(prompt);
        } catch (innerErr) {
          // If 2.5-flash has strict quota limits, try falling back to 2.0-flash-lite immediately
          if (innerErr.message?.includes('429') && chosenModel !== "gemini-2.0-flash-lite") {
            console.warn(`[API] Key ${i} hit 429 on 2.5-flash. Falling back to 2.0-flash-lite...`);
            chosenModel = "gemini-2.0-flash-lite";
            model = genAI.getGenerativeModel({ model: chosenModel });
            result = await model.generateContent(prompt);
          } else {
            throw innerErr;
          }
        }

        const response = await result.response;
        responseText = response.text();
        clearTimeout(timeoutId);
        break; // Successfully got response, break out of key loop
      } catch (err) {
        console.error(`[API] Key ${i} failed:`, err.message);
        lastError = err;
        // If it's a rate limit/quota issue (429), continue loop to try next key
        if (err.status === 429 || err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
          continue; 
        } else {
          // Break immediately on non-quota errors (e.g., safety, invalid key)
          break;
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("All API keys failed to generate content.");
    }

    console.log(`[API] ✅ Success!`);
    return res.status(200).json({
      success: true,
      text: responseText,
      model: chosenModel
    });

  } catch (error) {
    console.error('[API] Final Failure:', error.message);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    }

    if (error.status === 429 || error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
      return res.status(429).json({
        error: 'All service pipelines are highly congested. Please wait a moment.',
        code: 'RATE_LIMIT'
      });
    }

    return res.status(500).json({
      error: error.message || 'An error occurred during AI execution',
      code: 'INTERNAL_ERROR'
    });
  }
}