// src/lib/ai.js

import { cache } from './cache';

const API_ENDPOINT = "/api/generate";

/**
 * Main AI content generator with:
 * - Caching (same prompt = instant answer)
 * - Auto-retry with countdown on 429 quota errors
 * - onStatus callback so UI can show "Retrying in 28s..."
 */
export const generateAIContent = async (prompt, onStatus = null) => {
  // ✅ CACHE CHECK - Instant answer for repeated questions
  const cached = cache.get(prompt);
  if (cached) {
    console.log("📦 Cache hit!");
    return { text: cached, fromCache: true };
  }

  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      if (attempt > 0) {
        onStatus?.(`♻️ Retrying... (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      } else {
        onStatus?.("thinking");
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // ── 429: Quota hit → wait then auto-retry ──────────────────────────────
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));

        // Use the exact retryDelaySecs from backend (parsed from Google's error), or default to 35s
        let waitSecs = data.retryDelaySecs || 35;

        if (attempt < MAX_ATTEMPTS - 1) {
          // Show countdown to user
          for (let t = waitSecs; t > 0; t--) {
            onStatus?.(`⏳ Quota limit hit — auto-retrying in ${t}s...`);
            await new Promise(r => setTimeout(r, 1000));
          }
          continue; // Retry
        }

        // All retries exhausted
        onStatus?.(null);
        return { text: null, error: "quota", message: "⚠️ AI quota exhausted. Please try again in 1 minute." };
      }

      // ── Other HTTP errors ──────────────────────────────────────────────────
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onStatus?.(null);
        return { text: null, error: "http", message: `⚠️ ${data.error || "Something went wrong. Please try again."}` };
      }

      // ── SUCCESS ────────────────────────────────────────────────────────────
      const data = await response.json();
      const result = data.text;

      // Cache successful response
      cache.set(prompt, result);
      onStatus?.(null);
      return { text: result, model: data.model };

    } catch (error) {
      // Timeout
      if (error.name === "AbortError") {
        if (attempt < MAX_ATTEMPTS - 1) {
          onStatus?.(`⏰ Request timed out, retrying...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        onStatus?.(null);
        return { text: null, error: "timeout", message: "⚠️ Request took too long. Please try again." };
      }

      // Network error
      if (attempt < MAX_ATTEMPTS - 1) {
        onStatus?.(`🌐 Network error, retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      onStatus?.(null);
      return { text: null, error: "network", message: "⚠️ Could not connect. Please check your internet connection." };
    }
  }

  onStatus?.(null);
  return { text: null, error: "exhausted", message: "⚠️ All retries failed. Please try again in a minute." };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

export const generateDoubtPrompt = (question) => {
  return `You are TaniOS AI, a world-class, premium, elite-level personal AI teacher and tutor for Indian school students.
Goal: Provide extremely comprehensive, detailed, and highly precise explanations. Do not be brief; explain concepts deeply so that a student can understand them perfectly.

Rule 1: If the user just says hello or greets you, reply with a warm, polite, and brief greeting introducing yourself as their AI teacher.
Rule 2: For any academic doubt or question, explain it in rich detail. Break it down step-by-step:
   - Provide a clear, precise definition.
   - Explain the underlying concept deeply.
   - Use simple real-life analogies to make it intuitive.
   - Give solved examples, mathematical steps, formulas, or chemical reactions if applicable.
   - Use markdown tables, bold key terms, and bullet points for beautiful structure.
Rule 3: Match the user's language EXACTLY. English question → English answer. Hindi/Hinglish question → Hindi/Hinglish answer.
User input: "${question}"`;
};

export const generateNotesPrompt = (grade, subject, chapter, type) => {
  return `You are an expert Indian school teacher for Class ${grade}. 
Generate ${type} for the subject ${subject}, chapter: "${chapter}". 
Format it clearly with Markdown. Use bullet points, bold text for important terms. 
Make it easy to read, student-friendly, and focused on CBSE/State board patterns.`;
};

export const generateRevisionPrompt = (subject, chapter, time) => {
  return `You are an expert exam prep tutor. 
Provide a ${time}-minute quick revision summary for the chapter "${chapter}" in ${subject}.
Focus ONLY on the most frequently asked exam topics, key dates/formulas, and critical definitions.
Output in clean Markdown.`;
};

export const generateTimetablePrompt = (date, subjects, hours, preference) => {
  return `You are a smart study planner.
Create a detailed study timetable leading up to the exam date (${date}).
Subjects to cover: ${subjects}.
Daily study hours: ${hours} hours.
Student preference: ${preference}.
Output a day-by-day plan in Markdown format, breaking down hours per subject and giving specific advice.`;
};

export const generateTestPrompt = (subject, topic, type, count, difficulty) => {
  return `You are a strict but fair examiner.
Generate a test for ${subject}, topic: "${topic}".
Type of questions: ${type}.
Number of questions: ${count}.
Difficulty: ${difficulty}.
Provide the test cleanly formatted. Do NOT provide the answers immediately. Provide the answers at the very end under a "Answer Key" section.`;
};
