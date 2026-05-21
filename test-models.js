import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyA6ZG3w2VkaKXvakn6HkBXGRVpns4pLBnk";
// The SDK might not have listModels exposed directly if it's old, but let's try fetch directly.

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch(e) {
    console.error(e);
  }
}
listModels();
