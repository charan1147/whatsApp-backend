import express from 'express';
import  { sendMessage, getMessages } from '../controllers/chatController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
router.post('/send', auth, sendMessage);
router.get('/messages/:contactId', auth, getMessages);

export default router