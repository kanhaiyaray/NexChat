import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Message, UserProfile, PrivateRoom } from '../models/index.js';

dotenv.config();

async function createIndexes() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ─── MESSAGE INDEXES ──────────────────────────────────────────
    console.log('📊 Creating Message indexes...');
    
    await Message.collection.createIndex({ room: 1, timestamp: -1 });
    console.log('  ✅ Index: { room: 1, timestamp: -1 }');
    
    await Message.collection.createIndex({ message: 'text' });
    console.log('  ✅ Index: { message: "text" }');
    
    await Message.collection.createIndex({ timestamp: 1 });
    console.log('  ✅ Index: { timestamp: 1 }');
    
    await Message.collection.createIndex({ type: 1 });
    console.log('  ✅ Index: { type: 1 }');
    
    await Message.collection.createIndex({ room: 1, type: 1, timestamp: -1 });
    console.log('  ✅ Index: { room: 1, type: 1, timestamp: -1 }');
    
    await Message.collection.createIndex({ threadId: 1, timestamp: 1 });
    console.log('  ✅ Index: { threadId: 1, timestamp: 1 }');
    
    await Message.collection.createIndex({ parentId: 1, timestamp: 1 });
    console.log('  ✅ Index: { parentId: 1, timestamp: 1 }');
    
    await Message.collection.createIndex({ isThreadParent: 1 });
    console.log('  ✅ Index: { isThreadParent: 1 }');

    // ─── USER PROFILE INDEXES ─────────────────────────────────────
    console.log('📊 Creating UserProfile indexes...');
    
    await UserProfile.collection.createIndex({ clerkId: 1 });
    console.log('  ✅ Index: { clerkId: 1 }');
    
    await UserProfile.collection.createIndex({ username: 'text' });
    console.log('  ✅ Index: { username: "text" }');
    
    await UserProfile.collection.createIndex({ createdAt: 1 });
    console.log('  ✅ Index: { createdAt: 1 }');
    
    await UserProfile.collection.createIndex({ status: 1 });
    console.log('  ✅ Index: { status: 1 }');
    
    await UserProfile.collection.createIndex({ lastSeen: 1 });
    console.log('  ✅ Index: { lastSeen: 1 }');

    // ─── PRIVATE ROOM INDEXES ─────────────────────────────────────
    console.log('📊 Creating PrivateRoom indexes...');
    
    await PrivateRoom.collection.createIndex({ code: 1 });
    console.log('  ✅ Index: { code: 1 }');
    
    await PrivateRoom.collection.createIndex({ roomId: 1 });
    console.log('  ✅ Index: { roomId: 1 }');
    
    await PrivateRoom.collection.createIndex({ createdAt: 1 });
    console.log('  ✅ Index: { createdAt: 1 }');

    console.log('\n🎉 All indexes created successfully!');
    console.log('📊 Total indexes created: 12');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

createIndexes();
