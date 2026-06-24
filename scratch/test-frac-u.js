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

// Let's test with a LaTeX formula in JSON containing \frac{1}{u}
const testStr1 = `{
  "text": "Mirror formula is $\\\\frac{1}{f} = \\\\frac{1}{v} + \\\\frac{1}{u}$"
}`;

try {
  console.log("Parsing testStr1...");
  const parsed1 = safeJsonParse(testStr1);
  console.log("Success:", parsed1);
} catch (e) {
  console.error("Failed:", e.message);
}

// Let's test with a LaTeX formula containing single backslashes in JSON (the invalid JSON that AI might output if it doesn't escape backslashes)
const testStr2 = `{
  "text": "Mirror formula is $\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$"
}`;

try {
  console.log("\nParsing testStr2...");
  const parsed2 = safeJsonParse(testStr2);
  console.log("Success:", parsed2);
} catch (e) {
  console.error("Failed:", e.message);
}
