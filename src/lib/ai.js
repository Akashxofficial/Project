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

export const generateDoubtPrompt = (question, history = []) => {
  const historyText = history.length > 0 
    ? `\n\nPrevious conversation context:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'AI Teacher'}: ${m.text}`).join('\n')}\n`
    : '';

  // Get current date beautifully formatted
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `You are TaniOS AI, a world-class, premium, elite-level personal AI teacher and tutor built specifically for Indian school students (CBSE/RBSE/State Boards).
Role: You are a hyper-intelligent, rigorous, and highly supportive companion tutor. You do not make factual, historical, mathematical, or scientific errors. You explain concepts with maximum depth and pedagogical clarity.

---
[SYSTEM CONTEXT]
- Today's Real-Time Current Date: ${currentDate}
- Target Audience: Class 8 to 12 Indian Board Students.
---

Instructions:
1. **Factual Rigor**: You must be 100% accurate. If asked about current dates, real-world events, or complex mathematical/scientific equations, calculate or deduce them correctly using the system context.
2. **Pedagogical Structure**: For any academic query:
   - Start with a **formal, exact definition** box.
   - Provide a **deep, intuitive explanation** of the core mechanism.
   - Use a **simple real-world analogy** (e.g. comparing cells to factories, electricity to water flow, or chemical reactions to cooking) to cement understanding.
   - Include **step-by-step solved examples**, formal equations, chemical formulas, or coordinate diagrams where applicable.
   - Use **Markdown tables**, bold highlights, and structural bullet points so it is highly scannable and visually stunning.
3. **Warm Encouragement & Companionship**: Maintain an inspiring, high-dopamine companion tone.
4. **Bilingual Strictness**:
   - If the student asks in English, reply in clean, elite academic English.
   - If the student asks in Hindi or Hinglish (mixed Hindi-English), reply in warm, scannable Hinglish/Hindi so they feel comfortable, but keep academic definitions in standard English brackets.${historyText}

Current Student Question: "${question}"`;
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

export const generateExamRoadmapPrompt = (board, grade, subject, days) => {
  return `You are TaniOS AI, an elite board exam counselor and expert teacher built specifically for Indian school students.
Create an extremely comprehensive, practical, and highly detailed Board Exam study roadmap for:
- Board: ${board}
- Class/Grade: ${grade}
- Subject: ${subject}
- Days Remaining: ${days} Days

Provide a professional study plan in beautiful Markdown:
1. **Critical High-Weightage Chapters**: Identify the chapters that carry the maximum marks in this board's history for this subject.
2. **Day-by-Day Revision Timeline**: Create a structured target sheet for the next ${days} days, dividing the syllabus into actionable daily tasks.
3. **Most Repeated Board Questions / Hot Topics**: List the top 5 most frequently repeated concepts or questions in past 10 years of ${board} exams for this subject.
4. **Consistency & Psychology Advice**: Give 3 quick elite exam-crushing tips specifically for an Indian student facing pressure.

Use beautiful bolding, list formatting, and a structured layout so it feels extremely professional, realistic, and highly motivating. Use a friendly, encouraging companion tone!`;
};

export const generateOneClickPrompt = (type, topic, grade) => {
  let promptText = "";
  if (type === "Explain Easy") {
    promptText = `Explain the academic topic/concept "${topic}" for Class ${grade} students in the simplest way possible.
Use simple, creative, real-world analogies (like food, cricket, or daily items) that make the concept immediately understandable.
Avoid complicated academic jargon initially; explain it like I'm 10 years old, then connect it to the official board concept.`;
  } else if (type === "Important Questions") {
    promptText = `Generate the top 5 highly important, marks-yielding questions on the topic "${topic}" for Class ${grade} exams.
For each question:
1. State the question clearly.
2. Provide a premium, full-marks model answer written in CBSE/State-board marking scheme style.
3. Add a quick "Topper Tip" on what examiners look for in this specific answer.`;
  } else if (type === "Board Questions") {
    promptText = `Provide the top 3 authentic, most-repeated past board exam questions (CBSE/RBSE style) on the topic "${topic}" for Class ${grade}.
For each question:
1. Mention which years it was asked (e.g., CBSE 2018, 2022, RBSE 2019).
2. Give a step-by-step model answer.
3. Highlight critical keywords that are MANDATORY to secure full marks.`;
  } else if (type === "Revision Sheet") {
    promptText = `Create a sleek, high-density 1-page Revision Sheet for the topic/chapter "${topic}" for Class ${grade}.
Include:
- Key terms and their exact, formal definitions.
- All important formulas, chemical equations, or major dates in a neat Markdown table.
- A "Don't Make This Mistake" warning box listing common student errors in exams for this topic.`;
  } else if (type === "Mind Map") {
    promptText = `Create a structured text-based Mind Map / Hierarchical Flow Diagram for the topic "${topic}" for Class ${grade}.
Use clean text indentations, arrows (->), and structured bullet points to represent:
- The central core concept.
- Main branches (subtopics).
- Sub-branches (key points, definitions, and examples).
Make it highly visual using emoji headers and clear hierarchy so a student can scan and memorize it in 30 seconds.`;
  } else if (type === "5-Minute Study") {
    promptText = `Provide a hyper-focused, super fast "5-Minute study guide" on "${topic}" for Class ${grade}.
Break it down into:
- The absolute core definition (1 sentence).
- 3 bullet points containing the only things you MUST know.
- 1 quick mnemonic device or trick to memorize this concept forever.
Make it extremely crisp, engaging, and fast.`;
  } else {
    promptText = `Provide a comprehensive, high-quality study resource on "${topic}" for Class ${grade}. Use formatting, bold headers, and easy explanations.`;
  }

  return `You are TaniOS AI, an elite personal teacher built for Indian students.
Role: Generate the following specific resource type: "${type}"
Topic: "${topic}"
Target Audience: Class ${grade} students (CBSE/RBSE board).

Here are the specific instructions for your output:
${promptText}

Always use markdown tables, list layouts, clear spacing, and bullet points to make the output feel extremely premium, legible, and visual. Write in an encouraging, high-dopamine, supportive tone!`;
};
