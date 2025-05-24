import jwt from 'jsonwebtoken';
import User  from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware: Checking JWT cookie');
    const token = req.cookies.jwt;
    if (!token) {
      console.log('Auth middleware: No JWT token found in cookies');
      return res.status(401).json({ error: 'No authorization, token missing' });
    }
    console.log('Auth middleware: Verifying JWT token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware: JWT verified, userId:', decoded.userId);
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Auth middleware: User not found for userId:', decoded.userId);
      return res.status(401).json({ error: 'No authorization, user not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message, err.stack);
    res.status(401).json({ error: 'No authorization, invalid token' });
  }
};