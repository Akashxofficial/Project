import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tanios';

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI);
    console.log(`🍃 [MongoDB] Connected successfully to ${MONGODB_URI}`);
  } catch (error) {
    console.error('❌ [MongoDB] Connection error:', error);
  }
};

// ── Activity Schema ───────────────────────────────────────────────────────────
const activitySchema = new mongoose.Schema({
  userId:   { type: String, required: true },
  userName: { type: String, required: true },
  action:   { type: String, required: true },
  details:  { type: String },
  createdAt:{ type: Date, default: Date.now }
});
export const ActivityModel = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

// ── Student Schema ────────────────────────────────────────────────────────────
const studentSchema = new mongoose.Schema({
  uid:         { type: String, required: true, unique: true },
  email:       { type: String, required: true },
  displayName: { type: String },
  photoURL:    { type: String, default: '' },
  xp:          { type: Number, default: 0 },
  level:       { type: Number, default: 1 },
  streak:      { type: Number, default: 0 },
  loginCount:  { type: Number, default: 0 },
  lastLoginAt: { type: Date,   default: null },
  subscriptionActive:      { type: Boolean, default: false },
  subscriptionPlan:        { type: String,  default: 'Free' },
  subscriptionActivatedAt: { type: Date,    default: null },
  subscriptionAmount:      { type: Number,  default: 0 },
  subscriptionUtr:         { type: String,  default: '' },
  welcomeEmailSent:        { type: Boolean, default: false },
  lastEmailSentAt:         { type: Date,    default: null },
  emailOptOut:             { type: Boolean, default: false },
  notificationPrefs: {
    streakReminder: { type: Boolean, default: true },
    studyReminder:  { type: Boolean, default: true },
    announcements:  { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
export const StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);

// ── Payment Schema ────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userEmail: { type: String, required: true },
  amount:    { type: Number, required: true },
  utr:       { type: String, required: true },
  status:    { type: String, required: true },
  method:    { type: String },
  createdAt: { type: Date, default: Date.now }
});
export const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

// ── Chat Sessions (replaces Firestore chat_sessions) ─────────────────────────
const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId:    { type: String, required: true, index: true },
  title:     { type: String, default: 'New Chat' },
  messages:  { type: mongoose.Schema.Types.Mixed, default: [] },
  deleted:   { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
export const ChatSessionModel = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);

// ── Saved Materials (replaces Firestore saved_materials) ─────────────────────
const savedMaterialSchema = new mongoose.Schema({
  docId:     { type: String, required: true, unique: true },
  userId:    { type: String, required: true, index: true },
  type:      { type: String, required: true },
  title:     { type: String, required: true },
  content:   { type: mongoose.Schema.Types.Mixed, default: '' },
  createdAt: { type: Date, default: Date.now }
});
export const SavedMaterialModel = mongoose.models.SavedMaterial || mongoose.model('SavedMaterial', savedMaterialSchema);

// ── User Profiles / Gamification (replaces Firestore user_profiles) ──────────
const userProfileSchema = new mongoose.Schema({
  userId:      { type: String, required: true, unique: true },
  profileData: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt:   { type: Date, default: Date.now }
});
export const UserProfileModel = mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);
