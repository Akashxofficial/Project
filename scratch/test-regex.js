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
    console.log(`Match: ${JSON.stringify(match)}, g1: ${JSON.stringify(g1)}`);
    return g1 ? match : '\\\\';
  });

  return JSON.parse(cleaned);
};

// Let's test with a LaTeX formula in JSON
const testStr1 = `{
  "topicSummary": "- Light travels in straight lines.\\n- Reflection is the bouncing of light.\\n- Laws of reflection: $\\\\theta_i = \\\\theta_r$."
}`;

try {
  console.log("Parsing testStr1...");
  const parsed1 = safeJsonParse(testStr1);
  console.log("Success:", parsed1);
} catch (e) {
  console.error("Failed:", e.message);
}

// Let's test with an unescaped single backslash in JSON
const testStr2 = `{
  "topicSummary": "- Formula: $\\theta_i = \\theta_r$."
}`;

try {
  console.log("\nParsing testStr2...");
  const parsed2 = safeJsonParse(testStr2);
  console.log("Success:", parsed2);
} catch (e) {
  console.error("Failed:", e.message);
}

// Let's test with a tab escape \t and unicode escape \u0026
const testStr3 = `{
  "topicSummary": "This\\tcontains\\ta\\ttab\\tand\\tunicode\\t\\u0026\\tcharacter."
}`;

try {
  console.log("\nParsing testStr3...");
  const parsed3 = safeJsonParse(testStr3);
  console.log("Success:", parsed3);
} catch (e) {
  console.error("Failed:", e.message);
}

const testStr4 = `{
  "topicSummary": "This \t contains literal tab and a \\t tab escape."
}`;

try {
  console.log("\nParsing testStr4...");
  const parsed4 = safeJsonParse(testStr4);
  console.log("Success:", parsed4);
} catch (e) {
  console.error("Failed:", e.message);
}

