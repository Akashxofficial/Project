import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Load .env
try {
  const envFile = readFileSync(".env", "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valParts] = line.split("=");
    if (key && valParts.length > 0 && !key.trim().startsWith("#")) {
      process.env[key.trim()] = valParts.join("=").trim();
    }
  });
  console.log("✅ Loaded .env file successfully.");
} catch (err) {
  console.error("❌ Failed to load .env file:", err.message);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'default');

async function checkChats() {
  try {
    console.log("Querying chat_sessions...");
    const q = query(collection(db, "chat_sessions"));
    const snap = await getDocs(q);
    console.log(`Fetched ${snap.size} documents.`);
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data().userId, doc.data().title);
    });
  } catch (e) {
    console.error("❌ Error fetching:", e.message);
  }
}

checkChats();
