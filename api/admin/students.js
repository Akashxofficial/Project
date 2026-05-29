// api/admin/students.js — Vercel Serverless Function
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
};

const studentSchema = new mongoose.Schema({
  uid:                     { type: String,  required: true, unique: true },
  email:                   { type: String,  required: true },
  displayName:             { type: String },
  photoURL:                { type: String,  default: '' },
  xp:                      { type: Number,  default: 0 },
  level:                   { type: Number,  default: 1 },
  streak:                  { type: Number,  default: 0 },
  loginCount:              { type: Number,  default: 0 },
  lastLoginAt:             { type: Date,    default: null },
  subscriptionActive:      { type: Boolean, default: false },
  subscriptionPlan:        { type: String,  default: 'Free' },
  subscriptionActivatedAt: { type: Date,    default: null },
  subscriptionAmount:      { type: Number,  default: 0 },
  subscriptionUtr:         { type: String,  default: '' },
  createdAt:               { type: Date,    default: Date.now },
  updatedAt:               { type: Date,    default: Date.now }
});

const StudentModel =
  mongoose.models.Student || mongoose.model('Student', studentSchema);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const limit = parseInt(req.query?.limit) || 500;

    const students = await StudentModel.find({})
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .limit(limit);

    return res.status(200).json(students);
  } catch (error) {
    console.error('❌ [MongoDB] Error fetching students:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
}
