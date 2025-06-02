import { verifyToken } from "../config/jwtToken.js"

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};