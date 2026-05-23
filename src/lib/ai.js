// src/lib/ai.js

import { cache } from './cache';

const API_ENDPOINT = "/api/generate";

export const generateAIContent = async (prompt, retries = 2) => {
  // ✅ CHECK CACHE FIRST - Save API calls!
  const cached = cache.get(prompt);
  if (cached) {
    console.log("📦 Cache hit! Returning saved response");
    return cached;
  }

  // Loop for retries on failure
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set timeout controller (25 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429 = Too Many Requests)
      if (response.status === 429) {
        if (attempt < retries) {
          // Exponential backoff: 10s, 20s, 40s
          const waitTime = 10000 * Math.pow(2, attempt);
          console.warn(`⏳ Rate limited. Waiting ${waitTime / 1000}s before retry...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue; // Try again
        }
        return "⚠️ Service busy. Please wait a few minutes before asking another question. (API quota reached)";
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return `⚠️ ${data.error || "Something went wrong. Please try again."}`;
      }

      // Success! Parse response
      const data = await response.json();
      const result = data.text;

      // ✅ CACHE THE RESPONSE for future use
      cache.set(prompt, result);

      return result;

    } catch (error) {
      // Handle request timeout
      if (error.name === "AbortError") {
        if (attempt < retries) {
          const waitTime = 10000 * Math.pow(2, attempt);
          console.warn(`⏰ Timeout. Retrying in ${waitTime / 1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue; // Try again
        }
        return "⚠️ Request took too long. Please try again.";
      }

      // Network error - only return error on final attempt
      if (attempt === retries) {
        console.error("Network error calling AI API:", error);
        return "⚠️ Could not connect to AI service. Please check your internet connection.";
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS (These just format text - no API calls)
// ─────────────────────────────────────────────────────────────────────────────

export const generateNotesPrompt = (grade, subject, chapter, type) => {
  return `You are an expert Indian school teacher for Class ${grade}. 
Generate ${type} for the subject ${subject}, chapter: "${chapter}". 
Format it clearly with Markdown. Use bullet points, bold text for important terms. 
Make it easy to read, student-friendly, and focused on CBSE/State board patterns.`;
};

export const generateDoubtPrompt = (question) => {
  return `You are TaniOS AI, an intelligent but concise assistant for Indian school students.
Rule 1: If the user just says hello or greets you, reply with a single short sentence. Do NOT explain what the greeting means.
Rule 2: If the user asks an academic doubt, answer ONLY what is asked without unnecessary background.
Rule 3: If the user asks a general, non-academic, or out-of-context question (e.g., jokes, advice, tech questions, general knowledge), answer it normally, accurately, and naturally.
Rule 4: Keep answers brief and to the point.
Rule 5: MATCH THE USER'S LANGUAGE EXACTLY. English question → English answer. Hindi/Hinglish question → Hindi/Hinglish answer.
User input: "${question}"`;
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
