const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
content = content.replace(/\r\n/g, '\n');

// 1. Remove immediate save/reactivation from checkbox onChange using regex
const regexCheckbox = /setSelectedSubTopicsMap\(newMap\);\s*localStorage\.setItem\(getUserKey\('tanios_selected_subtopics'\),\s*JSON\.stringify\(newMap\)\);\s*if\s*\(!isSelected\)\s*\{\s*setMissions\([\s\S]*?\}\);\s*\}/g;

if (regexCheckbox.test(content)) {
  content = content.replace(regexCheckbox, `setSelectedSubTopicsMap(newMap);`);
  console.log("Successfully stripped immediate checkbox save/reactivate logic using regex.");
} else {
  console.log("Regex checkbox block NOT matched.");
}

// 2. Remove immediate save/reactivation from custom topic enter handler using regex
const regexCustom = /setSelectedSubTopicsMap\(newMap\);\s*localStorage\.setItem\(getUserKey\('tanios_selected_subtopics'\),\s*JSON\.stringify\(newMap\)\);\s*setMissions\([\s\S]*?\}\);\s*e\.target\.value\s*=\s*'';/g;

if (regexCustom.test(content)) {
  content = content.replace(regexCustom, `setSelectedSubTopicsMap(newMap);
                                               e.target.value = '';`);
  console.log("Successfully stripped immediate custom topic save/reactivate logic using regex.");
} else {
  console.log("Regex custom topic block NOT matched.");
}

// Write back with original line endings
content = content.replace(/\n/g, originalLineEndings);
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");
