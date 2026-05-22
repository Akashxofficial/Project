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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    
    // Check for rate limit / quota errors
    if (error.message && (error.message.includes("429") || error.message.toLowerCase().includes("quota"))) {
      return "Whoops! The AI is getting too many requests right now (Rate Limit). Please wait a few seconds and try again.";
    }
    
    // Check for safety filter blocks
    if (error.message && error.message.toLowerCase().includes("safety")) {
      return "I couldn't generate a response for that due to safety filters.";
    }

    // Return the actual error message for debugging out-of-context issues
    return `Hmm, I ran into an error: ${error.message.split('\n')[0]}`;
  }
};

// Specific Prompts Generators
export const generateNotesPrompt = (grade, subject, chapter, type) => {
  return `You are an expert Indian school teacher for Class ${grade}. 
Generate ${type} for the subject ${subject}, chapter: "${chapter}". 
Format it clearly with Markdown. Use bullet points, bold text for important terms. 
Make it easy to read, student-friendly, and focused on CBSE/State board patterns.`;
};

export const generateDoubtPrompt = (question) => {
  return `You are TaniOS AI, an intelligent but concise study assistant for Indian school students. 
Rule 1: If the user just says hello or greets you, reply with a single short sentence (e.g., "Hello! How can I help you today?"). Do NOT explain what the greeting means.
Rule 2: If the user asks an academic doubt, answer ONLY what is asked without unnecessary background.
Rule 3: If the user asks a general, non-academic, or out-of-context question (e.g., jokes, advice, tech questions), answer it normally, accurately, and naturally.
Rule 4: Keep your answers brief, simple, and to the point.
Rule 5: MATCH THE USER'S LANGUAGE EXACTLY. If the user asks in English, answer purely in English. If the user asks in Hindi or Hinglish, answer in conversational Hindi/Hinglish.
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
