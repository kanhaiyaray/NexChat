# ⚡ NexChat — Private Real-time Chat

A production-ready, **invite-only** real-time chat app. No public rooms. Every conversation is private by design.

---

## Quick Start (Local Dev)

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client  
cd ../client && npm install
```

### 2. Set up environment variables

```bash
# Server
cd server
cp .env.example .env
# Fill in: MONGODB_URI, CLOUDINARY_*, CLIENT_ORIGIN, PORT

# Client
cd ../client
cp .env.example .env
# Fill in: VITE_CLERK_PUBLISHABLE_KEY, VITE_SOCKET_URL
```

### 3. Run locally

```bash
# Terminal 1 — backend (port 1000)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open http://localhost:5173

---

## How the Private Room System Works

| Step | Action |
|---|---|
| **Create** | Click "＋ Create New Private Chat" → unique invite link copied to clipboard |
| **Share** | Paste the link to your friends |
| **Join** | Friend opens the link → signs in → auto-joins the private room |
| **Privacy** | Only people with the link can join. Left sidebar shows only your invited friends. |
| **Refresh** | Token saved in sessionStorage — page refresh keeps you in the chat |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Socket.IO client |
| Auth | Clerk (Google / GitHub / Email) |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas + Mongoose |
| Images | Cloudinary (auto quality/format) |
| Deployment | Vercel (client) + Render (server) |

---

## Third-Party Setup

### Clerk (Auth)
1. Create app at [clerk.com](https://clerk.com)
2. Copy **Publishable Key** → `client/.env` as `VITE_CLERK_PUBLISHABLE_KEY`
3. Add your Vercel URL to Clerk **Domains** before deploying

### Cloudinary (Images)
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Copy Cloud Name, API Key, API Secret → `server/.env`

### MongoDB Atlas (Messages)
1. Create free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create DB user with Read/Write access
3. Add `0.0.0.0/0` in Network Access (required for Render)
4. Copy connection string → `server/.env` as `MONGODB_URI`

---

## Deployment

### Backend → Render
- Root directory: `server`
- Build: `npm install`
- Start: `node server.js`
- Add all env vars from `server/.env.example`
- Set `CLIENT_ORIGIN` = your Vercel URL

### Frontend → Vercel
- Root directory: `client`
- Framework: Vite (auto-detected)
- Add `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_SOCKET_URL` as env vars

---

## Features

✅ Private invite-only rooms (UUID token system)  
✅ Real-time messaging (Socket.IO)  
✅ Image sharing (Cloudinary auto-optimized)  
✅ MongoDB message persistence (last 50 per room)  
✅ Live typing indicators  
✅ Emoji reactions (double-click message)  
✅ Emoji panel in input  
✅ Online members sidebar  
✅ Image lightbox  
✅ Copy invite link button  
✅ Dark theme  
✅ Clerk authentication  
✅ Page refresh keeps session (sessionStorage)  
✅ Token removed from URL bar after join  
