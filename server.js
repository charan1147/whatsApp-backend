import express from "express";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import Message from "./models/Message.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Define allowedOrigins
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://app-like-chatapp.netlify.app",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("API Request Origin:", origin); // Add logging
      console.log("Allowed Origins:", allowedOrigins);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("CORS error: Origin not allowed", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log("Socket.IO Request Origin:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("Socket.IO CORS error: Origin not allowed", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

connectDB();

// Define backend URLs based on environment
const backendUrl = "https://whatsapp-backend-17.onrender.com";
const wsBackendUrl = "wss://whatsapp-backend-17.onrender.com";

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
          "https://*.onrender.com", // Allow all subdomains of onrender.com
        ],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles if needed
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} connected with socket ID ${socket.id}`);
  });

  socket.on("sendMessage", async (message) => {
    try {
      const { receiver, content, sender } = message;
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
    socket.to(data.to).emit("offer", data.offer);
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", data.answer);
  });

  socket.on("iceCandidate", (data) => {
    socket.to(data.to).emit("iceCandidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 5013;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));