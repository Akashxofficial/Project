// api/generate.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis";
import * as SentryNode from "@sentry/node";

// Initialize Sentry Node SDK
if (process.env.SENTRY_DSN) {
  SentryNode.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
  console.log("🚀 [Sentry] Node Serverless Monitoring active.");
} else {
  console.log("ℹ️ [Sentry] Node DSN not configured. Server monitoring bypassed.");
}

// Initialize Upstash Redis with robust in-memory mock fallback
let redis;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log("🚀 [Cache] Upstash Redis Client Initialized.");
} else {
  const mockStore = new Map();
  redis = {
    get: async (key) => mockStore.get(key) || null,
    set: async (key, value, options) => {
      mockStore.set(key, value);
      if (options?.ex) {
        setTimeout(() => mockStore.delete(key), options.ex * 1000);
      }
      return "OK";
    }
  };
  console.log("ℹ️ [Cache] Upstash REST credentials missing. Active Local Memory Cache.");
}

function getCacheKey(prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0; 
  }
  return `tanios_cache_${Math.abs(hash)}`;
}


// Simple in-memory sliding window rate limiter
const ipRequests = new Map();
const LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per IP

function isIpAllowed(ip) {
  const now = Date.now();
  
  // Prune old entries occasionally to keep memory usage low
  if (ipRequests.size > 2000) {
    for (const [key, times] of ipRequests.entries()) {
      const fresh = times.filter(t => now - t < LIMIT_WINDOW_MS);
      if (fresh.length === 0) {
        ipRequests.delete(key);
      } else {
        ipRequests.set(key, fresh);
      }
    }
  }

  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, [now]);
    return { allowed: true };
  }
  
  let timestamps = ipRequests.get(ip);
  timestamps = timestamps.filter(t => now - t < LIMIT_WINDOW_MS);
  
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return { allowed: true };
}

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

  // IP-based rate limiting to prevent Gemini API token exhaustion from message spamming
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const ip = rawIp.split(',')[0].trim();
  
  const rateLimitResult = isIpAllowed(ip);
  if (!rateLimitResult.allowed) {
    console.warn(`[RATE LIMIT] Blocked IP: ${ip}. Retry after: ${rateLimitResult.retryAfter}s`);
    return res.status(429).json({
      error: `Slow down! You are sending requests too fast. Please wait ${rateLimitResult.retryAfter} seconds before asking another doubt.`,
      code: 'USER_RATE_LIMIT',
      retryDelaySecs: rateLimitResult.retryAfter
    });
  }

  try {
    const { prompt, stream } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Intercept cache before making external model requests
    const cacheKey = getCacheKey(prompt);
    try {
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        console.log(`[Cache HIT] Returning cached result for key ${cacheKey}`);
        if (stream === true) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          // Stream the cached response in fast chunks to simulate stream effect
          const words = cachedResponse.split(/(\s+)/);
          for (const word of words) {
            res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
            await new Promise(r => setTimeout(r, 4));
          }
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } else {
          return res.status(200).json({
            success: true,
            text: cachedResponse,
            cached: true,
            model: "cached-inference"
          });
        }
      }
    } catch (cacheErr) {
      console.error("[Cache Error] Failed reading cache:", cacheErr);
      if (process.env.SENTRY_DSN) {
        SentryNode.captureException(cacheErr);
      }
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
          
          if (stream === true) {
            console.log(`[API] ✅ Initiating stream for Key index ${i} using model ${modelName}...`);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const resultStream = await model.generateContentStream(prompt);
            let compiledText = "";
            for await (const chunk of resultStream.stream) {
              const chunkText = chunk.text();
              compiledText += chunkText;
              res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
            res.write("data: [DONE]\n\n");
            res.end();

            responseText = compiledText;
            chosenModel = modelName;

            // Save to cache asynchronously
            try {
              await redis.set(cacheKey, responseText, { ex: 86400 });
              console.log(`[Cache Hydrated] Saved streamed result to cache for key ${cacheKey}`);
            } catch (cacheErr) {
              console.error("[Cache Error] Failed writing cache:", cacheErr);
            }
            return;
          }

          // Race the generation promise against a 15-second timeout to prevent serverless hanging
          const generatePromise = (async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          })();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("TimeoutError")), 35000)
          );

          responseText = await Promise.race([generatePromise, timeoutPromise]);
          chosenModel = modelName;
          break; // Successfully got response from this model, break model loop
        } catch (err) {
          console.warn(`[API] Key ${i} with model ${modelName} failed:`, err.message);
          lastError = err;
          
          // Key-wide exhaustion, rate limits, server/service overload (503/500/429/quota/billing), or TimeoutError.
          // Break immediately to rotate to the next key instead of sending failing calls repeatedly.
          const errMsg = err.message?.toLowerCase() || '';
          const isOverloaded = err.status === 503 || err.status === 429 || errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('billing') || errMsg.includes('limit') || errMsg.includes('overloaded') || errMsg.includes('demand');
          
          if (err.message === "TimeoutError" || isOverloaded) {
            console.warn(`[API] Key ${i} failed or is overloaded (503/429/Timeout). Breaking model loop to try next key...`);
            break;
          } else {
            // Model specific error (e.g. model not found), continue trying the next model on the same key
            continue;
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
    
    // Save to Upstash Redis cache asynchronously
    try {
      await redis.set(cacheKey, responseText, { ex: 86400 });
      console.log(`[Cache Hydrated] Saved result to cache for key ${cacheKey}`);
    } catch (cacheErr) {
      console.error("[Cache Error] Failed writing cache:", cacheErr);
      if (process.env.SENTRY_DSN) {
        SentryNode.captureException(cacheErr);
      }
    }

    return res.status(200).json({
      success: true,
      text: responseText,
      model: chosenModel
    });

  } catch (error) {
    console.error('[API] Final Failure:', error.message);
    if (process.env.SENTRY_DSN) {
      SentryNode.captureException(error);
    }

    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = rawKeys.split(/[\s,;\n]+/).map(k => k.trim()).filter(Boolean);
    const maskedKeys = apiKeys.map(k => k.length > 8 ? k.substring(0, 8) + '...' : 'invalid');

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request took too long. Please try again.',
        code: 'TIMEOUT',
        diagnostics: { keysFound: apiKeys.length, maskedKeys }
      });
    }

    // Detect permanent key exhaustion (Daily limit 1500 reached / Billing block)
    const errText = error?.message?.toLowerCase() || "";
    if (errText.includes('exceeded your current quota') || errText.includes('billing') || errText.includes('check your plan')) {
      return res.status(403).json({
        error: 'TaniOS AI is experiencing temporary high load. Please try again in a few seconds.',
        code: 'QUOTA_EXHAUSTED',
        diagnostics: { keysFound: apiKeys.length, maskedKeys, lastError: error.message.split('\n')[0] }
      });
    }

    if (error.status === 429 || error?.message?.includes('429') || errText.includes('quota')) {
      // Parse Google's retryDelay hint (e.g. "retryDelay":"31s") from the error message
      const delayMatch = error.message ? error.message.match(/retryDelay.*?(\d+)/) : null;
      const retryDelaySecs = delayMatch ? parseInt(delayMatch[1]) + 2 : 35;

      return res.status(429).json({
        error: `AI quota reached. Please wait ${retryDelaySecs} seconds.`,
        code: 'RATE_LIMIT',
        retryDelaySecs,
        diagnostics: {
          keysFoundInEnv: apiKeys.length,
          maskedKeys,
          lastError: error.message ? error.message.split('\n')[0] : 'Quota exceeded'
        }
      });
    }

    return res.status(500).json({
      error: 'TaniOS AI server is busy or experiencing high demand. Please try again in a few seconds.',
      code: 'INTERNAL_ERROR',
      diagnostics: { keysFound: apiKeys.length, maskedKeys, lastError: error.message || 'An error occurred during AI execution' }
    });
  }
}