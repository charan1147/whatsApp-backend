import { Router } from "express";
import { registerUser, loginUser, getCurrentUser, logoutUser, addContact, refreshToken } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", auth, getCurrentUser);
router.post("/logout", auth, logoutUser);
router.post("/add-contact", auth, addContact);
router.post("/refresh-token", refreshToken);

export default router;