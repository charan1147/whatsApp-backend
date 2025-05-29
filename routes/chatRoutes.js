import express from "express";
import { getMessages } from "../controllers/chatController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/messages/:contactId", auth, getMessages);

export default router;