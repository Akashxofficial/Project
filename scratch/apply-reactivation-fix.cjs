const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for internal regex consistency, then save with matching endings
const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
content = content.replace(/\r\n/g, '\n');

// 1. Reactivate mission when checking a checkbox
const regexCheckbox = /(setSelectedSubTopicsMap\(newMap\);\s*localStorage\.setItem\(getUserKey\('tanios_selected_subtopics'\),\s*JSON\.stringify\(newMap\)\);\s*\})/g;

if (regexCheckbox.test(content)) {
  content = content.replace(regexCheckbox, `setSelectedSubTopicsMap(newMap);
                                                   localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(newMap));

                                                   if (!isSelected) {
                                                     setMissions(prevMissions => {
                                                       const updated = prevMissions.map(m => {
                                                         if (m.subject === subj && m.chapter === currentCh && m.done) {
                                                           return { ...m, done: false };
                                                         }
                                                         return m;
                                                       });
                                                       localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(updated));
                                                       return updated;
                                                     });
                                                   }
                                                 }`);
  console.log("Successfully replaced checkbox toggle block using regex.");
} else {
  console.log("Regex checkbox toggle block NOT matched.");
}

// 2. Reactivate mission when custom topic key is added
const regexCustom = /(setSelectedSubTopicsMap\(newMap\);\s*localStorage\.setItem\(getUserKey\('tanios_selected_subtopics'\),\s*JSON\.stringify\(newMap\)\);\s*e\.target\.value\s*=\s*'';)/g;

if (regexCustom.test(content)) {
  content = content.replace(regexCustom, `setSelectedSubTopicsMap(newMap);
                                               localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(newMap));

                                               setMissions(prevMissions => {
                                                 const updated = prevMissions.map(m => {
                                                   if (m.subject === subj && m.chapter === currentCh && m.done) {
                                                     return { ...m, done: false };
                                                   }
                                                   return m;
                                                 });
                                                 localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(updated));
                                                 return updated;
                                               });
                                               e.target.value = '';`);
  console.log("Successfully replaced custom topic block using regex.");
} else {
  console.log("Regex custom topic block NOT matched.");
}

// Write back with original line endings
content = content.replace(/\n/g, originalLineEndings);
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");
