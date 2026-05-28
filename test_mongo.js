fetch("http://localhost:3001/api/track/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uid: "test-uid-123", email: "akash@test.com", displayName: "Akash" })
}).then(res => res.json()).then(console.log).catch(console.error);
