async function testLiveApi() {
  const url = "https://project-14ez.vercel.app/api/generate";
  console.log(`Sending test request to live API: ${url}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: "Hello" })
    });

    console.log(`HTTP Status: ${response.status}`);
    const data = await response.json();
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

testLiveApi();
