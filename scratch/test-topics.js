async function run() {
  const prompt = `You are a CBSE and RBSE board syllabus expert. 
Generate a list of exactly 4 to 6 core chronological sub-topics or key concepts for Class 10, CBSE Board, Subject: Chemistry, Chapter: "Chemical Reactions and Equations".
Return ONLY a valid JSON array of strings, where each string represents a specific chronological sub-topic or key concept.
Do not include any markdown, code blocks, or conversational text. Output raw JSON only. E.g.:
["Topic 1", "Topic 2", "Topic 3", "Topic 4"]`;

  try {
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
