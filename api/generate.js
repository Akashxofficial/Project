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
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.5-pro"
    ];

    // ✅ NESTED KEY & MODEL ROTATION PIPELINE
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const genAI = new GoogleGenerativeAI(apiKey);
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`[API] Attempting with Key index ${i} using model ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          responseText = response.text();
          chosenModel = modelName;
          
          clearTimeout(timeoutId);
          break; // Successfully got response from this model, break model loop
        } catch (err) {
          console.warn(`[API] Key ${i} with model ${modelName} failed:`, err.message);
          lastError = err;
          
          // Continue to next model if it's a rate limit or quota block
          if (err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
            continue;
          } else {
            // Break model loop for non-quota errors (invalid key, leaked key) to go to next key immediately
            break;
          }
        }
      }
      
      if (responseText) {
        break; // Successfully got response, break key loop
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

    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = rawKeys.split(/[\s,;\n]+/).map(k => k.trim()).filter(Boolean);
    const maskedKeys = apiKeys.map(k => k.length > 8 ? k.substring(0, 8) + '...' : 'invalid');

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        code: 'TIMEOUT',
        diagnostics: { keysFound: apiKeys.length, maskedKeys }
      });
    }

    // Detect permanent key exhaustion (Daily limit 1500 reached / Billing block)
    const errText = error.message.toLowerCase();
    if (errText.includes('exceeded your current quota') || errText.includes('billing') || errText.includes('check your plan')) {
      return res.status(403).json({
        error: '⚠️ Google Gemini daily free limit has been 100% exhausted. Please create a new free API Key in Google AI Studio and update your .env file.',
        code: 'QUOTA_EXHAUSTED',
        diagnostics: { keysFound: apiKeys.length, maskedKeys, lastError: error.message.split('\n')[0] }
      });
    }

    if (error.status === 429 || error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
      // Parse Google's retryDelay hint (e.g. "retryDelay":"31s") from the error message
      const delayMatch = error.message.match(/retryDelay.*?(\d+)/);
      const retryDelaySecs = delayMatch ? parseInt(delayMatch[1]) + 2 : 35;

      return res.status(429).json({
        error: `AI quota reached. Please wait ${retryDelaySecs} seconds.`,
        code: 'RATE_LIMIT',
        retryDelaySecs,
        diagnostics: {
          keysFoundInEnv: apiKeys.length,
          maskedKeys,
          lastError: error.message.split('\n')[0]
        }
      });
    }

    return res.status(500).json({
      error: error.message || 'An error occurred during AI execution',
      code: 'INTERNAL_ERROR',
      diagnostics: { keysFound: apiKeys.length, maskedKeys }
    });
  }
}