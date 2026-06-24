async function run() {
  const prompt = `You are an elite syllabus-expert personal AI teacher built specifically for Class 10 students of the CBSE board, with extreme expertise in curricula, past exam papers, and question patterns.
 
SYSTEMATIC TOPIC-TEACHING MCQ LAW:
Your goal is to teach a student the specific sub-topic(s): "Mirror Formula and Magnification" from the subject Physics, chapter: "Chapter 1: Light - Reflection and Refraction" using EXACTLY ONE highly educational Multiple Choice Question (MCQ). The question, options, and explanation MUST be designed with 100% precision for CBSE and RBSE board standards, focusing heavily on high-yield, exam-repeated concepts.

SYLLABUS PACING SUMMARY:
* Subject: Physics
* Total Chapters in Syllabus: 14
* Current Chapter: "Chapter 1: Light - Reflection and Refraction" (Chapter 1 of 14)
* Days Remaining until Exams: 200 Days
* Target Completion Pace: Exactly 15 days allocated to complete each remaining chapter to guarantee 100% syllabus completion on time.
* Chapter Study Day Progress: Today is Day 1 out of 15 allocated days for "Chapter 1: Light - Reflection and Refraction".

Systematic Topic-Focused Pacing Directive:
Please design the MCQ, the topic summary, and the explanation strictly to explain and test the selected topics: "Mirror Formula and Magnification".
- IMPORTANT: Do NOT ask a broad question about the entire chapter, and do NOT summarize the whole chapter. You must focus ONLY on the specified sub-topics.

SPEED & CONCISENESS RULE (MANDATORY):
To ensure ultra-fast generation and instant response times (< 2 seconds), be extremely crisp, high-density, and direct. Keep the topicSummary to exactly 3 short bullet points (max 40 words total). Keep the explanation to a short, high-yield topper guide of max 120 words total containing a 1-bullet concept explanation, a 1-sentence topper trick, and a 1-sentence mistake warning.

Your output must be a single master Multiple Choice Question (MCQ) that:
1. Question: Renders a highly detailed, clear, concept-introducing scenario or problem. Wrap any math formulas, variables, or chemical equations in LaTeX $ delimiters (e.g. $A + B \\rightarrow AB$).
2. Options: The options (A, B, C, D) should represent distinct sub-topics or conceptual states, clearly teaching the key distinctions.
3. Explanation: Provide an absolute topper explanation.

Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "topic": "Specific Sub-Topic Name (e.g. Balancing Chemical Equations, not the broad chapter name)",
  "topicSummary": "A concise 3 bullet point Markdown summary of ONLY this sub-topic. Max 40 words. Use KaTeX $ for all formulas. Shown to the student BEFORE the MCQ question to prime their understanding.",
  "questionText": "Highly detailed, conceptual, and concept-introducing question text focusing strictly on this single sub-topic. Wrap all math/equations in $ delimiters.",
  "options": [
    { "key": "A", "desc": "Option A explanation. Wrap any math/formulas in $." },
    { "key": "B", "desc": "Option B explanation." },
    { "key": "C", "desc": "Option C explanation." },
    { "key": "D", "desc": "Option D explanation." }
  ],
  "correctKey": "A, B, C, or D",
  "explanation": "Markdown-styled short mini-lesson teaching ONLY the selected sub-topic. Max 120 words. Include: 💡 Core Concept, 🥇 Topper Trick, and ⚠️ Common Mistake. Use KaTeX $ for all math/scientific expressions."
}`;

  try {
    const response = await fetch("http://localhost:3001/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response text length:", data.text?.length);
    console.log("Response text:\n", data.text);
    
    // Test parsing with safeJsonParse
    const safeJsonParse = (str) => {
      let cleaned = str.trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');

      if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      } else if (firstBracket !== -1 && lastBracket !== -1) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      } else {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      // Replace invalid single quote escapes
      cleaned = cleaned.replace(/\\'/g, "'");

      // Escape backslashes that are not valid JSON escapes (\", \\, \n, \r)
      cleaned = cleaned.replace(/\\(["\\nr])|\\/g, (match, g1) => {
        return g1 ? match : '\\\\';
      });

      return JSON.parse(cleaned);
    };

    try {
      const parsed = safeJsonParse(data.text);
      console.log("safeJsonParse Succeeded!");
      console.log(parsed);
    } catch (e) {
      console.log("safeJsonParse Failed:", e.message);
      // Let's print the characters around the error index if we can get it
      const match = e.message.match(/at position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const start = Math.max(0, pos - 50);
        const end = Math.min(data.text.length, pos + 50);
        console.log(`Context around position ${pos}:`);
        console.log(data.text.substring(start, end));
        console.log(" ".repeat(pos - start) + "^");
      }
    }
  } catch (err) {
    console.error("Local request failed:", err);
  }
}
run();
