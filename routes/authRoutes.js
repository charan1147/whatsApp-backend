import express from 'express';
import { register, login, addContact, me, logout } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, me);
router.post('/add-contact', auth, addContact);
router.post('/logout', auth, logout);

export default router;