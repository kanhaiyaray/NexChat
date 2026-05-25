import express      from "express";
import http         from "http";
import { Server }   from "socket.io";
import cors         from "cors";
import dotenv       from "dotenv";
import mongoose     from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

dotenv.config();

// ─── Cloudinary ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
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

// ─── Message Schema (with replyTo) ───────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  room:      { type: String, required: true, index: true },
  sender:    { type: String, required: true },
  message:   { type: String, default: "" },
  imageUrl:  { type: String, default: "" },
  type:      { type: String, enum: ["text", "image"], default: "text" },
  timestamp: { type: Date, default: Date.now, index: true },
  edited:    { type: Boolean, default: false },
  editedAt:  { type: Date, default: null },
  reactions: { type: Map, of: Number, default: {} },
  replyTo:   {
    messageId: { type: String, default: null },
    snippet:   { type: String, default: null },
    sender:    { type: String, default: null }
  }
}, { timestamps: false });

messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ message: "text" });
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// ─── PrivateRoom Schema ───────────────────────────────────────────────────────
const privateRoomSchema = new mongoose.Schema({
  roomId:    { type: String, required: true, unique: true },
  token:     { type: String, required: true, unique: true },
  createdBy: { type: String, default: "anonymous" },
  createdAt: { type: Date,   default: Date.now },
});
const PrivateRoom =
  mongoose.models.PrivateRoom || mongoose.model("PrivateRoom", privateRoomSchema);

// ─── In‑memory token → roomId map ────────────────────────────────────────────
const tokenRoomMap = new Map();

async function resolveToken(token) {
  if (tokenRoomMap.has(token)) return tokenRoomMap.get(token);
  if (mongoose.connection.readyState === 1) {
    const doc = await PrivateRoom.findOne({ token }).lean();
    if (doc) {
      tokenRoomMap.set(token, doc.roomId);
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
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

app.post("/api/create-chat", async (req, res) => {
  try {
    const roomId    = `room_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const token     = randomUUID().replace(/-/g, "");
    const createdBy = req.body?.userId || "anonymous";

    tokenRoomMap.set(token, roomId);

    if (mongoose.connection.readyState === 1) {
      await PrivateRoom.create({ roomId, token, createdBy }).catch(err => {
        console.warn("PrivateRoom DB save warning:", err.message);
      });
    }

    const origin     = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const inviteLink = `${origin}?token=${token}`;

    console.log(`🔒 New private room created: ${roomId}`);
    res.json({ roomId, token, inviteLink });
  } catch (err) {
    console.error("❌ Create chat error:", err.message);
    res.status(500).json({ error: "Failed to create private chat room." });
  }
});

app.get("/api/validate-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 8) {
      return res.status(400).json({ error: "Invalid token format." });
    }

    const roomId = await resolveToken(token);
    if (!roomId) {
      return res.status(404).json({ error: "Invalid or expired invite link." });
    }

    res.json({ roomId, valid: true });
  } catch (err) {
    console.error("❌ Validate token error:", err.message);
    res.status(500).json({ error: "Token validation failed." });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    const roomId = String(req.query.roomId || "");
    const query = String(req.query.q || "").trim();

    if (!token || token.length < 8) {
      return res.status(400).json({ error: "A valid room token is required." });
    }

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Search is unavailable right now." });
    }

    const resolvedRoomId = await resolveToken(token);
    if (!resolvedRoomId) {
      return res.status(404).json({ error: "Invalid or expired invite link." });
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

// ─── In‑memory room user tracker (with duplicate prevention by username) ─────
const rooms = {};

const getUsers = (room) => rooms[room] || [];

const addUser = (room, id, username) => {
  if (!rooms[room]) rooms[room] = [];
  // 🔥 FIX: Remove any existing entry with the same username (prevents duplicates)
  rooms[room] = rooms[room].filter(u => u.username !== username);
  // Add the new socket
  rooms[room].push({ id, username });
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

  socket.on("join_room", async ({ username, token }) => {
    if (!token) {
      socket.emit("join_error", {
        message: "An invite token is required. Please use a valid invite link.",
      });
      return;
    }

    let actualRoom;
    try {
      actualRoom = await resolveToken(token);
    } catch (err) {
      console.error("Token resolution error:", err.message);
      socket.emit("join_error", { message: "Server error. Please try again." });
      return;
    }

    if (!actualRoom) {
      socket.emit("join_error", {
        message: "Invalid or expired invite link. Ask the host for a new link.",
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

    socket.join(actualRoom);
    addUser(actualRoom, socket.id, username);
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
        socket.emit("chat_history", historyWithStrId);
      } else {
        socket.emit("chat_history", []);
      }
    } catch (err) {
      console.error("History fetch error:", err.message);
      socket.emit("chat_history", []);
    }
  });

  // ── Text Message (supports replyTo) ─────────────────────────────────────────
  socket.on("send_message", async (data) => {
    let savedMsg = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedMsg = await new Message({
          room:      data.room,
          sender:    data.sender,
          message:   data.message,
          type:      "text",
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          edited:    false,
          editedAt:  null,
          replyTo:   data.replyTo || null
        }).save();
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
      edited: savedMsg?.edited || false,
      editedAt: savedMsg?.editedAt || null,
      reactions: savedMsg?.reactions || {},
      replyTo: data.replyTo || null
    };

    io.to(data.room).emit("receive_message", finalMessage);
  });

  // ── Image Upload ────────────────────────────────────────────────────────────
  socket.on("send_image", async (data) => {
    const { room, imageBase64, sender, timestamp, id } = data;

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
        folder:         "nexchat",
        resource_type:  "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      });

      let savedMsg = null;
      if (mongoose.connection.readyState === 1) {
        savedMsg = await new Message({
          room, sender,
          imageUrl:  uploaded.secure_url,
          type:      "image",
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          edited:    false,
          editedAt:  null,
        }).save();
      }

      const finalMessage = {
        id: savedMsg ? savedMsg._id.toString() : id,
        room, sender,
        imageUrl: uploaded.secure_url,
        type: "image",
        timestamp: timestamp || new Date().toISOString(),
        message: "",
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

  // ── Message Deletion (owner only) ───────────────────────────────────────────
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

  socket.on("load_message_context", async ({ token, messageId }) => {
    try {
      if (!token || !messageId) {
        socket.emit("message_context_error", { message: "Token and message id are required." });
        return;
      }

      const actualRoom = await resolveToken(token);
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

  socket.on("typing_start", ({ room, username }) => {
    socket.to(room).emit("user_typing", { username, isTyping: true });
  });

  socket.on("typing_stop", ({ room }) => {
    socket.to(room).emit("user_typing", { username: currentUser, isTyping: false });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    if (currentRoom) {
      removeUser(currentRoom, socket.id);
      io.to(currentRoom).emit("update_users", getUsers(currentRoom));
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 1000;
(async () => {
  await connectDB();
  server.listen(PORT, () => console.log(`🚀 NexChat server running on port ${PORT}`));
})();