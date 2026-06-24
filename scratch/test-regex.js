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

  try {
    // 1. First attempt: escape invalid backslashes (excluding valid JSON escapes except \t, \b, \f, \/ which get doubled)
    let tempCleaned = cleaned.replace(/\\(["\\nr])|\\/g, (match, g1) => {
      return g1 ? match : '\\\\';
    });
    return JSON.parse(tempCleaned);
  } catch (e) {
    console.warn("safeJsonParse: Initial parse failed, attempting aggressive escape cleanup:", e.message);
    
    // 2. Second attempt: aggressive character-by-character backslash correction
    let resolved = "";
    let i = 0;
    while (i < cleaned.length) {
      if (cleaned[i] === '\\') {
        const nextChar = cleaned[i + 1];
        if (!nextChar) {
          resolved += '\\\\';
          i++;
          continue;
        }
        
        // If it's a valid JSON escape character, keep it as is
        if (['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(nextChar)) {
          resolved += '\\' + nextChar;
          i += 2;
        } else if (nextChar === 'u') {
          // Check if it's a valid unicode escape sequence (e.g. \u2212)
          const hexPart = cleaned.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hexPart)) {
            resolved += '\\u' + hexPart;
            i += 6;
          } else {
            // Not a valid unicode escape, double escape the backslash
            resolved += '\\\\u';
            i += 2;
          }
        } else {
          // Double escape any other invalid escape
          resolved += '\\\\' + nextChar;
          i += 2;
        }
      } else {
        resolved += cleaned[i];
        i++;
      }
    }
    
    return JSON.parse(resolved);
  }
};

// Test 1: valid LaTeX containing \frac{1}{u} (double backslash in JSON)
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

// Test 2: invalid escape \u} (single backslash in JSON)
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

// Test 3: literal invalid JSON backslashes like \g or \z
const testStr3 = `{
  "text": "This has invalid escapes: \\g and \\z."
}`;

try {
  console.log("\nParsing testStr3...");
  const parsed3 = safeJsonParse(testStr3);
  console.log("Success:", parsed3);
} catch (e) {
  console.error("Failed:", e.message);
}
