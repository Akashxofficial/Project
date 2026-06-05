// src/lib/ai.js

import { cache } from './cache';
import { limiter } from './rateLimiter';

const API_ENDPOINT = "/api/generate";



/**
 * AGGRESSIVE post-processor: fixes AI output where math is NOT in LaTeX.
 * Handles:
 *  - Unicode super/subscripts (v², H₂O)
 *  - Bare equations (F=ma, V=IR) not wrapped in $...$
 *  - Unicode Greek letters (θ, μ, π, Φ, etc.)
 *  - Proportionality symbol ∝ → \propto
 *  - Stacked visual fractions the AI produces across multiple lines
 *  - Removes duplicate "visual rendering" lines Gemini creates
 */
export function fixMathFormatting(text) {
  if (!text) return text;

  let result = text;

  // ── Unicode Maps ──────────────────────────────────────────────────────
  const superMap = { '²': '^2', '³': '^3', '¹': '^1', '⁴': '^4', '⁰': '^0', '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9', '⁻': '^-', '⁺': '^+' };
  const subMap = { '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4', '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9' };
  const greekMap = { 'θ': '\\theta', 'Θ': '\\Theta', 'μ': '\\mu', 'π': '\\pi', 'Φ': '\\Phi', 'φ': '\\phi', 'ρ': '\\rho', 'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'Δ': '\\Delta', 'δ': '\\delta', 'λ': '\\lambda', 'ω': '\\omega', 'Ω': '\\Omega', 'ε': '\\epsilon', 'σ': '\\sigma', 'τ': '\\tau', 'η': '\\eta' };

  // Helper: check if a position is inside an existing $...$ block
  function isInsideDollar(str, pos) {
    let count = 0;
    for (let i = 0; i < pos; i++) {
      if (str[i] === '$' && (i === 0 || str[i-1] !== '\\')) count++;
    }
    return count % 2 === 1;
  }

  // ── 1. Remove Gemini's "visual stacked math" duplicates ────────────────
  // Gemini often outputs something like:
  //   F = m a      (visual rendering using spaced chars)
  //   F=ma         (compact version on next line)
  // Or multi-line stacked fractions like:
  //   B=
  //   2πr
  //   μ₀I
  // We clean these by removing lines that are ONLY single letters/symbols/numbers
  // that appear to be stacked visual math (not inside code blocks or tables)
  const lines = result.split('\n');
  const cleanedLines = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip lines that are just a single math symbol/letter/operator on their own
    // (these are stacked visual fractions from Gemini)
    // But preserve: real content lines, headings, list items, table rows, etc.
    const isStackedMathLine = /^[A-Za-z0-9=+\-×÷∝∞≈≠≤≥±∓√∫∑∏∂∇⟨⟩θμπΦφρΔδλωαβγεσΩτη₀₁₂₃₄₅₆₇₈₉²³¹⁴⁰⁵⁶⁷⁸⁹⁻⁺.,\s/()]{1,6}$/.test(line)
      && !/^[#\-*>|]/.test(line) // not heading/list/blockquote/table
      && !/^\d+\./.test(line)     // not numbered list
      && line.length > 0
      && line.length <= 6
      && !/^(Where|Note|If|The|In|A|B|C|D|E|F|G|or|and|so|to|is|it|of|at|on|by|no|do|an|as|we|he|if)$/i.test(line); // not English words

    if (isStackedMathLine) {
      // Look ahead: if next 1-3 lines are ALSO short stacked math, skip all of them
      // This is a visual fraction block
      let j = i;
      while (j < lines.length && /^[A-Za-z0-9=+\-×÷∝∞.,\s/()θμπΦρΔλωαβ₀₁₂₃₄₅₆₇₈₉²³]{1,8}$/.test(lines[j].trim()) && lines[j].trim().length > 0 && lines[j].trim().length <= 8) {
        j++;
      }
      // If we skipped 2+ consecutive short lines, they were a stacked fraction → skip them
      if (j - i >= 2) {
        i = j;
        continue;
      }
    }
    
    cleanedLines.push(lines[i]);
    i++;
  }
  result = cleanedLines.join('\n');

  // ── 2. Fix Unicode super/subscripts → LaTeX ────────────────────────────
  // e.g. v² → $v^2$, t² → $t^2$, H₂O → $H_2O$, 10⁻⁷ → $10^{-7}$
  result = result.replace(/[a-zA-Z0-9][²³¹⁴⁰⁵⁶⁷⁸⁹⁻⁺₀₁₂₃₄₅₆₇₈₉]+/g, (match, offset) => {
    if (isInsideDollar(result, offset)) return match;
    let fixed = match;
    Object.entries(superMap).forEach(([u, l]) => { fixed = fixed.replaceAll(u, l); });
    Object.entries(subMap).forEach(([u, l]) => { fixed = fixed.replaceAll(u, l); });
    if (fixed !== match) {
      // Wrap multi-char exponents in braces: ^-7 → ^{-7}
      fixed = fixed.replace(/\^([+-]?\d{2,})/g, '^{$1}');
      return `$${fixed}$`;
    }
    return match;
  });

  // ── 3. Wrap bare equations in $...$ ────────────────────────────────────
  // Match patterns like: F=ma, V=IR, P=VI, s=ut+½at², E=mc², v²=u²+2as
  // These are single-variable equations on their own or after ":" or "="
  result = result.replace(/(?:^|(?<=[:,\s]))([A-Za-z](?:_\{?\w+\}?)?)\s*=\s*([A-Za-z0-9\s+\-*/^_{}\\().]+?)(?=$|[,.]?\s|[,.]?$)/gm, (match, lhs, rhs, offset) => {
    if (isInsideDollar(result, offset)) return match;
    // Only wrap if the RHS looks like math (has letters/numbers/operators, not English words)
    const trimmedRhs = rhs.trim();
    if (trimmedRhs.length < 1 || trimmedRhs.length > 40) return match;
    // Skip if RHS looks like English text (has spaces between words of 3+ chars)
    if (/[a-z]{3,}\s+[a-z]{3,}/i.test(trimmedRhs)) return match;
    // Skip if already has $ in it
    if (match.includes('$')) return match;
    return ` $${lhs.trim()} = ${trimmedRhs}$ `;
  });

  // ── 4. Fix proportionality: B∝I/r → $B \propto \frac{I}{r}$ ──────────
  result = result.replace(/([A-Za-z])\s*∝\s*([A-Za-z0-9/\\^_{}() ]+)/g, (match, lhs, rhs, offset) => {
    if (isInsideDollar(result, offset)) return match;
    let fixedRhs = rhs.trim();
    // Convert simple a/b to \frac{a}{b}
    if (/^(\w+)\s*\/\s*(\w+)$/.test(fixedRhs)) {
      fixedRhs = fixedRhs.replace(/^(\w+)\s*\/\s*(\w+)$/, '\\frac{$1}{$2}');
    }
    return `$${lhs} \\propto ${fixedRhs}$`;
  });

  // ── 5. Replace Unicode Greek letters with LaTeX equivalents ────────────
  // Only when they appear in math-like context (near = or $ or other math symbols)
  const greekRegex = new RegExp(`([${Object.keys(greekMap).join('')}])`, 'g');
  result = result.replace(greekRegex, (match, letter, offset) => {
    if (isInsideDollar(result, offset)) {
      // Already inside $ block → just replace the unicode with LaTeX command
      return greekMap[letter] || match;
    }
    // Outside $ → only wrap if it's clearly in a math context
    // Check surrounding chars
    const before = result[offset - 1] || '';
    const after = result[offset + 1] || '';
    const mathContext = /[=+\-*/^_0-9()$\\]/.test(before) || /[=+\-*/^_0-9()$\\]/.test(after);
    if (mathContext) {
      return `$${greekMap[letter]}$`;
    }
    return match; // leave alone if it's in prose (e.g. "the angle θ is...")
  });

  // ── 6. Fix $$...$$ that have content on same line ─────────────────────
  // Ensure $$ blocks are on their own lines for proper KaTeX block rendering
  result = result.replace(/([^\n])\$\$([^$]+)\$\$([^\n])/g, '$1\n$$$$2$$\n$3');

  // ── 7. Clean up any double-wrapped $$...$$ from our replacements ──────
  result = result.replace(/\$\$\$/g, '$$');
  result = result.replace(/\$\s*\$/g, '');

  return result;
}


/**
 * Main AI content generator with:
 * - Caching (same prompt = instant answer)
 * - Auto-retry with countdown on 429 quota errors
 * - onStatus callback so UI can show "Retrying in 28s..."
 */
export const generateAIContent = async (prompt, onStatus = null, image = null) => {
  // ✅ CACHE CHECK - Instant answer for repeated questions
  const cached = image ? null : cache.get(prompt);
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
        body: JSON.stringify({ prompt, image }),
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
      if (!image) {
        cache.set(prompt, result);
      }
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
};

/**
 * Advanced Client Streaming Consumer:
 * Parses SSE streams line-by-line, decodes json frames,
 * applies dynamic math formatting, and triggers callbacks.
 */
export const generateAIContentStream = async (prompt, onChunk, onStatus = null, image = null) => {
  // Client-side rate-limiting check
  if (!limiter.isAllowed()) {
    const waitSecs = limiter.getRetryAfter();
    onStatus?.(null);
    return {
      text: null,
      error: "rate_limit",
      message: `Slow down! You are asking doubts too fast. Please wait ${waitSecs} seconds before asking another doubt.`
    };
  }

  try {
    onStatus?.("thinking");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, stream: true, image }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      onStatus?.(null);
      return {
        text: null,
        error: errData.code || "server_error",
        message: errData.error || "TaniOS AI server is busy. Please try again."
      };
    }

    onStatus?.("generating");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Hold partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.substring(6);
        if (jsonStr === "[DONE]") {
          break;
        }

        try {
          const data = JSON.parse(jsonStr);
          if (data.text) {
            fullText += data.text;
            onChunk?.(fixMathFormatting(fullText));
          }
        } catch (e) {
          console.warn("Could not parse stream JSON chunk:", jsonStr);
        }
      }
    }

    // Process leftover buffer
    if (buffer.trim().startsWith("data: ")) {
      const jsonStr = buffer.trim().substring(6);
      if (jsonStr !== "[DONE]") {
        try {
          const data = JSON.parse(jsonStr);
          if (data.text) {
            fullText += data.text;
            onChunk?.(fixMathFormatting(fullText));
          }
        } catch (e) {}
      }
    }

    // Cache successful stream output for instant repeat requests
    if (!image) {
      cache.set(prompt, fullText);
    }
    onStatus?.(null);
    return { text: fixMathFormatting(fullText), success: true };

  } catch (err) {
    console.error("Streaming Fetch Failure:", err);
    onStatus?.(null);
    if (err.name === "AbortError") {
      return {
        text: null,
        error: "timeout",
        message: "⚠️ Request took too long. Please try again."
      };
    }
    return {
      text: null,
      error: "network_error",
      message: "⚠️ Connection failed. Please check your network."
    };
  }
};

export const generateDoubtPrompt = (question, history = []) => {
  const historyText = history.length > 0 
    ? `\n\nPrevious conversation context:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'AI Teacher'}: ${m.text}`).join('\n')}\n`
    : '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return `You are TaniOS AI, an elite-level personal AI teacher built for Indian school students (Class 8-12 CBSE/RBSE).

[SYSTEM DATE: ${currentDate}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ABSOLUTE MANDATORY RULES — ZERO EXCEPTIONS ALLOWED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 1 — MATH/FORMULA FORMATTING (THIS IS THE MOST CRITICAL RULE):
The UI uses a KaTeX renderer. Every single math formula, equation, variable, or scientific expression MUST be wrapped in LaTeX dollar-sign delimiters. If you do NOT wrap math in $...$ or $$...$$, the formula will appear as broken garbage text.

HOW TO WRITE FORMULAS — MANDATORY FORMAT:
✅ CORRECT (wrap ALL math in $ signs):
- Inline formula: $v = u + at$
- Block/display formula (on its own line):
  $$s = ut + \\frac{1}{2}at^2$$
- Chemical formula: $H_2SO_4$, $CO_2$
- Fractions: $\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$
- Superscripts: $v^2 = u^2 + 2as$, $E = mc^2$
- Subscripts: $H_2O$, $m_1$, $m_2$
- Square root: $\\sqrt{b^2 - 4ac}$
- Greek letters: $\\theta$, $\\rho$, $\\alpha$, $\\omega$
- Complex: $$F = G\\frac{m_1 m_2}{r^2}$$

❌ COMPLETELY WRONG (never do this):
- Writing: v = u + at (NO dollar signs = broken!)
- Writing: H₂SO₄ (Unicode subscripts = broken!)
- Writing: v²=u²+2as (no LaTeX = broken!)
- Writing: 1/f = 1/v + 1/u (fraction without \\frac = broken!)

RULE 2 — NO HTML: Never use <div>, <span>, <br>, <p> or any HTML tag. Use Markdown only.

RULE 3 — TABLES: Use proper Markdown tables with | pipes | and a separator row:
| Column A | Column B |
| :--- | :--- |
| value | value |
Never use || double pipes. Always include the separator row.

RULE 4 — RESPONSE LENGTH:
- Short question (definition, who is X, simple fact) → 2-3 crisp paragraphs max.
- Science/Math formula question → Use structured headings, LaTeX formulas, worked examples.
- Board exam question → Give a full model answer in CBSE marking-scheme style.

RULE 5 — BILINGUAL:
- English question → Answer in elite academic English.
- Hindi/Hinglish question → Answer in natural Hinglish, keep technical terms in English.${historyText}

Student Question: "${question}"`;
};

export const generateNotesPrompt = (grade, subject, chapter, type) => {
  return `You are an expert Indian school teacher for Class ${grade}. 
Generate ${type} for the subject ${subject}, chapter: "${chapter}". 
Format it clearly with Markdown. Use bullet points, bold text for important terms. 
Make it easy to read, student-friendly, and focused on CBSE/State board patterns.

CRITICAL FORMATTING & FORMULA RULES:
- Comparison Tables: ALWAYS use clean Markdown tables with single pipes (\`|\`) and proper \`| :--- | :--- |\` separator rows.
- Math & Science Formulas: Use LaTeX syntax. Inline: \`$formula$\`. Block: \`$$formula$$\`. Examples: \`$H_2SO_4$\`, \`$E = mc^2$\`, \`$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\`. NEVER use Unicode subscripts/superscripts like H₂SO₄ — always use LaTeX.`;
};

export const generateRevisionPrompt = (subject, chapter, time) => {
  return `You are an expert exam prep tutor. 
Provide a ${time}-minute quick revision summary for the chapter "${chapter}" in ${subject}.
Focus ONLY on the most frequently asked exam topics, key dates/formulas, and critical definitions.
Output in clean Markdown.

CRITICAL FORMATTING & FORMULA RULES:
- Comparison Tables: ALWAYS use clean Markdown tables with single pipes (\`|\`) and proper \`| :--- | :--- |\` separator rows.
- Math & Science Formulas: Use LaTeX syntax. Inline: \`$formula$\`. Block: \`$$formula$$\`. Examples: \`$H_2SO_4$\`, \`$E = mc^2$\`, \`$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\`. NEVER use Unicode subscripts/superscripts like H₂SO₄.`;
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
Provide the test cleanly formatted. Do NOT provide the answers immediately. Provide the answers at the very end under a "Answer Key" section.

CRITICAL FORMATTING & FORMULA RULES:
- Comparison Tables: ALWAYS use clean Markdown tables with single pipes (\`|\`) and proper \`| :--- | :--- |\` separator rows.
- Math & Science Formulas: Use LaTeX syntax. Inline: \`$formula$\`. Block: \`$$formula$$\`. Examples: \`$H_2SO_4$\`, \`$E = mc^2$\`. NEVER use Unicode subscripts/superscripts.`;
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

Use beautiful bolding, list formatting, and a structured layout so it feels extremely professional, realistic, and highly motivating. Use a friendly, encouraging companion tone!

CRITICAL FORMATTING & FORMULA RULES:
- Comparison Tables: ALWAYS use clean Markdown tables with single pipes (\`|\`) and proper \`| :--- | :--- |\` separator rows.
- Math & Science Formulas: Use LaTeX syntax. Inline: \`$formula$\`. Block: \`$$formula$$\`. Examples: \`$H_2SO_4$\`, \`$E = mc^2$\`, \`$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\`. NEVER use Unicode subscripts/superscripts.`;
};

export const generateOneClickPrompt = (type, topic, grade, board = 'CBSE') => {
  let promptText = "";
  if (type === "Explain Easy") {
    promptText = `Explain the academic topic/concept "${topic}" for Class ${grade} students under the ${board} syllabus in the simplest way possible.
Use simple, creative, real-world analogies (like food, cricket, or daily items) that make the concept immediately understandable.
Avoid complicated academic jargon initially; explain it like I'm 10 years old, then connect it to the official board concept.`;
  } else if (type === "Important Questions") {
    promptText = `Generate the top 5 highly important, marks-yielding questions on the topic "${topic}" for Class ${grade} under the ${board} exams.
For each question:
1. State the question clearly.
2. Provide a premium, full-marks model answer written in ${board} board marking scheme style.
3. Add a quick "Topper Tip" on what examiners look for in this specific answer.`;
  } else if (type === "Board Questions") {
    promptText = `Provide the top 3 authentic, most-repeated past board exam questions on the topic "${topic}" for Class ${grade} ${board} Board.
For each question:
1. Mention which years it was asked (e.g., ${board} 2018, 2022).
2. Give a step-by-step model answer.
3. Highlight critical keywords that are MANDATORY to secure full marks.`;
  } else if (type === "Revision Sheet") {
    promptText = `Create a sleek, high-density 1-page Revision Sheet for the topic/chapter "${topic}" for Class ${grade} under the ${board} syllabus.
Include:
- Key terms and their exact, formal definitions.
- All important formulas, chemical equations, or major dates in a neat Markdown table.
- A "Don't Make This Mistake" warning box listing common student errors in exams for this topic.`;
  } else if (type === "Mind Map") {
    promptText = `Create a structured text-based Mind Map / Hierarchical Flow Diagram for the topic "${topic}" for Class ${grade} ${board} Board.
Use clean text indentations, arrows (->), and structured bullet points to represent:
- The central core concept.
- Main branches (subtopics).
- Sub-branches (key points, definitions, and examples).
Make it highly visual using emoji headers and clear hierarchy so a student can scan and memorize it in 30 seconds.`;
  } else if (type === "5-Minute Study") {
    promptText = `Provide a hyper-focused, super fast "5-Minute study guide" on "${topic}" for Class ${grade} under the ${board} syllabus.
Break it down into:
- The absolute core definition (1 sentence).
- 3 bullet points containing the only things you MUST know.
- 1 quick mnemonic device or trick to memorize this concept forever.
Make it extremely crisp, engaging, and fast.`;
  } else {
    promptText = `Provide a comprehensive, high-quality study resource on "${topic}" for Class ${grade} under the ${board} syllabus. Use formatting, bold headers, and easy explanations.`;
  }

  return `You are TaniOS AI, an elite personal teacher built for Indian students.
Role: Generate the following specific resource type: "${type}"
Topic: "${topic}"
Target Audience: Class ${grade} students (${board} board).

Here are the specific instructions for your output:
${promptText}

Always use markdown tables, list layouts, clear spacing, and bullet points to make the output feel extremely premium, legible, and visual. Write in an encouraging, high-dopamine, supportive tone!

CRITICAL FORMATTING, FORMULA & SPEED RULES:
- Comparison Tables: ALWAYS use clean Markdown tables with single pipes (\`|\`) and proper \`| :--- | :--- |\` separator rows. NEVER use double pipes.
- Math & Science Formulas: Use LaTeX syntax always. Inline: \`$formula$\`. Block: \`$$formula$$\`. Examples: \`$H_2SO_4$\`, \`$E = mc^2$\`, \`$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$\`. NEVER use Unicode subscripts/superscripts like H₂SO₄.
- Be highly direct, crisp, and concise. 
- Eliminate all unnecessary conversational filler, preambles, and postambles (do NOT write "Here is your plan..." or "I hope this helps..."). Start writing the markdown resource immediately.
- Use clear bullet points and short 1-2 sentence paragraphs to ensure the model responds under 2-3 seconds!`;
};
