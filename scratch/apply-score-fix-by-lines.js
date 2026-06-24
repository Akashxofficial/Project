import { readFileSync, writeFileSync } from "fs";

const filepath = "src/pages/Home.jsx";
try {
  const content = readFileSync(filepath, "utf8");
  const lines = content.split(/\r?\n/);
  
  // Find where "// ── Target Scoring Update ──" is
  const targetIndex = lines.findIndex(l => l.includes("// ── Target Scoring Update ──"));
  console.log("Found target at index:", targetIndex);
  
  if (targetIndex === -1) {
    console.error("❌ Target comment not found!");
    process.exit(1);
  }
  
  // Let's verify the next few lines
  if (!lines[targetIndex + 3].includes("const scoreDelta = isCorrect ? 10 : -5;")) {
    console.error("❌ Verification failed! Line is:", lines[targetIndex + 3]);
    process.exit(1);
  }
  
  // Get indentation
  const indent = lines[targetIndex].match(/^\s*/)[0];
  console.log(`Detected indentation: ${indent.length} spaces`);
  
  const replacementLines = [
    `${indent}// ── Target Scoring Update ──`,
    `${indent}const storedNetScore = localStorage.getItem(getUserKey('tanios_net_score'));`,
    `${indent}const currentNetScore = storedNetScore ? parseInt(storedNetScore, 10) : 0;`,
    `${indent}`,
    `${indent}const hasPreviousWrong = existing && !existing.isCorrect;`,
    `${indent}let scoreDelta = 0;`,
    `${indent}`,
    `${indent}if (isCorrect) {`,
    `${indent}  scoreDelta = hasPreviousWrong ? 0 : 10;`,
    `${indent}} else {`,
    `${indent}  // Only penalize on the first wrong attempt`,
    `${indent}  scoreDelta = existing ? 0 : -5;`,
    `${indent}}`,
    `${indent}`,
    `${indent}const nextNetScore = currentNetScore + scoreDelta;`,
    `${indent}localStorage.setItem(getUserKey('tanios_net_score'), nextNetScore.toString());`,
    `${indent}setNetScore(nextNetScore);`,
    `${indent}`,
    `${indent}if (isCorrect) {`,
    `${indent}  if (!hasPreviousWrong) {`,
    `${indent}    awardXp(10, 'Correct MCQ Answer');`,
    `${indent}    setXpAwardedMsg(\`+10 Marks Earned! 🎯\`);`,
    `${indent}  } else {`,
    `${indent}    setXpAwardedMsg(\`Corrected! (No Marks/XP for retries) 💡\`);`,
    `${indent}  }`,
    `${indent}  setTimeout(() => setXpAwardedMsg(''), 3000);`,
    `${indent}} else {`,
    `${indent}  if (!existing) {`,
    `${indent}    setXpAwardedMsg(\`Penalty Applied: -5 Marks! ❌\`);`,
    `${indent}  } else {`,
    `${indent}    setXpAwardedMsg(\`Incorrect Option! (Try again) ❌\`);`,
    `${indent}  }`,
    `${indent}  setTimeout(() => setXpAwardedMsg(''), 3000);`,
    `${indent}}`
  ];
  
  // Replace from targetIndex to targetIndex + 15 (inclusive)
  lines.splice(targetIndex, 16, ...replacementLines);
  
  // Detect original line endings
  const isCRLF = content.includes("\r\n");
  const newContent = lines.join(isCRLF ? "\r\n" : "\n");
  
  writeFileSync(filepath, newContent, "utf8");
  console.log("✅ Successfully replaced MCQ scoring logic by line index!");
} catch (e) {
  console.error("❌ Failed to edit Home.jsx:", e.message);
}
