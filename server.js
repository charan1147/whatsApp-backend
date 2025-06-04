import express from "express";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import Message from "./models/Message.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { verifyToken } from "./config/jwtToken.js";

dotenv.config();

// Route validation function
const validatePath = (path) => {
  if (typeof path !== "string") {
    throw new Error(`Route path must be a string, got ${typeof path}`);
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    throw new Error(`Route path cannot be a full URL: ${path}`);
  }
  const paramRegex = /:[^/]+/g;
  const matches = path.match(paramRegex) || [];
  for (const match of matches) {
    if (!match.slice(1)) {
      throw new Error(`Missing parameter name in path: ${path}`);
    }
  }
  return path;
};

const app = express();
const server = http.createServer(app);

// Override app.use and app.get to validate paths
const originalAppUse = app.use;
const originalAppGet = app.get;

app.use = function (path, ...handlers) {
  if (typeof path === "string") {
    validatePath(path);
  }
  return originalAppUse.apply(this, [path, ...handlers]);
};

app.get = function (path, ...handlers) {
  validatePath(path);
  return originalAppGet.apply(this, [path, ...handlers]);
};

const allowedOrigins = [
  process.env.FRONTEND_URL || "https://app-like-chatapp.netlify.app",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log(`API Request Origin: ${origin}`);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("CORS error: Origin not allowed " + origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

const backendUrl = "https://whatsapp-backend-20.onrender.com";
const wsBackendUrl = "wss://whatsapp-backend-20.onrender.com";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", ...allowedOrigins],
        scriptSrc: ["'self'", "'unsafe-inline'", ...allowedOrigins],
        connectSrc: [
          "'self'",
          ...allowedOrigins,
          backendUrl,
          wsBackendUrl,
          "https://*.onrender.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
});

// app.use("/api/auth", authLimiter, authRoutes); // Disabled for testing
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use(errorHandler);

connectDB();

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log(`Socket.IO Request Origin: ${origin}`);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("Socket.IO CORS error: Origin not allowed " + origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: false,
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: No token provided"));

    const decoded = verifyToken(token);
    if (!decoded) return next(new Error("Authentication error: Invalid token"));

    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId} (socket ID: ${socket.id})`);

  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} connected with socket ID ${socket.id}`);
  });

  socket.on("sendMessage", async (message) => {
    try {
      const { receiver, content } = message;
      const sender = socket.userId;
      const newMessage = new Message({
        sender,
        receiver,
        content,
      });
      await newMessage.save();
      io.to(receiver).emit("message", newMessage);
      io.to(sender).emit("message", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("offer", (data) => {
    socket.to(data.to).emit("offer", { offer: data.offer, to: data.to });
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", data.answer);
  });

  socket.on("iceCandidate", (data) => {
    socket.to(data.to).emit("iceCandidate", data.candidate);
  });

  // Added for incoming call notifications
  socket.on("incomingCall", ({ from, to }) => {
    socket.to(to).emit("incomingCall", { from, to });
  });

  // Added for ending calls
  socket.on("callEnded", ({ to }) => {
    socket.to(to).emit("callEnded");
  });

  socket.on("logout", ({ userId }) => {
    console.log(`User ${userId} logged out`);
    socket.leave(userId);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Log all registered routes for debugging
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`Registered route: ${r.route.path}`);
  }
});

const PORT = process.env.PORT || 5013;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));