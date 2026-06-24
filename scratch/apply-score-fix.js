import { readFileSync, writeFileSync } from "fs";

const filepath = "src/pages/Home.jsx";
try {
  let content = readFileSync(filepath, "utf8");

  const target = `                           // ── Target Scoring Update ──
                           const storedNetScore = localStorage.getItem(getUserKey('tanios_net_score'));
                           const currentNetScore = storedNetScore ? parseInt(storedNetScore, 10) : 0;
                           const scoreDelta = isCorrect ? 10 : -5;
                           const nextNetScore = currentNetScore + scoreDelta;
                           localStorage.setItem(getUserKey('tanios_net_score'), nextNetScore.toString());
                           setNetScore(nextNetScore);

                           if (isCorrect) {
                             awardXp(10, 'Correct MCQ Answer');
                             setXpAwardedMsg(\`+10 Marks Earned! 🎯\`);
                             setTimeout(() => setXpAwardedMsg(''), 3000);
                           } else {
                             setXpAwardedMsg(\`Penalty Applied: -5 Marks! ❌\`);
                             setTimeout(() => setXpAwardedMsg(''), 3000);
                           }`;

  const replacement = `                           // ── Target Scoring Update ──
                           const storedNetScore = localStorage.getItem(getUserKey('tanios_net_score'));
                           const currentNetScore = storedNetScore ? parseInt(storedNetScore, 10) : 0;
                           
                           const hasPreviousWrong = existing && !existing.isCorrect;
                           let scoreDelta = 0;
                           
                           if (isCorrect) {
                             scoreDelta = hasPreviousWrong ? 0 : 10;
                           } else {
                             // Only penalize on the first wrong attempt
                             scoreDelta = existing ? 0 : -5;
                           }
                           
                           const nextNetScore = currentNetScore + scoreDelta;
                           localStorage.setItem(getUserKey('tanios_net_score'), nextNetScore.toString());
                           setNetScore(nextNetScore);

                           if (isCorrect) {
                             if (!hasPreviousWrong) {
                               awardXp(10, 'Correct MCQ Answer');
                               setXpAwardedMsg(\`+10 Marks Earned! 🎯\`);
                             } else {
                               setXpAwardedMsg(\`Corrected! (No Marks/XP for retries) 💡\`);
                             }
                             setTimeout(() => setXpAwardedMsg(''), 3000);
                           } else {
                             if (!existing) {
                               setXpAwardedMsg(\`Penalty Applied: -5 Marks! ❌\`);
                             } else {
                               setXpAwardedMsg(\`Incorrect Option! (Try again) ❌\`);
                             }
                             setTimeout(() => setXpAwardedMsg(''), 3000);
                           }`;

  // Replace regardless of CRLF or LF
  const targetLF = target.replace(/\r\n/g, "\n");
  const targetCRLF = target.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  
  let newContent = content;
  if (content.includes(targetCRLF)) {
    newContent = content.replace(targetCRLF, replacement.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
    console.log("✅ Replaced with CRLF format.");
  } else if (content.includes(targetLF)) {
    newContent = content.replace(targetLF, replacement.replace(/\r\n/g, "\n"));
    console.log("✅ Replaced with LF format.");
  } else {
    // Try to normalize the content search
    console.error("❌ Target code block not found in Home.jsx!");
  }

  if (newContent !== content) {
    writeFileSync(filepath, newContent, "utf8");
    console.log("✅ Successfully wrote changes to Home.jsx!");
  }
} catch (e) {
  console.error("❌ Failed to edit Home.jsx:", e.message);
}
