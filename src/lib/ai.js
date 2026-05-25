// src/lib/ai.js

import { cache } from './cache';
import { limiter } from './rateLimiter';

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

  // ✅ Client-side rate-limiting check
  if (!limiter.isAllowed()) {
    const waitSecs = limiter.getRetryAfter();
    onStatus?.(null);
    return {
      text: null,
      error: "rate_limit",
      message: `Slow down! You are asking doubts too fast. Please wait ${waitSecs} seconds before asking another doubt.`
    };
  }

  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

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

      // ── 429: Quota hit or User Rate Limit ──────────────────────────────────
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));

        // Check if it is a User Rate Limit from our server
        if (data.code === 'USER_RATE_LIMIT') {
          onStatus?.(null);
          return {
            text: null,
            error: "rate_limit",
            message: `⚠️ ${data.error || "Please wait a few seconds before asking another doubt."}`
          };
        }

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

        if (data.code === 'USER_RATE_LIMIT') {
          return { text: null, error: "rate_limit", message: `⚠️ ${data.error || "Please wait a few seconds before asking another doubt."}` };
        }

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

  return `You are TaniOS AI, an elite-level, premium personal AI teacher and tutor built specifically for Indian school students.
Role: You are a hyper-intelligent, precise, and supportive companion tutor. You explain concepts with maximum clarity and factual rigor.

---
[SYSTEM CONTEXT]
- Today's Real-Time Current Date: ${currentDate}
- Target Audience: Class 8 to 12 Indian Board Students.
---

Critical Output Rules:
1. **STRICTLY NO HTML TAGS**: You must NEVER output any raw HTML elements (like <div>, <span>, <p>, <br>, etc.) under any circumstances. The UI markdown parser does not render HTML and will display them as ugly raw code.
   - To create a definition box or callout, use standard Markdown blockquotes: \`> **Formal Definition:** ...\`.
   - Use standard Markdown bolding (\`**\`), lists (\`-\`), and code blocks (\`\`\`).
2. **CLEAN STANDARD TABLES**: When outputting comparison tables, use standard Markdown table syntax cleanly. Do NOT add extra vertical bars \`||\`, double borders, or broken delimiters that fail markdown rendering.
3. **DYNAMIC ANSWER LENGTH (IMPORTANT)**: 
   - Adapt your answer length based on the student's question. Do NOT force a massive, bloated academic layout with analogies and tables for simple general knowledge or quick definitions (e.g. "who is Elon Musk").
   - For general queries, quick questions, or simple definitions, keep your response **highly crisp, concise, direct, and engaging** (max 2-3 short, high-impact paragraphs).
   - Only use deep academic structures, solved math steps, analogies, and detailed tables when asked about complex science/math chapters, board exam questions, or when a student requests an in-depth explanation!
4. **Bilingual Behavior**:
   - If the student asks in English, reply in clean, elite academic English.
   - If the student asks in Hindi/Hinglish, reply in scannable, natural Hinglish. Keep core academic terms in standard English brackets.${historyText}

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
  // Calculate days remaining dynamically to give high-yield phase durations
  let diffDays = 7;
  try {
    const today = new Date();
    const exam = new Date(date);
    const diffTime = Math.abs(exam - today);
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 7;
  } catch (e) {
    diffDays = 7;
  }

  return `You are TaniOS AI, a hyper-intelligent, elite personal study counselor.
Role: Generate a highly practical, high-impact Study Plan leading up to the exam date (${date}) which is in approximately ${diffDays} days.
Subjects to cover: ${subjects}
Daily study hours: ${hours} hours/day
Student preference: ${preference} (morning person / night owl)

Please structure your response to be extremely concise, visual, and high-impact to ensure instant loading speed. Avoid long-winded paragraphs.

Format:
1. 🗓️ **PHASED TIMELINE BLUEPRINT** (${diffDays} Days Remaining):
   - Group the timeline into 3 concise phases (e.g. Phase 1: Syllabus Core, Phase 2: Weak Spot Healing, Phase 3: Active Recall Sprint).
   - For each phase, write 2-3 actionable bullet points of specific milestones for these subjects (${subjects}). Do NOT write a tedious day-by-day log for many weeks.
2. ⏱️ **ELITE DAILY ROUTINE TEMPLATE** (${hours} Hours):
   - Provide a highly structured hour-by-hour breakdown for a single typical study day customized for a ${preference} study preference.
   - Example: 06:00 AM - 08:00 AM (Subject 1 Focus), etc.
3. 🚀 **TOPPER STRATEGY BOX**:
   - Provide 2 high-impact exam-crushing revision tips.

Keep the entire output extremely crisp, scannable, and scrupulously formatted in clean Markdown so it generates instantly (in under 3 seconds)!`;
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

Always use markdown tables, list layouts, clear spacing, and bullet points to make the output feel extremely premium, legible, and visual. Write in an encouraging, high-dopamine, supportive tone!

CRITICAL OUTPUT SPEED RULE:
- Be highly direct, crisp, and concise. 
- Eliminate all unnecessary conversational filler, preambles, and postambles (do NOT write "Here is your plan..." or "I hope this helps..."). Start writing the markdown resource immediately.
- Use clear bullet points and short 1-2 sentence paragraphs to ensure the model responds under 2-3 seconds!`;
};
