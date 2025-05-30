import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../config/jwtToken.js";

// Register user
export const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const user = await User.create({ email, password, contacts: [] });

    generateToken(res, user._id);
    res.status(201).json({
      success: true,
      message: "User registered",
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid credentials" });

    generateToken(res, user._id);
    res.json({
      success: true,
      user: { id: user._id, email: user.email, contacts: user.contacts },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        contacts: req.user.contacts,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Add contact
export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    const contact = await User.findOne({ email });

    if (!contact) return res.status(404).json({ error: "User not found" });
    if (contact._id.toString() === req.user._id.toString())
      return res.status(400).json({ error: "Cannot add yourself" });

    const alreadyAdded = req.user.contacts.some(
      (c) => c._id.toString() === contact._id.toString()
    );
    if (alreadyAdded)
      return res.status(400).json({ error: "Contact already added" });

    req.user.contacts.push({ _id: contact._id, email: contact.email });
    contact.contacts.push({ _id: req.user._id, email: req.user.email });

    await Promise.all([req.user.save(), contact.save()]);

    res.json({
      success: true,
      message: "Contact added",
      user: {
        id: req.user._id,
        email: req.user.email,
        contacts: req.user.contacts,
      },
    });
  } catch (err) {
    console.error("Add contact error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Logout user
export const logoutUser = async (req, res) => {
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
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Token missing" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(403).json({ error: "Invalid token" });

    generateToken(res, decoded.id);
    res.json({ success: true, message: "Token refreshed" });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
