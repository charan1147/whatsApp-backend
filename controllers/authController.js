import User from "../models/User.js";
import { generateToken, verifyToken } from "../config/jwtToken.js";

export const registerUser = async (req, res) => {
  const { email, password } = req.body;
  try {
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
      token, // Include token in response
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
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
      token, // Include token in response
      message: "Logged in successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    res.json({ success: true, user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    const contact = await User.findOne({ email });

    if (!contact) return res.status(404).json({ error: "User not found" });
    if (contact._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }
    if (req.user.contacts.some((c) => c._id.toString() === contact._id.toString())) {
      return res.status(400).json({ error: "Contact already added" });
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
    console.error("Add contact error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};


export const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
export const refreshToken = (req, res) => {
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
};
