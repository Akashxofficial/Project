// api/db.js — Vercel Serverless Function: MongoDB-backed DB proxy (replaces all Firestore client calls)
import { connectDB, ChatSessionModel, SavedMaterialModel, UserProfileModel } from './_mongo.js';

// Strip base64 image data from messages to keep document size reasonable
const sanitizeMessages = (messages) => {
  if (!messages || !Array.isArray(messages)) return [];
  return messages.map(m => {
    const clean = {};
    Object.keys(m).forEach(k => {
      if (m[k] === undefined) return;
      if (k === 'image' && m.image) {
        const cleanImg = { ...m.image };
        delete cleanImg.data;
        delete cleanImg.url;
        clean.image = cleanImg;
      } else {
        clean[k] = m[k];
      }
    });
    return clean;
  });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'DB connection failed', details: err.message });
  }

  const action = req.query.action;

  // ─── CHAT SESSIONS ───────────────────────────────────────────────────────────

  // POST /api/db/chats/save — upsert a chat session
  if (action === 'save-chat') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, sessionId, title, messages } = req.body;
    if (!userId || userId === 'guest' || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      await ChatSessionModel.findOneAndUpdate(
        { sessionId },
        { userId, sessionId, title: title || 'New Chat', messages: sanitizeMessages(messages), deleted: false, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET /api/db/chats?userId=xxx — fetch all non-deleted sessions
  if (action === 'get-chats') {
    if (req.method !== 'GET') return res.status(405).end();
    const { userId } = req.query;
    if (!userId || userId === 'guest') return res.status(200).json([]);
    try {
      const sessions = await ChatSessionModel
        .find({ userId, deleted: { $ne: true } })
        .sort({ updatedAt: -1 })
        .lean();
      return res.status(200).json(sessions);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST /api/db/chats/delete — soft delete a session
  if (action === 'delete-chat') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) return res.status(400).json({ error: 'Missing fields' });
    try {
      await ChatSessionModel.findOneAndUpdate(
        { sessionId, userId },
        { deleted: true, updatedAt: new Date() }
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ─── SAVED DOCUMENTS ─────────────────────────────────────────────────────────

  // POST /api/db/documents/save — upsert a saved material
  if (action === 'save-doc') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, docId, type, title, content } = req.body;
    if (!userId || userId === 'guest' || !docId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      await SavedMaterialModel.findOneAndUpdate(
        { docId },
        { userId, docId, type, title, content },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET /api/db/documents?userId=xxx — fetch all documents for a user
  if (action === 'get-docs') {
    if (req.method !== 'GET') return res.status(405).end();
    const { userId } = req.query;
    if (!userId || userId === 'guest') return res.status(200).json([]);
    try {
      const docs = await SavedMaterialModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json(docs);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE /api/db/documents — delete a document
  if (action === 'delete-doc') {
    if (req.method !== 'DELETE') return res.status(405).end();
    const { userId, docId } = req.body;
    if (!userId || !docId) return res.status(400).json({ error: 'Missing fields' });
    try {
      await SavedMaterialModel.deleteOne({ docId, userId });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ─── USER PROFILES ───────────────────────────────────────────────────────────

  // POST /api/db/profile/save — upsert user profile / gamification data
  if (action === 'save-profile') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, data } = req.body;
    if (!userId || userId === 'guest') {
      return res.status(400).json({ error: 'Missing userId' });
    }
    try {
      await UserProfileModel.findOneAndUpdate(
        { userId },
        { userId, profileData: data || {}, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET /api/db/profile?userId=xxx — fetch user profile
  if (action === 'get-profile') {
    if (req.method !== 'GET') return res.status(405).end();
    const { userId } = req.query;
    if (!userId || userId === 'guest') return res.status(200).json({});
    try {
      const profile = await UserProfileModel.findOne({ userId }).lean();
      return res.status(200).json(profile ? profile.profileData : {});
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}
