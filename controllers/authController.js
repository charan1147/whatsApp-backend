import User from "../models/User.js";
import { generateToken, verifyToken } from "../config/jwtToken.js";

export const registerUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`Auth Controller - Registering user with email: ${email}`);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }
    const user = new User({ email, password });
    await user.save();
    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      user: { id: user._id, email: user.email, contacts: user.contacts },
      token,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Auth Controller - Register error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`Auth Controller - Logging in user with email: ${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }
    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      user: { id: user._id, email: user.email, contacts: user.contacts },
      token,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Auth Controller - Login error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    console.log(`Auth Controller - Fetching current user: ${req.user.email}`);
    if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });

    res.json({ success: true, user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error("Auth Controller - Get current user error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Auth Controller - Adding contact with email: ${email} for user: ${req.user.email}`);
    const contact = await User.findOne({ email });

    if (!contact) return res.status(404).json({ success: false, error: "User not found" });
    if (contact._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: "Cannot add yourself" });
    }
    if (req.user.contacts.some((c) => c._id.toString() === contact._id.toString())) {
      return res.status(400).json({ success: false, error: "Contact already added" });
    }

    req.user.contacts.push({ _id: contact._id, email: contact.email });
    contact.contacts.push({ _id: req.user._id, email: req.user.email });

    await Promise.all([req.user.save(), contact.save()]);
    res.json({
      success: true,
      message: "Contact added",
      user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts },
    });
  } catch (err) {
    console.error("Auth Controller - Add contact error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const logoutUser = async (req, res) => {
  try {
    console.log(`Auth Controller - Logging out user: ${req.user.email}`);
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Auth Controller - Logout error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const refreshToken = (req, res) => {
  try {
    console.log("Auth Controller - Refreshing token");
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized: Token missing" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ success: false, error: "Forbidden: Invalid token" });
    }
    const newToken = generateToken(decoded.id);
    res.json({ success: true, token: newToken, message: "Token refreshed" });
  } catch (err) {
    console.error("Auth Controller - Refresh token error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};