import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({ email, password });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('contacts', 'email');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ user: { id: user._id, email: user.email, contacts: user.contacts } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('contacts', 'email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: user._id, email: user.email, contacts: user.contacts } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully' });
};

export const addContact = async (req, res) => {
  const { email } = req.body;
  try {
    const contact = await User.findOne({ email });
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    if (req.user.email === email) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }
    if (req.user.contacts.includes(contact._id)) {
      return res.status(400).json({ error: 'Contact already added' });
    }
    req.user.contacts.push(contact._id);
    await req.user.save();
    if (!contact.contacts.includes(req.user._id)) {
      contact.contacts.push(req.user._id);
      await contact.save();
    }
    const updatedUser = await User.findById(req.user._id).populate('contacts', 'email');
    res.json({ contact: { id: contact._id, email: contact.email }, user: { id: updatedUser._id, email: updatedUser.email, contacts: updatedUser.contacts } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};