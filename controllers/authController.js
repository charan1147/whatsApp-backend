import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Validation failed: Email or password missing');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    console.log('Checking for existing user:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
    console.log('Creating new user:', email);
    const user = await User.create({ email, password, contacts: [] });
    console.log('User created successfully:', user.email);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.error('Register error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie('jwt', token, { 
      httpOnly: true, 
      secure: process.env.LOCAL_TESTING === 'true' ? false : process.env.NODE_ENV === 'production',
      sameSite: process.env.LOCAL_TESTING === 'true' ? 'lax' : process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ user: { id: user._id, email: user.email, contacts: user.contacts } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const me = async (req, res) => {
  try {
    console.log('Me request for user:', req.user.email);
    res.json({ user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error('Me error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addContact = async (req, res) => {
  try {
    console.log('Add contact request:', req.body);
    const { email } = req.body;
    const contact = await User.findOne({ email });
    if (!contact) {
      console.log('Contact not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    if (contact._id.toString() === req.user._id.toString()) {
      console.log('Cannot add self:', email);
      return res.status(400).json({ error: 'Cannot add yourself' });
    }
    if (req.user.contacts.some((c) => c._id.toString() === contact._id.toString())) {
      console.log('Contact already added:', email);
      return res.status(400).json({ error: 'Contact already added' });
    }
    req.user.contacts.push({ _id: contact._id, email: contact.email });
    contact.contacts.push({ _id: req.user._id, email: req.user.email });
    await req.user.save();
    await contact.save();
    console.log('Contact added successfully:', email);
    res.json({ message: 'Contact added', user: { id: req.user._id, email: req.user.email, contacts: req.user.contacts } });
  } catch (err) {
    console.error('Add contact error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

export const logout = async (req, res) => {
  try {
    console.log('Logout request received');
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    console.log('JWT cookie cleared');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error' });
  }
};