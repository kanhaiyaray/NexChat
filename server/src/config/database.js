import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set — running with in-memory fallback only');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

export const getDBStatus = () => {
  return mongoose.connection.readyState === 1 ? 'connected' :
         mongoose.connection.readyState === 0 ? 'disconnected' : 'connecting';
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 MongoDB disconnected');
  }
};

export default { connectDB, getDBStatus, disconnectDB };
