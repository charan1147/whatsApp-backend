import { verifyToken } from '../config/jwtToken.js';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware: Checking JWT cookie');
    const token = req.cookies.jwt;
    if (!token) {
      console.log('Auth middleware: No JWT token found');
      return res.status(401).json({ error: 'Unauthorized: Token missing' });
    }

    console.log('Auth middleware: Verifying token');
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Auth middleware: Invalid token');
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    console.log('Auth middleware: JWT verified, userId:', decoded.id);
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Auth middleware: No user found for ID:', decoded.id);
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
