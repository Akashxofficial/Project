// Frontend AI client — calls our SECURE server-side API endpoint.
// The Gemini API key NEVER touches the browser. It lives only in the serverless function.

const API_ENDPOINT = "/api/generate";

export const generateAIContent = async (prompt, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting with retry
      if (response.status === 429) {
        if (attempt < retries) {
          // Exponential backoff: 2s, 4s, 6s...
          const waitTime = 2000 * (attempt + 1);
          console.warn(`Rate limited. Retrying in ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue; // Retry
        }
        return "⚠️ Service busy. Please wait a moment and try again.";
      }

      // Handle other errors
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return `⚠️ ${data.error || "Something went wrong. Please try again."}`;
      }

      // Success
      const data = await response.json();
      return data.text;

    } catch (error) {
      // Handle timeout
      if (error.name === "AbortError") {
        if (attempt < retries) {
          console.warn("Request timeout. Retrying...");
          await new Promise(r => setTimeout(r, 2000));
          continue; // Retry
        }
        return "⚠️ Request took too long. Please try again.";
      }

      // Network error
      if (attempt === retries) {
        console.error("Network error calling AI API:", error);
        return "⚠️ Could not connect to the AI service. Please check your internet connection.";
      }
    }
  }
};

// ─── Prompt Builders ───────────────────────────────────────────────────────────
// These run on the CLIENT only (no secrets involved — just text formatting).

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