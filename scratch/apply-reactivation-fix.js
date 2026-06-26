const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Reactivate mission when checking a checkbox
const targetCheckbox = `                                                   setSelectedSubTopicsMap(newMap);
                                                   localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(newMap));
                                                 }}`;

const replacementCheckbox = `                                                   setSelectedSubTopicsMap(newMap);
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
                                                 }}`;

// Try both \r\n and \n replacements
const targetCheckboxLF = targetCheckbox.replace(/\r?\n/g, '\n');
const targetCheckboxCRLF = targetCheckbox.replace(/\r?\n/g, '\r\n');

if (content.includes(targetCheckboxCRLF)) {
  content = content.replace(targetCheckboxCRLF, replacementCheckbox.replace(/\r?\n/g, '\r\n'));
  console.log("Successfully replaced checkbox toggle block with CRLF.");
} else if (content.includes(targetCheckboxLF)) {
  content = content.replace(targetCheckboxLF, replacementCheckbox.replace(/\r?\n/g, '\n'));
  console.log("Successfully replaced checkbox toggle block with LF.");
} else {
  console.log("Target checkbox toggle block NOT found.");
}

// 2. Reactivate mission when custom topic key is added
const targetCustom = `                                               setSelectedSubTopicsMap(newMap);
                                               localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(newMap));
                                               e.target.value = '';`;

const replacementCustom = `                                               setSelectedSubTopicsMap(newMap);
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
                                               e.target.value = '';`;

const targetCustomLF = targetCustom.replace(/\r?\n/g, '\n');
const targetCustomCRLF = targetCustom.replace(/\r?\n/g, '\r\n');

if (content.includes(targetCustomCRLF)) {
  content = content.replace(targetCustomCRLF, replacementCustom.replace(/\r?\n/g, '\r\n'));
  console.log("Successfully replaced custom topic block with CRLF.");
} else if (content.includes(targetCustomLF)) {
  content = content.replace(targetCustomLF, replacementCustom.replace(/\r?\n/g, '\n'));
  console.log("Successfully replaced custom topic block with LF.");
} else {
  console.log("Target custom topic block NOT found.");
}

// 3. Render a Review button next to Done text
const targetDoneText = `                          {mission.done && mission.type !== 'login' && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>✓ Done</span>
                          )}`;

const replacementDoneText = `                          {mission.done && mission.type !== 'login' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>✓ Done</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startStudyMission(mission);
                                }}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.2rem 0.4rem', 
                                  fontSize: '0.68rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  whiteSpace: 'nowrap',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)'
                                }}
                              >
                                Review <Play size={8} />
                              </button>
                            </div>
                          )}`;

const targetDoneTextLF = targetDoneText.replace(/\r?\n/g, '\n');
const targetDoneTextCRLF = targetDoneText.replace(/\r?\n/g, '\r\n');

if (content.includes(targetDoneTextCRLF)) {
  content = content.replace(targetDoneTextCRLF, replacementDoneText.replace(/\r?\n/g, '\r\n'));
  console.log("Successfully replaced done text block with CRLF.");
} else if (content.includes(targetDoneTextLF)) {
  content = content.replace(targetDoneTextLF, replacementDoneText.replace(/\r?\n/g, '\n'));
  console.log("Successfully replaced done text block with LF.");
} else {
  console.log("Target done text block NOT found.");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");
