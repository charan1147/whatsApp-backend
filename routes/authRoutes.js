import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  addContact,
  logoutUser,
  refreshToken,
} from "../controllers/authController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", auth, getCurrentUser);
router.post("/add-contact", auth, addContact);
router.post("/logout", logoutUser);
router.post("/refresh-token", refreshToken);

export default router;
