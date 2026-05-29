// api/admin/activities.js — Vercel Serverless Function
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
};

const activitySchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  action:    { type: String, required: true },
  details:   { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ActivityModel =
  mongoose.models.Activity || mongoose.model('Activity', activitySchema);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const limit = parseInt(req.query?.limit) || 100;

    const activities = await ActivityModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    const mapped = activities.map(a => ({
      id:        a._id.toString(),
      userId:    a.userId,
      userName:  a.userName,
      action:    a.action,
      details:   a.details,
      createdAt: a.createdAt
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('❌ [MongoDB] Error fetching activities:', error);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
}
