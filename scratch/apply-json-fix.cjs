const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
content = content.replace(/\r\n/g, '\n');

// 1. Define the helper function and insert it or replace safeJsonParse
const targetSafeJsonParse = `  const safeJsonParse = (str) => {
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
      cleaned = cleaned.replace(/^\\\`\\\`(?:json)?\\s*/i, '').replace(/\\s*\\\`\\\`$/, '').trim();
    }

    // Replace invalid single quote escapes
    cleaned = cleaned.replace(/\\\\'/g, "'");`;

// Wait, let's write a regex that matches safeJsonParse up to cleaned = cleaned.replace(/\\'/g, "'");
const searchRegex = /const\s+safeJsonParse\s*=\s*\(str\)\s*=>\s*\{([\s\S]*?)cleaned\s*=\s*cleaned\.replace\(\/\\{1,2}'\/g,\s*['"]'['"]\);/;

const replacementSafeJson = `const safeJsonParse = (str) => {
    // Helper to escape raw control characters inside JSON string literals
    const escapeControlCharsInStrings = (s) => {
      let result = '';
      let insideString = false;
      let i = 0;
      while (i < s.length) {
        const char = s[i];
        if (char === '"') {
          let backslashes = 0;
          let j = i - 1;
          while (j >= 0 && s[j] === '\\\\') {
            backslashes++;
            j--;
          }
          if (backslashes % 2 === 0) {
            insideString = !insideString;
          }
          result += char;
          i++;
        } else if (insideString) {
          if (char === '\\n') {
            result += '\\\\n';
            i++;
          } else if (char === '\\r') {
            result += '\\\\r';
            i++;
          } else if (char === '\\t') {
            result += '\\\\t';
            i++;
          } else {
            result += char;
            i++;
          }
        } else {
          result += char;
          i++;
        }
      }
      return result;
    };

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
      cleaned = cleaned.replace(/^\`\`\`(?:json)?\\s*/i, '').replace(/\\s*\`\`\`$/, '').trim();
    }

    cleaned = escapeControlCharsInStrings(cleaned);

    // Replace invalid single quote escapes
    cleaned = cleaned.replace(/\\\\'/g, "'");`;

if (searchRegex.test(content)) {
  content = content.replace(searchRegex, replacementSafeJson);
  console.log("Successfully updated safeJsonParse with escapeControlCharsInStrings regex replacement.");
} else {
  console.log("safeJsonParse target regex NOT found.");
}

// Write back with original line endings
content = content.replace(/\n/g, originalLineEndings);
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");
