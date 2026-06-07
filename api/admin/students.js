// api/admin/students.js — Vercel Serverless Function
import { connectDB, StudentModel } from '../mongo.js';

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
