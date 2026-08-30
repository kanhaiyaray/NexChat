import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  message: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  voiceUrl: { type: String, default: "" },
  voiceDuration: { type: Number, default: null },
  
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  fileType: { type: String, default: "" },
  
  type: { 
    type: String, 
    enum: ["text", "image", "voice", "file"], 
    default: "text" 
  },
  timestamp: { type: Date, default: Date.now, index: true },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  reactions: { type: Map, of: Number, default: {} },
  replyTo: {
    messageId: { type: String, default: null },
    snippet: { type: String, default: null },
    sender: { type: String, default: null }
  },
  
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Message",
    index: true 
  },
  threadId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Message",
    index: true 
  },
  isThreadParent: { type: Boolean, default: false },
  replyCount: { type: Number, default: 0 }
}, { timestamps: false });

messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ message: "text" });
messageSchema.index({ timestamp: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ room: 1, type: 1, timestamp: -1 });
messageSchema.index({ threadId: 1, timestamp: 1 });
messageSchema.index({ parentId: 1, timestamp: 1 });
messageSchema.index({ isThreadParent: 1 });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;
