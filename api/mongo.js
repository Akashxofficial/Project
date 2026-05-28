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

// Define Schemas
const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const ActivityModel = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

const studentSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String },
  photoURL: { type: String, default: '' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  loginCount: { type: Number, default: 0 },
  lastLoginAt: { type: Date, default: null },
  subscriptionActive: { type: Boolean, default: false },
  subscriptionPlan: { type: String, default: 'Free' },
  subscriptionActivatedAt: { type: Date, default: null },
  subscriptionAmount: { type: Number, default: 0 },
  subscriptionUtr: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  utr: { type: String, required: true },
  status: { type: String, required: true },
  method: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
