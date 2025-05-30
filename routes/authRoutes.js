import { Router } from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../config/jwtToken.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    console.log("Register request received:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = await User.create({ email, password, contacts: [] });

    generateToken(res, user._id);
    console.log("Register response sent:", { success: true, user: { id: user._id, email: user.email } });
    res.status(201).json({ success: true, message: "User registered", user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login request received:", { email });
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("Login failed: Invalid credentials");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    generateToken(res, user._id);
    const response = { success: true, user: { id: user._id, email: user.email, contacts: user.contacts } };
    console.log("Login response sent:", response);
    res.json(response);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    res.json({ success: true, user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/add-contact", auth, async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Add-contact request received:", { email, userId: req.user._id });
    const contact = await User.findOne({ email });

    if (!contact) {
      console.log("Add-contact failed: User not found");
      return res.status(404).json({ error: "User not found" });
    }
    if (contact._id.toString() === req.user._id.toString()) {
      console.log("Add-contact failed: Cannot add yourself");
      return res.status(400).json({ error: "Cannot add yourself" });
    }
    if (req.user.contacts.some((c) => c._id.toString() === contact._id.toString())) {
      console.log("Add-contact failed: Contact already added");
      return res.status(400).json({ error: "Contact already added" });
    }

    req.user.contacts.push({ _id: contact._id, email: contact.email });
    contact.contacts.push({ _id: req.user._id, email: req.user.email });

    await Promise.all([req.user.save(), contact.save()]);
    console.log("Add-contact successful:", { userId: req.user._id, contactId: contact._id });
    res.json({ success: true, message: "Contact added", user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error("Add contact error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(403).json({ error: "Forbidden: Invalid token" });

    generateToken(res, decoded.id);
    res.json({ success: true, message: "Token refreshed" });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;