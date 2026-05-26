import express from 'express';
import handler from './api/generate.js';

const app = express();

// Parse JSON request bodies with larger limit for images
app.use(express.json({ limit: '10mb' }));

// Map POST /api/generate directly to Vercel handler
app.post('/api/generate', handler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 TaniOS Local Backend Server running on http://localhost:${PORT}`);
});
