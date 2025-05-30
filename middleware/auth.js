import User from "../models/User.js";
import { verifyToken } from "../config/jwtToken.js";

export const auth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    console.log("Auth Middleware - Token received:", token ? "Yes" : "No"); // Log token presence
    if (!token) {
      console.log("Auth Middleware - No token provided in request");
      return res.status(401).json({ error: "No token unauthorized" });
    }

    const decoded = verifyToken(token);
    console.log("Auth Middleware - Token decoded:", decoded ? decoded : "Invalid"); // Log token decoding
    if (!decoded) {
      console.log("Auth Middleware - Invalid token:", token);
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    console.log("Auth Middleware - User lookup:", user ? `Found (ID: ${user._id})` : "Not found"); // Log user lookup
    if (!user) {
      console.log("Auth Middleware - User not found for token ID:", decoded.id);
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user;
    console.log("Auth Middleware - User authenticated:", { id: user._id, email: user.email });
    next();
  } catch (err) {
    console.error("Auth Middleware - Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};