import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import multer from "multer";

dotenv.config();

// ─── Cloudinary ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api.ping((err, result) => {
  if (err) {
    console.error("❌ Cloudinary ping failed:", err.message);
    console.warn("⚠️  Image uploads won't work until Cloudinary credentials are fixed.");
  } else {
    console.log("✅ Cloudinary connected:", result);
  }
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI not set — running with in-memory fallback only");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};

// ─── Message Schema (with replyTo and voice support) ───────────────────────────
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  message: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  voiceUrl: { type: String, default: "" },
  voiceDuration: { type: Number, default: null },
  type: { type: String, enum: ["text", "image", "voice"], default: "text" },
  timestamp: { type: Date, default: Date.now, index: true },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  reactions: { type: Map, of: Number, default: {} },
  replyTo: {
    messageId: { type: String, default: null },
    snippet: { type: String, default: null },
    sender: { type: String, default: null }
  }
}, { timestamps: false });

messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ message: "text" });
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// ─── Read Receipt Schema ──────────────────────────────────────────────────────
const readReceiptSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: String, required: true },
  readAt: { type: Date, default: Date.now }
});
readReceiptSchema.index({ room: 1, messageId: 1, userId: 1 }, { unique: true });
const ReadReceipt = mongoose.models.ReadReceipt || mongoose.model("ReadReceipt", readReceiptSchema);

// ─── PrivateRoom Schema (with pinnedMessages) ─────────────────────────────────
const privateRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },  // short invite code
  createdBy: { type: String, default: "anonymous" },
  createdAt: { type: Date, default: Date.now },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }]
});
const PrivateRoom = mongoose.models.PrivateRoom || mongoose.model("PrivateRoom", privateRoomSchema);

// ─── UserProfile Schema (UPDATED) ────────────────────────────────────────────
const userProfileSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  email: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  avatarColor: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 160 },
  statusEmoji: { type: String, default: '🌟' },
  statusText: { type: String, default: 'Available', maxlength: 40 },
  lastSeen: { type: Date, default: Date.now },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  hideOnlineStatus: { type: Boolean, default: false },
  hideReadReceipts: { type: Boolean, default: false },
  activityFeed: { type: [{
    message: String,
    timestamp: Date,
    roomId: String
  }], default: [] },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

userProfileSchema.index({ username: "text" });
const UserProfile = mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);

// ─── Helper functions for users ──────────────────────────────────────────────
async function getUserProfile(clerkId) {
  if (mongoose.connection.readyState !== 1) return null;
  return await UserProfile.findOne({ clerkId }).lean();
}

// UPDATED getOrCreateUserProfile with new fields
async function getOrCreateUserProfile(clerkId, username, email) {
  if (mongoose.connection.readyState !== 1) return null;

  let profile = await UserProfile.findOne({ clerkId });
  if (!profile) {
    const colorPalette = [
      "#3dd6f5", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#f87171",
      "#60a5fa", "#c084fc", "#fb923c", "#4ade80"
    ];
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

    profile = await UserProfile.create({
      clerkId,
      username,
      displayName: username,
      email: email || "",
      avatarColor: randomColor,
      bio: "",
      statusEmoji: '🌟',
      statusText: 'Available',
      visibility: 'public',
      hideOnlineStatus: false,
      hideReadReceipts: false,
    });
  } else {
    // Update username if changed
    if (profile.username !== username) {
      profile.username = username;
      // If displayName is empty or equals old username, update it
      if (!profile.displayName || profile.displayName === profile.username) {
        profile.displayName = username;
      }
    }
    if (email && profile.email !== email) {
      profile.email = email;
    }
    await profile.save();
  }
  return profile;
}

// ─── Short code generator ──────────────────────────────────────────────────
async function generateShortCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/l
  let code;
  let exists = true;
  while (exists) {
    code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check uniqueness in DB
    const found = await PrivateRoom.findOne({ code });
    if (!found) exists = false;
  }
  return code;
}

// ─── In‑memory code → roomId map ──────────────────────────────────────────────
const codeRoomMap = new Map();

async function resolveCode(code) {
  if (codeRoomMap.has(code)) return codeRoomMap.get(code);
  if (mongoose.connection.readyState === 1) {
    const doc = await PrivateRoom.findOne({ code }).lean();
    if (doc) {
      codeRoomMap.set(code, doc.roomId);
      return doc.roomId;
    }
  }
  return null;
}

const serializeMessage = (msg) => ({
  ...msg,
  id: msg._id.toString(),
});

const EDIT_WINDOW_MS = 5 * 60 * 1000;

async function fetchMessageContext(roomId, messageId, windowSize = 15) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return null;
  }

  const center = await Message.findOne({ _id: messageId, room: roomId }).lean();
  if (!center) {
    return null;
  }

  const earlierDocs = await Message
    .find({
      room: roomId,
      $or: [
        { timestamp: { $lt: center.timestamp } },
        { timestamp: center.timestamp, _id: { $lt: center._id } },
      ],
    })
    .sort({ timestamp: -1, _id: -1 })
    .limit(windowSize)
    .lean();

  const laterDocs = await Message
    .find({
      room: roomId,
      $or: [
        { timestamp: { $gt: center.timestamp } },
        { timestamp: center.timestamp, _id: { $gt: center._id } },
      ],
    })
    .sort({ timestamp: 1, _id: 1 })
    .limit(windowSize)
    .lean();

  const position = await Message.countDocuments({
    room: roomId,
    $or: [
      { timestamp: { $lt: center.timestamp } },
      { timestamp: center.timestamp, _id: { $lte: center._id } },
    ],
  });

  return {
    anchorId: center._id.toString(),
    position,
    messages: [
      ...earlierDocs.reverse().map(serializeMessage),
      serializeMessage(center),
      ...laterDocs.map(serializeMessage),
    ],
  };
}

// ─── Express + Socket.IO ──────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.CLIENT_ORIGIN
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

app.post("/api/create-chat", async (req, res) => {
  try {
    const roomId = `room_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const code = await generateShortCode();
    const createdBy = req.body?.userId || "anonymous";

    codeRoomMap.set(code, roomId);

    if (mongoose.connection.readyState === 1) {
      await PrivateRoom.create({ roomId, code, createdBy }).catch(err => {
        console.warn("PrivateRoom DB save warning:", err.message);
      });
    }

    const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const inviteLink = `${origin}/join/${code}`;

    console.log(`🔒 New private room created: ${roomId} (code: ${code})`);
    res.json({ roomId, code, inviteLink });
  } catch (err) {
    console.error("❌ Create chat error:", err.message);
    res.status(500).json({ error: "Failed to create private chat room." });
  }
});

app.get("/api/validate-code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 4) {
      return res.status(400).json({ error: "Invalid invite code format." });
    }

    const roomId = await resolveCode(code);
    if (!roomId) {
      return res.status(404).json({ error: "Invalid or expired invite code." });
    }

    res.json({ roomId, valid: true });
  } catch (err) {
    console.error("❌ Validate code error:", err.message);
    res.status(500).json({ error: "Code validation failed." });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const roomId = String(req.query.roomId || "");
    const query = String(req.query.q || "").trim();

    if (!code || code.length < 4) {
      return res.status(400).json({ error: "A valid room code is required." });
    }

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Search is unavailable right now." });
    }

    const resolvedRoomId = await resolveCode(code);
    if (!resolvedRoomId) {
      return res.status(404).json({ error: "Invalid or expired invite code." });
    }

    if (roomId && roomId !== resolvedRoomId) {
      return res.status(403).json({ error: "Search is only allowed in the active room." });
    }

    const results = await Message.find(
      {
        room: resolvedRoomId,
        type: "text",
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" }, timestamp: -1 })
      .limit(20)
      .lean();

    res.json({
      roomId: resolvedRoomId,
      query,
      results: results.map((msg) => ({
        id: msg._id.toString(),
        room: msg.room,
        sender: msg.sender,
        message: msg.message,
        timestamp: msg.timestamp,
      })),
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: "Search failed." });
  }
});

// ─── User Profile Endpoints ───────────────────────────────────────────────────
app.post("/api/webhook/clerk", express.json(), async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "user.created" || type === "user.updated") {
      const clerkId = data.id;
      const username = data.username || data.email_addresses?.[0]?.email_address?.split("@")[0] || "User";
      const email = data.email_addresses?.[0]?.email_address || "";

      await getOrCreateUserProfile(clerkId, username, email);
      console.log(`✅ User profile synced: ${username} (${clerkId})`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// UPDATED GET /api/user/profile/:clerkId with visibility control
app.get("/api/user/profile/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const requesterId = req.query.requesterId; // new
    if (!clerkId) {
      return res.status(400).json({ error: "clerkId required" });
    }

    const profile = await getUserProfile(clerkId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const isOwner = requesterId === clerkId;

    // Base response – always include public fields
    const response = {
      clerkId: profile.clerkId,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.avatarUrl,
      avatarColor: profile.avatarColor,
      statusEmoji: profile.statusEmoji,
      statusText: profile.statusText,
    };

    // Determine visibility of extra fields
    const canSeeFull = isOwner || profile.visibility === 'public' || profile.visibility === 'friends';
    if (canSeeFull) {
      response.bio = profile.bio;
      response.email = profile.email;
      response.lastSeen = profile.lastSeen;
      response.hideOnlineStatus = profile.hideOnlineStatus;
      response.hideReadReceipts = profile.hideReadReceipts;
      response.visibility = profile.visibility;
    } else {
      response.bio = null;
      response.email = null;
      response.lastSeen = null;
    }

    // Only return activityFeed if owner
    if (isOwner) {
      response.activityFeed = profile.activityFeed || [];
    }

    res.json(response);
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  }
});

// UPDATED POST /api/user/profile/:clerkId with new fields
app.post("/api/user/profile/:clerkId", upload.single("avatar"), async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { bio, status, avatarColor, displayName, statusEmoji, statusText, visibility, hideOnlineStatus, hideReadReceipts } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId required" });
    }

    let avatarUrl = null;

    if (req.file) {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(503).json({ error: "Avatar upload not configured" });
      }

      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: "nexchat_avatars",
        transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }]
      });
      avatarUrl = uploadResult.secure_url;
    }

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio?.slice(0, 160);
    if (status !== undefined) updateData.status = status?.slice(0, 40); // legacy field, keep for compatibility
    if (avatarColor !== undefined) updateData.avatarColor = avatarColor;
    if (avatarUrl !== null) updateData.avatarUrl = avatarUrl;
    // New fields
    if (displayName !== undefined) updateData.displayName = displayName.trim().slice(0, 40);
    if (statusEmoji !== undefined) updateData.statusEmoji = statusEmoji;
    if (statusText !== undefined) updateData.statusText = statusText.trim().slice(0, 40);
    if (visibility !== undefined) updateData.visibility = visibility;
    if (hideOnlineStatus !== undefined) updateData.hideOnlineStatus = hideOnlineStatus === 'true' || hideOnlineStatus === true;
    if (hideReadReceipts !== undefined) updateData.hideReadReceipts = hideReadReceipts === 'true' || hideReadReceipts === true;
    updateData.updatedAt = new Date();

    const profile = await UserProfile.findOneAndUpdate(
      { clerkId },
      updateData,
      { new: true, upsert: true }
    );

    // Broadcast profile update to all rooms where the user is present
    const userUpdate = {
      clerkId,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.avatarUrl,
      avatarColor: profile.avatarColor,
      statusEmoji: profile.statusEmoji,
      statusText: profile.statusText,
      hideOnlineStatus: profile.hideOnlineStatus,
      bio: profile.bio,
      lastSeen: profile.lastSeen,
    };

    for (const [roomId, users] of Object.entries(rooms)) {
      const userInRoom = users.some(u => u.username === profile.username);
      if (userInRoom) {
        io.to(roomId).emit("user_profile_updated", userUpdate);
      }
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

app.post("/api/user/profiles/batch", express.json(), async (req, res) => {
  try {
    const { clerkIds } = req.body;
    if (!clerkIds || !Array.isArray(clerkIds)) {
      return res.status(400).json({ error: "clerkIds array required" });
    }

    const profiles = await UserProfile.find({ clerkId: { $in: clerkIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.clerkId] = {
        avatarUrl: p.avatarUrl,
        avatarColor: p.avatarColor,
        bio: p.bio,
        status: p.status,
        username: p.username,
        displayName: p.displayName,
        statusEmoji: p.statusEmoji,
        statusText: p.statusText,
        hideOnlineStatus: p.hideOnlineStatus,
        lastSeen: p.lastSeen,
      };
    });

    res.json(profileMap);
  } catch (err) {
    console.error("Batch profiles error:", err.message);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

app.post("/api/user/sync/:clerkId", express.json(), async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { username, email, avatarUrl } = req.body;

    if (!clerkId || !username) {
      return res.status(400).json({ error: "clerkId and username required" });
    }

    let profile = await UserProfile.findOne({ clerkId });

    if (!profile) {
      const colorPalette = [
        "#3dd6f5", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#f87171",
        "#60a5fa", "#c084fc", "#fb923c", "#4ade80"
      ];
      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

      profile = await UserProfile.create({
        clerkId,
        username,
        displayName: username,
        email: email || "",
        avatarUrl: avatarUrl || "",
        avatarColor: randomColor,
        bio: "",
        statusEmoji: '🌟',
        statusText: 'Available',
        visibility: 'public',
        hideOnlineStatus: false,
        hideReadReceipts: false,
      });
    } else {
      let needsUpdate = false;
      if (profile.username !== username) {
        profile.username = username;
        if (!profile.displayName || profile.displayName === profile.username) {
          profile.displayName = username;
        }
        needsUpdate = true;
      }
      if (email && profile.email !== email) {
        profile.email = email;
        needsUpdate = true;
      }
      if (avatarUrl && !profile.avatarUrl) {
        profile.avatarUrl = avatarUrl;
        needsUpdate = true;
      }
      if (needsUpdate) {
        profile.updatedAt = new Date();
        await profile.save();
      }
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error("Manual sync error:", err.message);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// ─── In‑memory room user tracker (UPDATED addUser) ──────────────────────────
const rooms = {};

const getUsers = (room) => rooms[room] || [];

// UPDATED addUser to accept full user data object
const addUser = (room, id, userData) => {
  if (!rooms[room]) rooms[room] = [];
  // remove old entry with same username
  rooms[room] = rooms[room].filter(u => u.username !== userData.username);
  rooms[room].push({ id, ...userData });
};

const removeUser = (room, id) => {
  if (!rooms[room]) return;
  rooms[room] = rooms[room].filter(u => u.id !== id);
  if (rooms[room].length === 0) delete rooms[room];
};

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join_room", async ({ username, code, clerkId }) => {
    if (!code) {
      socket.emit("join_error", {
        message: "An invite code is required. Please use a valid invite link.",
      });
      return;
    }

    let actualRoom;
    try {
      actualRoom = await resolveCode(code);
    } catch (err) {
      console.error("Code resolution error:", err.message);
      socket.emit("join_error", { message: "Server error. Please try again." });
      return;
    }

    if (!actualRoom) {
      socket.emit("join_error", {
        message: "Invalid or expired invite code. Ask the host for a new link.",
      });
      return;
    }

    if (currentRoom) {
      socket.leave(currentRoom);
      removeUser(currentRoom, socket.id);
      io.to(currentRoom).emit("update_users", getUsers(currentRoom));
    }

    currentRoom = actualRoom;
    currentUser = username;

    // ── Get or create profile and add user with full data ──
    const profile = await getOrCreateUserProfile(clerkId, username, "");
    if (profile) {
      const userData = {
        username: profile.username,
        clerkId: profile.clerkId,
        displayName: profile.displayName || profile.username,
        statusEmoji: profile.statusEmoji,
        statusText: profile.statusText,
        hideOnlineStatus: profile.hideOnlineStatus,
        avatarUrl: profile.avatarUrl,
        avatarColor: profile.avatarColor,
        // lastSeen will be sent separately, but we store it anyway
        lastSeen: profile.lastSeen,
      };
      addUser(actualRoom, socket.id, userData);
      // update lastSeen
      profile.lastSeen = new Date();
      await profile.save();
    } else {
      // fallback: add with minimal data
      addUser(actualRoom, socket.id, { username, clerkId, displayName: username });
    }

    socket.join(actualRoom);
    io.to(actualRoom).emit("update_users", getUsers(actualRoom));

    socket.emit("room_joined", { roomId: actualRoom });

    try {
      if (mongoose.connection.readyState === 1) {
        const history = await Message
          .find({ room: actualRoom })
          .sort({ timestamp: 1 })
          .limit(50)
          .lean();
        const historyWithStrId = history.map(serializeMessage);
        const messagesWithReceipts = await Promise.all(historyWithStrId.map(async (msg) => {
          const readers = await ReadReceipt.distinct("userId", { room: actualRoom, messageId: msg.id });
          return { ...msg, readBy: readers, readCount: readers.length };
        }));
        socket.emit("chat_history", messagesWithReceipts);
      } else {
        socket.emit("chat_history", []);
      }
    } catch (err) {
      console.error("History fetch error:", err.message);
      socket.emit("chat_history", []);
    }
  });

  // ── Text Message (UPDATED to update activity feed) ──────────────────────
  socket.on("send_message", async (data) => {
    let savedMsg = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedMsg = await new Message({
          room: data.room,
          sender: data.sender,
          message: data.message,
          type: "text",
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          edited: false,
          editedAt: null,
          replyTo: data.replyTo || null
        }).save();
        await ReadReceipt.findOneAndUpdate(
          { room: data.room, messageId: savedMsg._id, userId: data.sender },
          { readAt: new Date() },
          { upsert: true }
        );

        // Update activity feed and lastSeen for the sender
        if (data.clerkId) {
          await UserProfile.updateOne(
            { clerkId: data.clerkId },
            {
              $push: {
                activityFeed: {
                  $each: [{ message: data.message, timestamp: new Date(), roomId: data.room }],
                  $slice: -20
                }
              },
              $set: { lastSeen: new Date() }
            }
          );
        }
      } catch (err) {
        console.error("Message save error:", err.message);
      }
    }

    const finalMessage = {
      id: savedMsg ? savedMsg._id.toString() : data.id,
      room: data.room,
      sender: data.sender,
      message: data.message,
      type: "text",
      timestamp: data.timestamp || new Date().toISOString(),
      imageUrl: "",
      voiceUrl: "",
      voiceDuration: null,
      edited: savedMsg?.edited || false,
      editedAt: savedMsg?.editedAt || null,
      reactions: savedMsg?.reactions || {},
      replyTo: data.replyTo || null
    };

    io.to(data.room).emit("receive_message", finalMessage);
  });

  // ── Image Upload ────────────────────────────────────────────────────────────
  socket.on("send_image", async (data) => {
    const { room, imageBase64, sender, timestamp, id, clerkId } = data;

    if (!imageBase64 || !imageBase64.startsWith("data:image")) {
      socket.emit("image_error", { message: "Invalid image format." });
      return;
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      socket.emit("image_error", { message: "Image storage is not configured on the server." });
      return;
    }

    try {
      const uploaded = await cloudinary.uploader.upload(imageBase64, {
        folder: "nexchat",
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      });

      let savedMsg = null;
      if (mongoose.connection.readyState === 1) {
        savedMsg = await new Message({
          room, sender,
          imageUrl: uploaded.secure_url,
          type: "image",
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          edited: false,
          editedAt: null,
        }).save();

        // Update activity feed
        if (clerkId) {
          await UserProfile.updateOne(
            { clerkId },
            {
              $push: {
                activityFeed: {
                  $each: [{ message: "📷 Image shared", timestamp: new Date(), roomId: room }],
                  $slice: -20
                }
              },
              $set: { lastSeen: new Date() }
            }
          );
        }
      }

      const finalMessage = {
        id: savedMsg ? savedMsg._id.toString() : id,
        room, sender,
        imageUrl: uploaded.secure_url,
        type: "image",
        timestamp: timestamp || new Date().toISOString(),
        message: "",
        voiceUrl: "",
        voiceDuration: null,
        edited: savedMsg?.edited || false,
        editedAt: savedMsg?.editedAt || null,
        reactions: savedMsg?.reactions || {}
      };

      io.to(room).emit("receive_image", finalMessage);
    } catch (err) {
      console.error("Cloudinary error:", err.message);
      socket.emit("image_error", { message: "Image upload failed. Check Cloudinary credentials." });
    }
  });

  // ── Voice Message Upload ────────────────────────────────────────────────────
  socket.on("send_voice", async (data) => {
    const { room, audioBase64, sender, timestamp, duration, id, clerkId } = data;

    if (!audioBase64 || !audioBase64.startsWith("data:audio")) {
      socket.emit("voice_error", { message: "Invalid audio format." });
      return;
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      socket.emit("voice_error", { message: "Voice storage is not configured on the server." });
      return;
    }

    try {
      const uploaded = await cloudinary.uploader.upload(audioBase64, {
        folder: "nexchat_voice",
        resource_type: "auto",
        format: "mp3",
      });

      let savedMsg = null;
      if (mongoose.connection.readyState === 1) {
        savedMsg = await new Message({
          room,
          sender,
          voiceUrl: uploaded.secure_url,
          voiceDuration: duration,
          type: "voice",
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          edited: false,
          editedAt: null,
        }).save();

        if (clerkId) {
          await UserProfile.updateOne(
            { clerkId },
            {
              $push: {
                activityFeed: {
                  $each: [{ message: "🎤 Voice message", timestamp: new Date(), roomId: room }],
                  $slice: -20
                }
              },
              $set: { lastSeen: new Date() }
            }
          );
        }
      }

      const finalMessage = {
        id: savedMsg ? savedMsg._id.toString() : id,
        room,
        sender,
        voiceUrl: uploaded.secure_url,
        voiceDuration: duration,
        type: "voice",
        timestamp: timestamp || new Date().toISOString(),
        message: "",
        imageUrl: "",
        edited: savedMsg?.edited || false,
        editedAt: savedMsg?.editedAt || null,
        reactions: savedMsg?.reactions || {}
      };

      io.to(room).emit("receive_voice", finalMessage);
    } catch (err) {
      console.error("Cloudinary voice error:", err.message);
      socket.emit("voice_error", { message: "Voice upload failed. Please try again." });
    }
  });

  // ── Emoji Reactions ─────────────────────────────────────────────────────────
  socket.on("message_reaction", async ({ room, msgId, emoji }) => {
    io.to(room).emit("update_reaction", { msgId, emoji });

    try {
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(msgId)) {
        await Message.findByIdAndUpdate(
          msgId,
          { $inc: { [`reactions.${emoji}`]: 1 } },
          { new: true }
        );
      }
    } catch (err) {
      console.warn("Reaction update failed (non‑fatal):", err.message);
    }
  });

  // ── Message Deletion ────────────────────────────────────────────────────────
  socket.on("delete_message", async ({ room, msgId, username }) => {
    if (currentUser !== username) {
      socket.emit("delete_error", { message: "Not authorized" });
      return;
    }
    try {
      if (mongoose.connection.readyState === 1) {
        const msg = await Message.findById(msgId);
        if (msg && msg.sender === username) {
          await Message.deleteOne({ _id: msgId });
          io.to(room).emit("message_deleted", { msgId });
        } else if (msg && msg.sender !== username) {
          socket.emit("delete_error", { message: "Cannot delete other user's message" });
        } else {
          io.to(room).emit("message_deleted", { msgId });
        }
      } else {
        io.to(room).emit("message_deleted", { msgId });
      }
    } catch (err) {
      console.error("Delete error:", err.message);
      socket.emit("delete_error", { message: "Failed to delete message" });
    }
  });

  // ── Edit Message ────────────────────────────────────────────────────────────
  socket.on("edit_message", async ({ room, msgId, newMessage, sender }) => {
    const trimmedMessage = String(newMessage || "").trim();

    if (!room || !msgId || !sender) {
      socket.emit("edit_error", { message: "Missing edit details." });
      return;
    }

    if (!trimmedMessage) {
      socket.emit("edit_error", { message: "Message cannot be empty." });
      return;
    }

    if (trimmedMessage.length > 5000) {
      socket.emit("edit_error", { message: "Message is too long to edit." });
      return;
    }

    if (currentUser !== sender) {
      socket.emit("edit_error", { message: "Not authorized" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      socket.emit("edit_error", { message: "Editing is unavailable right now." });
      return;
    }

    try {
      const msg = await Message.findById(msgId);

      if (!msg || msg.room !== room) {
        socket.emit("edit_error", { message: "Message not found." });
        return;
      }

      if (msg.type !== "text") {
        socket.emit("edit_error", { message: "Only text messages can be edited." });
        return;
      }

      if (msg.sender !== sender) {
        socket.emit("edit_error", { message: "You can only edit your own messages." });
        return;
      }

      if (Date.now() - new Date(msg.timestamp).getTime() > EDIT_WINDOW_MS) {
        socket.emit("edit_error", { message: "Editing is only allowed within 5 minutes." });
        return;
      }

      msg.message = trimmedMessage;
      msg.edited = true;
      msg.editedAt = new Date();
      await msg.save();

      io.to(room).emit("message_edited", {
        msgId: msg._id.toString(),
        message: msg.message,
        edited: msg.edited,
        editedAt: msg.editedAt,
      });
    } catch (err) {
      console.error("Edit error:", err.message);
      socket.emit("edit_error", { message: "Failed to edit message." });
    }
  });

  // ─── Load Message Context ───────────────────────────────────────────────────
  socket.on("load_message_context", async ({ code, messageId }) => {
    try {
      if (!code || !messageId) {
        socket.emit("message_context_error", { message: "Code and message id are required." });
        return;
      }

      const actualRoom = await resolveCode(code);
      if (!actualRoom || actualRoom !== currentRoom) {
        socket.emit("message_context_error", { message: "You are not authorized for this room." });
        return;
      }

      if (mongoose.connection.readyState !== 1) {
        socket.emit("message_context_error", { message: "Message history is unavailable right now." });
        return;
      }

      const context = await fetchMessageContext(actualRoom, messageId);
      if (!context) {
        socket.emit("message_context_error", { message: "Message not found." });
        return;
      }

      socket.emit("message_context", context);
    } catch (err) {
      console.error("Message context error:", err.message);
      socket.emit("message_context_error", { message: "Could not load the selected message." });
    }
  });

  // ─── Typing Indicators ──────────────────────────────────────────────────────
  socket.on("typing_start", ({ room, username }) => {
    socket.to(room).emit("user_typing", { username, isTyping: true });
  });

  socket.on("typing_stop", ({ room }) => {
    socket.to(room).emit("user_typing", { username: currentUser, isTyping: false });
  });

  // ─── Pin a message (max 5 per room) ─────────────────────────────────────────
  socket.on("pin_message", async ({ room, msgId, username }) => {
    if (!currentRoom || currentUser !== username) {
      socket.emit("pin_error", { message: "Not authorized" });
      return;
    }

    try {
      const privateRoom = await PrivateRoom.findOne({ roomId: room });
      if (!privateRoom) return;

      if (privateRoom.pinnedMessages.length >= 5) {
        socket.emit("pin_error", { message: "Maximum 5 pinned messages per room." });
        return;
      }

      if (!privateRoom.pinnedMessages.includes(msgId)) {
        privateRoom.pinnedMessages.push(msgId);
        await privateRoom.save();

        const pinnedMsg = await Message.findById(msgId).lean();
        io.to(room).emit("message_pinned", {
          message: serializeMessage(pinnedMsg),
          pinnedCount: privateRoom.pinnedMessages.length
        });
      }
    } catch (err) {
      console.error("Pin error:", err.message);
      socket.emit("pin_error", { message: "Could not pin message." });
    }
  });

  // ─── Unpin a message ────────────────────────────────────────────────────────
  socket.on("unpin_message", async ({ room, msgId, username }) => {
    if (!currentRoom || currentUser !== username) {
      socket.emit("pin_error", { message: "Not authorized" });
      return;
    }

    try {
      const privateRoom = await PrivateRoom.findOne({ roomId: room });
      if (!privateRoom) return;

      privateRoom.pinnedMessages = privateRoom.pinnedMessages.filter(id => id.toString() !== msgId);
      await privateRoom.save();

      io.to(room).emit("message_unpinned", {
        msgId,
        pinnedCount: privateRoom.pinnedMessages.length
      });
    } catch (err) {
      console.error("Unpin error:", err.message);
      socket.emit("pin_error", { message: "Could not unpin message." });
    }
  });

  // ─── Get all pinned messages for a room ─────────────────────────────────────
  socket.on("get_pinned_messages", async ({ room }) => {
    try {
      const privateRoom = await PrivateRoom.findOne({ roomId: room }).populate("pinnedMessages");
      if (!privateRoom) {
        socket.emit("pinned_messages_list", []);
        return;
      }
      const pinned = privateRoom.pinnedMessages.map(serializeMessage);
      socket.emit("pinned_messages_list", pinned);
    } catch (err) {
      console.error("Fetch pinned error:", err.message);
      socket.emit("pinned_messages_list", []);
    }
  });

  // ─── Read Receipts (UPDATED to respect hideReadReceipts) ──────────────────
  socket.on("message_read", async ({ room, msgId, username }) => {
    if (!room || !msgId || !username) return;
    try {
      // Check if user wants to hide read receipts
      const profile = await UserProfile.findOne({ username });
      if (profile && profile.hideReadReceipts) {
        // Still record the receipt for internal use but don't emit
        await ReadReceipt.findOneAndUpdate(
          { room, messageId: msgId, userId: username },
          { readAt: new Date() },
          { upsert: true }
        );
        return;
      }

      // Otherwise, record and emit
      await ReadReceipt.findOneAndUpdate(
        { room, messageId: msgId, userId: username },
        { readAt: new Date() },
        { upsert: true }
      );
      const readers = await ReadReceipt.distinct("userId", { room, messageId: msgId });
      io.to(room).emit("receipts_updated", {
        msgId,
        readBy: readers,
        count: readers.length
      });
    } catch (err) {
      console.error("Read receipt error:", err.message);
    }
  });

  // ─── Disconnect (UPDATED to update lastSeen) ──────────────────────────────
  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    if (currentRoom) {
      removeUser(currentRoom, socket.id);
      io.to(currentRoom).emit("update_users", getUsers(currentRoom));
      // update lastSeen for this user
      if (currentUser) {
        (async () => {
          try {
            await UserProfile.findOneAndUpdate(
              { username: currentUser },
              { $set: { lastSeen: new Date() } }
            );
          } catch (err) {
            console.warn("Failed to update lastSeen on disconnect:", err.message);
          }
        })();
      }
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 1000;
(async () => {
  await connectDB();
  server.listen(PORT, () => console.log(`🚀 NexChat server running on port ${PORT}`));
})();