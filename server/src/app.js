import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { initSocket } from "./socket/index.js";
import healthRoutes from "./routes/health.routes.js";
import roomRoutes from "./routes/room.routes.js";
import searchRoutes from "./routes/search.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { allowedOrigins } from "./config/cors.js";
import rateLimit from "express-rate-limit";

const app = express();
const server = http.createServer(app);

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        process.env.CLIENT_ORIGIN || "http://localhost:5173",
        "https://*.clerk.com",
        "https://*.cloudinary.com",
        "wss://*.render.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://*.cloudinary.com",
        "https://img.clerk.com",
        "https://*.clerk.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://*.clerk.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'"
      ],
      frameSrc: [
        "'self'",
        "https://*.clerk.com"
      ]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

// CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-clerk-id", "x-user-email"],
  exposedHeaders: ["Content-Disposition"]
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

app.use("/api", limiter);

// Body Parsers
app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: "10mb" 
}));

app.set("trust proxy", 1);

// ─── SOCKET.IO ────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

app.set("io", io);

// ─── ROUTES ────────────────────────────────────────────────────────

app.use("/", healthRoutes);
app.use("/api", roomRoutes);
app.use("/api", searchRoutes);
app.use("/api/user", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", uploadRoutes);

// Socket.IO
initSocket(io);

// ─── 404 HANDLER ──────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("🔥 Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: "Duplicate key error",
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token"
    });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" 
    ? "Internal server error" 
    : err.message || "Internal server error";

  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack 
    })
  });
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────

const shutdown = async () => {
  console.log("🔄 Received shutdown signal, closing server...");
  
  io.close(() => {
    console.log("✅ Socket.IO closed");
  });

  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️  Forceful shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default server;
