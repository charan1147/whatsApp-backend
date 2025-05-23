import express from "express";
import http from "http";
import { Server } from "socket.io"; 
import { connectDB } from "./config/db.js";
import authRoutes  from "./routes/authRoutes.js";
import  chatRoutes  from "./routes/chatRoutes.js";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5713", 
    credentials: true, 
  },
});

connectDB();

app.use(helmet()); 
app.use(morgan("dev"));
app.use(cors({ origin: "http://localhost:5713", credentials: true })); // CORS for HTTP requests
app.use(cookieParser()); 
app.use(express.json()); 

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("sendMessage", (message) => {
    io.emit("message", message);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));