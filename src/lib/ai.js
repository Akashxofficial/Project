import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "dummy-key";
const genAI = new GoogleGenerativeAI(apiKey);

export const generateAIContent = async (prompt) => {
  try {
    // If the user hasn't added their API key yet, return a mock response
    if (apiKey === "dummy-key" || !apiKey) {
      console.warn("Using mock AI because no VITE_GEMINI_API_KEY is set in .env");
      await new Promise(resolve => setTimeout(resolve, 1500));
      return `[MOCK AI RESPONSE - ADD GEMINI API KEY TO SEE REAL RESULTS]\n\nBased on your request:\n\n${prompt}\n\nHere is a simple explanation...`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Sorry, there was an error generating the content. Please check your API key and try again.";
  }
};

// Specific Prompts Generators
export const generateNotesPrompt = (grade, subject, chapter, type) => {
  return \`You are an expert Indian school teacher for Class \${grade}. 
Generate \${type} for the subject \${subject}, chapter: "\${chapter}". 
Format it clearly with Markdown. Use bullet points, bold text for important terms. 
Make it easy to read, student-friendly, and focused on CBSE/State board patterns.\`;
};

export const generateDoubtPrompt = (question) => {
  return \`You are a friendly AI tutor for Indian school students. 
Explain the following doubt in a very simple, step-by-step manner. 
Use a mix of English and simple Hindi terms (Hinglish) if helpful.
Question: \${question}\`;
};

export const generateRevisionPrompt = (subject, chapter, time) => {
  return \`You are an expert exam prep tutor. 
Provide a \${time}-minute quick revision summary for the chapter "\${chapter}" in \${subject}.
Focus ONLY on the most frequently asked exam topics, key dates/formulas, and critical definitions.
Output in clean Markdown.\`;
};

export const generateTimetablePrompt = (date, subjects, hours, preference) => {
  return \`You are a smart study planner.
Create a detailed study timetable leading up to the exam date (\${date}).
Subjects to cover: \${subjects}.
Daily study hours: \${hours} hours.
Student preference: \${preference}.
Output a day-by-day plan in Markdown format, breaking down hours per subject and giving specific advice.\`;
};

export const generateTestPrompt = (subject, topic, type, count, difficulty) => {
  return \`You are a strict but fair examiner.
Generate a test for \${subject}, topic: "\${topic}".
Type of questions: \${type}.
Number of questions: \${count}.
Difficulty: \${difficulty}.
Provide the test cleanly formatted. Do NOT provide the answers immediately. Provide the answers at the very end under a "Answer Key" section.\`;
};
