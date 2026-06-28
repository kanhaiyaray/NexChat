# ⚡ NexChat — Private Real-Time Chat Platform

<div align="center">

**A production-grade, invite-only real-time chat application built with React 19, Node.js, Socket.IO, MongoDB Atlas, and Cloudinary.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)
[![MIT License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

> No public rooms. No spam. Every conversation is private by design.  
> Built for people who value privacy — invite-only access via UUID token links.

**[🌐 Live Demo](https://nexchat-red.vercel.app/)** · **[📁 GitHub Repository](https://github.com/kanhaiyaray/NexChat)**

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Key Engineering Decisions](#key-engineering-decisions)
- [Feature Set](#feature-set)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [API Reference](#api-reference)
- [Socket.IO Event Protocol](#socketio-event-protocol)
- [Security Implementation](#security-implementation)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Engineering Challenges & Solutions](#engineering-challenges--solutions)
- [Performance Optimizations](#performance-optimizations)
- [What I Learned](#what-i-learned)
- [Features Roadmap](#features-roadmap)

---

## Overview

NexChat is a production-deployed real-time chat application where **every room is private by design**. There are no public channels, no user directories, and no way to discover rooms — you can only join a conversation if someone shares a cryptographically unique invite token with you.

The application handles the full complexity of a real-time multi-user system: concurrent socket connections with duplicate prevention, persistent message history with read receipts, Cloudinary-backed media uploads (images + voice), user profile management, message pinning, full-text search, and a responsive dark-theme UI — all wired together without a single off-the-shelf real-time service.

**This was built entirely from scratch** — no Firebase, no Supabase, no third-party chat SDK.

---

## Live Demo

| Environment | URL |
|---|---|
| Frontend (Vercel) | [https://nexchat-red.vercel.app](https://nexchat-red.vercel.app) |
| Backend (Render) | Express + Socket.IO server |

**How to test:**
1. Open the live link and sign in with Google or GitHub (via Clerk)
2. Click **"+ Create New Private Chat"** — an invite link is copied to your clipboard automatically
3. Open the link in a second browser tab or share it with someone else
4. Both users are now in a live private room

---

## Key Engineering Decisions

These are the decisions I made that go beyond "follow the tutorial":

### 1. UUID Token-Based Room Access (Not Auth-Gated Rooms)
Rooms aren't tied to user IDs in a permissions table. Instead, each room gets a cryptographically random 32-character UUID token. Knowing the token IS the permission. This means:
- Zero backend calls to check membership on every message
- Invite links work instantly without user registration flow
- Token validated once on join; Socket.IO handles the rest in-memory

### 2. Dual-Layer Room Resolution (Memory-First, DB Fallback)
```
tokenRoomMap (in-memory Map) → PrivateRoom collection (MongoDB)
```
Room tokens are cached in a `Map` on join. Subsequent token lookups skip the DB entirely. This keeps join latency at O(1) for active sessions while surviving server restarts via MongoDB persistence.

### 3. Duplicate Socket Prevention by Username
When a user opens a second tab or reconnects, the server removes the old socket entry before adding the new one:
```js
rooms[room] = rooms[room].filter(u => u.username !== username);
rooms[room].push({ id, username, clerkId });
```
This prevents ghost users in the presence sidebar — a subtle but common real-time bug.

### 4. Message Buffer for Race Conditions
Messages received before history has loaded are queued in a `messageBuffer`. After `chat_history` arrives, the buffer is merged and deduplicated using a `Map` keyed by message ID. This prevents messages from disappearing or duplicating during the load phase.

### 5. Base64 → Cloudinary Pipeline (No Binary on Socket)
Images and voice recordings are converted to base64 on the client before emission. The server uploads to Cloudinary and broadcasts only the permanent CDN URL — never the raw binary. This keeps socket payloads text-based and avoids binary framing issues.

### 6. IntersectionObserver for Read Receipts
Read receipts use the browser's `IntersectionObserver` API instead of scroll events. When a message row becomes 50% visible in the viewport, a `message_read` event fires. This is throttle-free, battery-efficient, and accurate.

---

## Feature Set

### 💬 Messaging
| Feature | Implementation Detail |
|---|---|
| Real-time text messages | Socket.IO `send_message` / `receive_message` events |
| Image sharing | Base64 client upload → Cloudinary CDN → URL broadcast |
| Voice messages | MediaRecorder API → Base64 → Cloudinary `audio/` → VoicePlayer component |
| Message editing | 5-minute edit window enforced on both client and server |
| Message deletion | Owner-only, verified server-side against `currentUser` |
| Emoji reactions | Double-click or right-click → reaction picker → `update_reaction` event |
| Typing indicators | Debounced `typing_start` / `typing_stop` with 1.2s timeout |
| Emoji panel | 12-emoji quick-insert panel in message input |

### 🔒 Privacy & Rooms
| Feature | Implementation Detail |
|---|---|
| Invite-only rooms | UUID token system — link = permission |
| Session persistence | Token stored in `sessionStorage` → survives page refresh |
| Token cleanup | URL bar cleared after join via `history.replaceState()` |
| Private room indicator | Room ID truncated to 8 chars for display |

### 👤 User Profiles
| Feature | Implementation Detail |
|---|---|
| Custom avatars | Upload → Cloudinary (200×200 face-crop transform) → stored URL |
| Avatar color themes | 12 preset colors stored per user in MongoDB |
| Bio & status | 160-char bio, 40-char status, editable at any time |
| Profile sync on join | Auto-creates profile from Clerk data on first join |
| Profile updates broadcast | `user_profile_updated` socket event notifies all room members |

### 📌 Organization
| Feature | Implementation Detail |
|---|---|
| Pinned messages | Max 5 per room, stored in `PrivateRoom.pinnedMessages[]` |
| Message search | MongoDB `$text` index on `message` field + `$meta: textScore` ranking |
| Search result jump | `load_message_context` loads ±15 messages around the result |
| Read receipts | `IntersectionObserver` + `ReadReceipt` collection + per-message `readBy[]` |

### 🛡️ Admin / Moderation
| Feature | Implementation Detail |
|---|---|
| Full admin dashboard | Stats, user/room management, audit logs, system settings |
| User ban/unban | Server-side status toggle with audit trail |
| Room suspend/unsuspend | Prevent joins to suspended rooms |
| Audit logging | All admin actions logged with timestamp and details |
| System settings | Maintenance mode, message length, image uploads, site name |
| Data export | CSV export for users, rooms, and audit logs |
| Real-time admin stats | Socket.IO push updates every 5 seconds |

### 📱 UI / UX
| Feature | Implementation Detail |
|---|---|
| Dark theme | CSS custom properties (`--bg`, `--surface`, `--cyan`, etc.) injected via JS |
| Mobile responsive | CSS media queries at 480px, 768px, 900px breakpoints |
| Sliding sidebar | Fixed sidebar with `translateX` transition + overlay backdrop |
| Image lightbox | Full-screen click-to-dismiss overlay |
| Auto-scroll | `shouldAutoScrollRef` flag prevents scroll hijacking during search |
| Context menu | Right-click message → react / edit / delete / pin |
| Toast notifications | 3-second auto-dismiss toast system |
| Keyboard shortcuts | `Ctrl+K` to focus search, `Esc` to close |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.6 | UI framework with latest concurrent features |
| Vite | 7.3.3 | Build tool with Rolldown bundler (esbuild-powered) |
| Socket.IO Client | 4.8.3 | Real-time WebSocket communication |
| Clerk React | 5.61.6 | Authentication (Google, GitHub, Email) |
| React Router DOM | 7.18.0 | Client-side routing |
| React Query | 5.101.2 | Data fetching and caching |
| Recharts | 3.9.0 | Admin dashboard charts |

> **Note:** No Tailwind, no external UI library, no Redux. All 1,500+ lines of CSS are hand-written custom properties injected via a single `<style>` tag — keeping the bundle zero-dependency for styling.

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Server runtime |
| Express | 4.22 | HTTP server and REST API |
| Socket.IO | 4.8.3 | WebSocket server with polling fallback |
| Mongoose | 8.24 | MongoDB ODM |
| Cloudinary | 2.10 | Image and voice media CDN |
| Multer | 2.1.1 | Multipart file upload handling |
| express-rate-limit | 8.5.2 | API abuse prevention |

### Infrastructure
| Service | Usage |
|---|---|
| MongoDB Atlas | Primary database (messages, profiles, rooms, receipts) |
| Cloudinary | Media storage (images, voice, avatars) |
| Vercel | Frontend hosting (SPA with `vercel.json` rewrite rule) |
| Render | Backend hosting (Express + Socket.IO) |
| Clerk | Authentication provider |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Vercel)                        │
│                                                             │
│  React 19 + Vite 7                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Chat.jsx │  │ProfileModal  │  │VoiceRecorder /Player │  │
│  │ (main)   │  │.jsx          │  │.jsx                  │  │
│  └────┬─────┘  └──────┬───────┘  └──────────────────────┘  │
│       │               │                                     │
│  Socket.IO Client   fetch() → VITE_SOCKET_URL/api/*        │
└───────┼───────────────┼─────────────────────────────────────┘
        │ WebSocket     │ HTTP/REST
        ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Render)                          │
│                                                             │
│  Express + Socket.IO                                       │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   REST API Routes    │  │   Socket.IO Event Bus    │    │
│  │  /api/create-chat    │  │  join_room               │    │
│  │  /api/validate-token │  │  send_message            │    │
│  │  /api/search         │  │  send_image / send_voice │    │
│  │  /api/user/profile/* │  │  message_reaction        │    │
│  │  /api/user/sync/*    │  │  pin_message             │    │
│  │  /api/admin/*        │  │  message_read            │    │
│  └──────────┬───────────┘  └──────────┬───────────────┘    │
│             │                         ▼                     │
│  ┌──────────────────┐    ┌─────────────────────────┐       │
│  │   Mongoose ODM   │    │  In-Memory Room State   │       │
│  │  8 schemas       │    │  tokenRoomMap (Map)      │       │
│  └────────┬─────────┘    │  rooms (Object)          │       │
│           │              └─────────────────────────┘       │
└───────────┼─────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────────┐
     ▼                                     ▼
┌────────────────┐                ┌─────────────────┐
│  MongoDB Atlas │                │   Cloudinary    │
│                │                │                 │
│  messages      │                │  nexchat/        │
│  privaterooms  │                │  nexchat_voice/  │
│  userprofiles  │                │  nexchat_avatars/│
│  readreceipts  │                └─────────────────┘
│  adminaudits   │
│  systemsettings│
└────────────────┘
```

### Data Flow: Sending a Message
```
1. User types → keydown Enter → sendMessage()
2. socket.emit("send_message", { room, message, sender, timestamp })
3. Server: new Message({ ... }).save() → MongoDB
4. Server: ReadReceipt.findOneAndUpdate() — auto-read by sender
5. io.to(room).emit("receive_message", finalMessage)
6. All clients in room: setMessages(prev => [...prev, data])
7. shouldAutoScrollRef = true → endRef.scrollIntoView()
```

### Data Flow: Image Upload
```
1. User selects file → FileReader.readAsDataURL()
2. socket.emit("send_image", { imageBase64: "data:image/..." })
3. Server: cloudinary.uploader.upload(base64, { folder: "nexchat" })
4. Cloudinary returns: { secure_url: "https://res.cloudinary.com/..." }
5. Server: new Message({ imageUrl: secure_url }).save()
6. io.to(room).emit("receive_image", { imageUrl, ... })
7. Client renders: <img src={msg.imageUrl} onClick={() => setLightbox(url)} />
```

### Data Flow: Voice Message
```
1. User clicks 🎙️ → navigator.mediaDevices.getUserMedia({ audio: true })
2. MediaRecorder.start(100ms chunks) → audioChunksRef accumulates
3. User clicks ⏹️ → MediaRecorder.stop() → Blob(chunks, "audio/webm")
4. FileReader.readAsDataURL(blob) → base64 string
5. socket.emit("send_voice", { audioBase64, duration })
6. Server: cloudinary.uploader.upload(base64, { resource_type: "auto" })
7. io.to(room).emit("receive_voice", { voiceUrl, voiceDuration })
8. Client renders: <VoicePlayer audioUrl={url} duration={d} />
```

---

## Database Design

### Message Schema
```js
{
  room:          String,   // Room ID (indexed)
  sender:        String,   // Display name
  message:       String,   // Text content (text-indexed for search)
  imageUrl:      String,   // Cloudinary URL (if type === "image")
  voiceUrl:      String,   // Cloudinary URL (if type === "voice")
  voiceDuration: Number,   // Seconds (voice messages)
  type:          enum["text", "image", "voice"],
  timestamp:     Date,     // Compound indexed with room
  edited:        Boolean,
  editedAt:      Date,
  reactions:     Map<String, Number>,  // { "❤️": 3, "🔥": 1 }
  replyTo: {
    messageId:   String,
    snippet:     String,
    sender:      String
  }
}

Indexes:
- { room: 1, timestamp: -1 }   // Fast history queries
- { message: "text" }           // Full-text search
```

### PrivateRoom Schema
```js
{
  roomId:          String,    // "room_<20-char-uuid>"
  code:            String,    // 6-char alphanumeric invite code
  createdBy:       String,    // Clerk user ID
  createdAt:       Date,
  pinnedMessages:  [ObjectId] // Refs to Message (max 5)
  suspended:       Boolean
}
```

### UserProfile Schema
```js
{
  clerkId:          String,   // Clerk's user ID (unique, indexed)
  username:         String,   // Display name (text-indexed)
  displayName:      String,   // Custom display name
  email:            String,
  avatarUrl:        String,   // Cloudinary URL after upload
  avatarColor:      String,   // Hex color for initial avatar
  bio:              String,   // Max 160 chars
  statusEmoji:      String,   // Status emoji
  statusText:       String,   // Status text
  lastSeen:         Date,
  visibility:       enum['public','friends','private'],
  hideOnlineStatus: Boolean,
  hideReadReceipts: Boolean,
  activityFeed:     [{ message, timestamp, roomId }],
  updatedAt:        Date,
  createdAt:        Date,
  role:             enum['user','admin'],
  status:           enum['active','banned']
}
```

### ReadReceipt Schema
```js
{
  room:      String,
  messageId: ObjectId,  // Ref to Message
  userId:    String,    // Username
  readAt:    Date
}

Index: { room: 1, messageId: 1, userId: 1 } (unique)
```

### AdminAudit Schema
```js
{
  adminId:    String,
  adminName:  String,
  action:     String,    // ban_user, delete_room, etc.
  target:     String,
  targetType: enum['user','room'],
  details:    Object,
  timestamp:  Date
}
```

### SystemSettings Schema
```js
{
  maintenanceMode:   Boolean,
  maxMessageLength:  Number,
  allowImageUploads: Boolean,
  allowNewRooms:     Boolean,
  siteName:          String,
  updatedAt:         Date
}
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check — returns `{ status: "ok", time }` |
| `POST` | `/api/create-chat` | Creates a new private room, returns `{ roomId, code, inviteLink }` |
| `GET` | `/api/validate-code/:code` | Validates an invite code, returns `{ roomId, valid }` |
| `GET` | `/api/admin/check-role` | Checks if a user is an admin (by email or clerkId) |

### Authenticated REST Endpoints

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `GET` | `/api/search` | `?code&roomId&q` | Full-text search in a room (requires valid code) |
| `GET` | `/api/user/profile/:clerkId` | — | Get user profile by Clerk ID |
| `POST` | `/api/user/profile/:clerkId` | `FormData: { bio, status, avatarColor, avatar? }` | Update profile, upload avatar to Cloudinary |
| `POST` | `/api/user/sync/:clerkId` | `{ username, email, avatarUrl }` | Create or sync user profile (called on first join) |
| `POST` | `/api/user/profiles/batch` | `{ clerkIds: [] }` | Batch fetch profiles for room member list |
| `POST` | `/api/webhook/clerk` | Clerk webhook payload | Sync user data from Clerk events |

### Admin Endpoints (Requires `role: 'admin'`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | System statistics (users, rooms, messages, etc.) |
| `GET` | `/api/admin/users` | List users with pagination, search, filter |
| `PUT` | `/api/admin/users/:id/ban` | Ban a user |
| `PUT` | `/api/admin/users/:id/unban` | Unban a user |
| `DELETE` | `/api/admin/users/:id` | Delete a user permanently |
| `GET` | `/api/admin/rooms` | List rooms with pagination and search |
| `PUT` | `/api/admin/rooms/:id/suspend` | Suspend a room |
| `PUT` | `/api/admin/rooms/:id/unsuspend` | Unsuspend a room |
| `DELETE` | `/api/admin/rooms/:id` | Delete a room and all its messages |
| `GET` | `/api/admin/audit` | List admin audit logs |
| `GET` | `/api/admin/health` | System health check |
| `GET` | `/api/admin/settings` | Get system settings |
| `PUT` | `/api/admin/settings` | Update system settings |
| `GET` | `/api/admin/export/users` | Export users as CSV |
| `GET` | `/api/admin/export/rooms` | Export rooms as CSV |
| `GET` | `/api/admin/export/audit` | Export audit logs as CSV |
| `GET` | `/api/admin/analytics/messages` | Message volume over time |
| `GET` | `/api/admin/analytics/users` | User statistics |
| `GET` | `/api/admin/analytics/users-over-time` | User growth over time |
| `GET` | `/api/admin/analytics/rooms-over-time` | Room growth over time |
| `GET` | `/api/admin/analytics/message-types` | Distribution of message types |
| `GET` | `/api/admin/analytics/top-users` | Most active users |
| `GET` | `/api/admin/analytics/activity-heatmap` | Activity heatmap data |

### Request / Response Examples

**POST `/api/create-chat`**
```json
// Request
{ "userId": "user_2abc123" }

// Response
{
  "roomId": "room_a1b2c3d4e5f6a7b8c9d0",
  "code": "AB7K92",
  "inviteLink": "https://nexchat-red.vercel.app/join/AB7K92"
}
```

**GET `/api/search?code=AB7K92&roomId=room_xxx&q=hello`**
```json
{
  "roomId": "room_...",
  "query": "hello",
  "results": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sender": "Kanhaiya",
      "message": "hello everyone!",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Socket.IO Event Protocol

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ username, code, clerkId }` | Join or rejoin a private room |
| `send_message` | `{ room, message, sender, timestamp, replyTo? }` | Send a text message |
| `send_image` | `{ room, imageBase64, sender, timestamp }` | Upload and send an image |
| `send_voice` | `{ room, audioBase64, sender, timestamp, duration }` | Upload and send a voice message |
| `message_reaction` | `{ room, msgId, emoji }` | Add emoji reaction |
| `delete_message` | `{ room, msgId, username }` | Delete own message |
| `edit_message` | `{ room, msgId, newMessage, sender }` | Edit own message (5-min window) |
| `pin_message` | `{ room, msgId, username }` | Pin a message (max 5/room) |
| `unpin_message` | `{ room, msgId, username }` | Remove pinned message |
| `get_pinned_messages` | `{ room }` | Fetch all pinned messages |
| `message_read` | `{ room, msgId, username }` | Mark message as read |
| `load_message_context` | `{ code, messageId }` | Load ±15 messages around a search result |
| `typing_start` | `{ room, username }` | Broadcast typing indicator |
| `typing_stop` | `{ room }` | Clear typing indicator |
| `admin:subscribe` | — | Subscribe to real-time admin stats |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `chat_history` | `Message[]` | Last 50 messages with read receipt data |
| `receive_message` | `Message` | New text message |
| `receive_image` | `Message` | New image message (Cloudinary URL) |
| `receive_voice` | `Message` | New voice message (Cloudinary URL) |
| `update_users` | `User[]` | Updated online member list |
| `user_typing` | `{ username, isTyping }` | Typing indicator state |
| `update_reaction` | `{ msgId, emoji }` | Emoji reaction added |
| `message_deleted` | `{ msgId }` | Message removed from UI |
| `message_edited` | `{ msgId, message, edited, editedAt }` | Message content updated |
| `message_context` | `{ anchorId, position, messages[] }` | Search context window |
| `pinned_messages_list` | `Message[]` | All pinned messages for sidebar |
| `message_pinned` | `{ message, pinnedCount }` | New message pinned |
| `message_unpinned` | `{ msgId, pinnedCount }` | Message unpinned |
| `receipts_updated` | `{ msgId, readBy[], count }` | Read receipt updated |
| `user_profile_updated` | `UserProfile` | Profile changed (avatar, status, etc.) |
| `join_error` | `{ message }` | Invalid token or server error |
| `admin:stats` | `{ totalUsers, onlineUsers, totalRooms, ... }` | Real-time admin stats (every 5s) |

---

## Security Implementation

| Concern | Approach |
|---|---|
| **Authentication** | Clerk handles OAuth + session management; JWT tokens never touch the Express layer |
| **Room access control** | UUID code = permission. No code = no join. Validated server-side on every `join_room` |
| **Message ownership** | Every `delete_message` and `edit_message` checks `currentUser === sender` in socket closure |
| **File upload validation** | Multer `fileFilter` rejects non-image MIME types; 5MB size limit enforced |
| **CORS** | Strict origin whitelist: `localhost:5173/74/75` + `CLIENT_ORIGIN` env var only |
| **Rate limiting** | `express-rate-limit` on all `/api/*` routes |
| **Socket buffer limit** | `maxHttpBufferSize: 10MB` — prevents oversized base64 payloads from crashing the server |
| **Cloudinary secrets** | API credentials never exposed to client; all uploads proxied through server |
| **Profile API** | Relative URL bug fixed — all profile calls use `VITE_SOCKET_URL` as base, not relative paths |
| **Admin protection** | All admin routes require `role: 'admin'` check via `isAdmin` middleware |
| **Audit logging** | All admin actions logged with timestamp and admin identity |

---

## Project Structure

```
nexchat/
│
├── client/                          # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx             # Main app component (~2,500 lines)
│   │   │   │                        #   - PrivateJoinScreen
│   │   │   │                        #   - ChatScreen (messages, sidebar, header)
│   │   │   │                        #   - All Socket.IO event handlers
│   │   │   │                        #   - Full CSS injected via styleSheet
│   │   │   ├── ProfileModal.jsx     # Edit profile modal (bio, status, avatar)
│   │   │   ├── VoiceRecorder.jsx    # MediaRecorder → base64 pipeline
│   │   │   └── VoicePlayer.jsx      # Custom audio player with seek bar
│   │   ├── pages/
│   │   │   └── admin/               # Admin dashboard pages
│   │   │       ├── AdminLayout.jsx  # Layout with sidebar
│   │   │       ├── Dashboard.jsx    # Stats overview
│   │   │       ├── Users.jsx        # User management
│   │   │       ├── Rooms.jsx        # Room management
│   │   │       ├── SystemHealth.jsx # Health monitoring
│   │   │       ├── AuditLog.jsx     # Admin audit logs
│   │   │       ├── Analytics.jsx    # Advanced analytics with charts
│   │   │       └── Profile.jsx      # Profile & system settings
│   │   ├── api/
│   │   │   └── admin.js             # Admin API client functions
│   │   ├── hooks/
│   │   │   └── useAdminSocket.js    # Admin real-time stats socket hook
│   │   ├── App.jsx                  # Routes configuration
│   │   ├── AdminRoute.jsx           # Admin route guard
│   │   ├── main.jsx                 # ClerkProvider + React 19 root
│   │   └── index.css                # CSS reset only (all styles in Chat.jsx)
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json                  # SPA rewrite: /* → /index.html
│   └── package.json
│
├── server/
│   └── server.js                    # Entire backend in one file (~1,500 lines)
│                                    #   - 8 Mongoose schemas
│                                    #   - 25+ REST endpoints
│                                    #   - 20+ Socket.IO event handlers
│                                    #   - Cloudinary upload logic
│                                    #   - In-memory room state
│                                    #   - Admin middleware & audit
│                                    #   - Analytics aggregation pipelines
│
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Clerk account (free tier works)

### Step 1: Clone the Repository
```bash
git clone https://github.com/kanhaiyaray/NexChat.git
cd NexChat
```

### Step 2: Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Step 3: Configure Environment Variables

**Server** (`server/.env`):
```env
# Server
PORT=1000
CLIENT_ORIGIN=http://localhost:5173

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dbname

# Cloudinary (get from cloudinary.com → Dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Client** (`client/.env`):
```env
# Clerk (get from clerk.com → API Keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Points to your Express server
VITE_SOCKET_URL=http://localhost:1000
```

### Step 4: Run the Development Servers

```bash
# Terminal 1 — Backend (port 1000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

### Verifying the Setup
When the server starts, you should see:
```
✅ MongoDB connected
✅ Cloudinary connected: { status: 'ok', ... }
🚀 NexChat server running on port 1000
```

---

## Environment Variables

### Server Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 1000) |
| `CLIENT_ORIGIN` | Yes (prod) | Vercel frontend URL for CORS whitelist |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |

### Client Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (safe to expose) |
| `VITE_SOCKET_URL` | Yes | Full URL of your Express server |

> **Security note:** `VITE_` prefix makes variables available in the browser bundle. Only `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_SOCKET_URL` are intentionally exposed. All secrets (Cloudinary, MongoDB) stay server-side only.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   ```
   Root directory:    server
   Build command:     npm install
   Start command:     node server.js
   Node version:      20
   ```
4. Add all environment variables from `server/.env`
5. Set `CLIENT_ORIGIN` to your Vercel frontend URL

### Frontend → Vercel

1. Import your repository on [vercel.com](https://vercel.com)
2. Configure:
   ```
   Root directory:    client
   Framework:         Vite (auto-detected)
   Build command:     npm run build
   Output directory:  dist
   ```
3. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_SOCKET_URL` → your Render server URL
4. The `client/vercel.json` handles SPA routing:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

### Clerk Configuration (Required)

1. Go to [clerk.com](https://clerk.com) → Your app → Settings → Domains
2. Add your Vercel URL as an **Allowed Origin**
3. Enable Google and/or GitHub OAuth providers in the Clerk dashboard
4. Set up a webhook endpoint at `/api/webhook/clerk` for user sync

### MongoDB Atlas Configuration

1. In Network Access, add `0.0.0.0/0` (required for Render's dynamic IPs)
2. Create a database user with **Read and Write** access
3. Copy the connection string → `MONGODB_URI` in server env vars

---

## Engineering Challenges & Solutions

### Challenge 1: Messages Disappearing on Reconnect

**Problem:** When a user reconnected during the `chat_history` load, incoming `receive_message` events fired before the history arrived, causing some messages to be overwritten.

**Solution:** Implemented a message buffer — all incoming messages while `historyLoaded === false` are pushed into `messageBuffer[]`. After `chat_history` fires, the buffer is merged using a `Map<id, message>`, deduped, and sorted by timestamp.

```js
const onReceiveMessage = (data) => {
  if (!historyLoaded) {
    setMessageBuffer(prev => [...prev, data]);
    return;
  }
  setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
};
```

### Challenge 2: Ghost Users in Presence Sidebar

**Problem:** Opening NexChat in two tabs showed the same user twice in the member list.

**Solution:** On every `join_room`, the server filters out any existing entry with the same username before adding the new socket:

```js
rooms[room] = rooms[room].filter(u => u.username !== username);
rooms[room].push({ id, username, clerkId });
```

### Challenge 3: Profile Upload 404 in Production

**Problem:** `ProfileModal.jsx` used a relative URL `/api/user/profile/...` which Vercel's SPA rewrite intercepted and returned `index.html` instead of routing to the Express server.

**Solution:** Added `const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000"` to `ProfileModal.jsx` and updated the fetch call to use the full absolute URL.

### Challenge 4: Auto-Scroll Hijacking Search Results

**Problem:** When jumping to a search result in older history, auto-scroll would immediately pull the view back to the bottom.

**Solution:** Introduced `shouldAutoScrollRef` — a ref (not state, to avoid re-renders) that is only set to `true` when a new message arrives or on initial load. The scroll effect checks this flag before scrolling. For search jumps, `pendingScrollTargetRef` is used instead.

### Challenge 5: Voice Upload Format Compatibility

**Problem:** `MediaRecorder` on Chrome produces `audio/webm;codecs=opus`. Safari doesn't support WebM. Cloudinary needed a consistent format.

**Solution:** Cloudinary's `resource_type: "auto"` with `format: "mp3"` automatically transcodes WebM to MP3 on upload. The resulting URL is a standard MP3 that plays on all browsers via HTML5 `<audio>`.

### Challenge 6: Admin Role Check Without Authentication

**Problem:** The admin route protection needed to verify admin status from Clerk data without forcing a full auth flow on every page load.

**Solution:** Created a public `/api/admin/check-role` endpoint that accepts either `email` or `clerkId` query parameters and checks the `UserProfile` collection for `role: 'admin'`. The frontend `AdminRoute` component calls this endpoint on mount and gates the dashboard render on the result.

---

## Performance Optimizations

| Optimization | Impact |
|---|---|
| In-memory `codeRoomMap` | Code lookups skip MongoDB for active sessions — O(1) instead of O(log n) DB query |
| Compound index `{ room: 1, timestamp: -1 }` | History queries scan only the relevant room's messages |
| Text index on `message` field | Full-text search uses MongoDB's inverted index, not a collection scan |
| `limit(50)` on history load | Prevents loading thousands of messages into memory on join |
| `shouldAutoScrollRef` (not state) | Prevents re-render on every message arrival just to check scroll position |
| Cloudinary auto quality/format | `quality: "auto", fetch_format: "auto"` reduces image payload by 40-70% |
| CSS via JS injection | Zero HTTP requests for styles; no render-blocking stylesheet |
| `IntersectionObserver` for receipts | Passive, battery-efficient API — no scroll event listeners |
| Socket.IO compression | `perMessageDeflate: true` reduces WebSocket payload size |
| Admin stats via socket | Real-time updates pushed every 5s without polling the REST API |

---

## What I Learned

### Real-Time Systems Are Hard
The hardest part wasn't any single feature — it was **stitching Clerk auth states, Socket.IO room lifecycle, and MongoDB async flows together without creating spaghetti**. A seemingly simple action like "user joins room" involves: validate code (async DB lookup), create/sync profile (async DB write), load history (async DB query), emit to room members (sync socket), update in-memory state. Every step can fail independently.

### State Consistency Is the Real Problem
Most real-time bugs aren't about WebSockets — they're about **state consistency across async boundaries**. The message buffer, the `shouldAutoScrollRef`, the `historyLoaded` flag — these all exist to answer the same question: "what's the ground truth right now, and how do I reconcile it with what just arrived?"

### The Edge Cases Are the Engineering
Shipping the features took 20% of the time. The other 80% was:
- Duplicate socket prevention when users open multiple tabs
- Messages not appearing on slow connections (buffer + dedup)
- Ghost users after reconnect (username-based filter on join)
- Cross-origin cookies breaking OAuth on split deployment
- Relative URL bug causing profile uploads to silently fail in production
- Admin role verification without breaking the auth flow

These aren't in any tutorial. They're the engineering.

### Admin Dashboard Complexity
Building a full admin panel with real-time stats, user/room management, audit logging, and analytics taught me the importance of:
- Separation of concerns between admin routes and main app
- Consistent audit trails for accountability
- Data aggregation pipelines for analytics
- CSV export for operational data

---

## Features Roadmap

- [ ] End-to-end encryption (WebCrypto API)
- [ ] Redis pub/sub adapter for Socket.IO horizontal scaling
- [ ] Message threads / reply chains
- [ ] File sharing (PDFs, docs) via Cloudinary raw uploads
- [ ] Scheduled message deletion (ephemeral rooms)
- [ ] WebRTC peer-to-peer voice/video calls within rooms
- [ ] Docker Compose setup for one-command local development
- [ ] Jest unit tests for socket event handlers
- [ ] GitHub Actions CI pipeline
- [ ] Push notifications (Web Push API)
- [ ] Message search inside admin dashboard
- [ ] Export chat history as JSON

---

## License

This project is licensed under the **MIT License** — for personal and commercial use.

---

<div align="center">

Built by **Kanhaiya Kumar**

[GitHub](https://github.com/kanhaiyaray) · [LinkedIn](https://www.linkedin.com/in/raykanhaiya/) · [samkanhaiya@gmail.com](mailto:samkanhaiya@gmail.com)

*"The edge cases are where the real engineering lives."*

</div>
