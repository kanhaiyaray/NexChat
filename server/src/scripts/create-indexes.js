import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Message, UserProfile, PrivateRoom } from '../models/index.js';

dotenv.config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Message indexes for analytics queries
    console.log('📊 Creating Message indexes...');
    await Message.collection.createIndex({ timestamp: 1 });
    await Message.collection.createIndex({ type: 1 });
    await Message.collection.createIndex({ room: 1, type: 1, timestamp: -1 });
    console.log('✅ Message indexes created');

    // UserProfile indexes
    console.log('📊 Creating UserProfile indexes...');
    await UserProfile.collection.createIndex({ createdAt: 1 });
    await UserProfile.collection.createIndex({ status: 1 });
    await UserProfile.collection.createIndex({ lastSeen: 1 });
    console.log('✅ UserProfile indexes created');

    // PrivateRoom indexes
    console.log('📊 Creating PrivateRoom indexes...');
    await PrivateRoom.collection.createIndex({ createdAt: 1 });
    console.log('✅ PrivateRoom indexes created');

    console.log('🎉 All indexes created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
    process.exit(1);
  }
}

createIndexes();
