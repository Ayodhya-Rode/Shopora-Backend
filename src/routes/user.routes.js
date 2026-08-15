import express from "express";
import {
  RegisterUser,
  LoginUser,
  LogoutUser,
  RefreshAccessToken,
  GetUserProfile,
  UpdateUserProfile
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/user-register", RegisterUser);
router.post("/user-login", LoginUser);
router.post("/user-logout", LogoutUser);
router.post("/user-refreshToken", RefreshAccessToken);
router.get("/user-profile", protect, authorize("user"), GetUserProfile);
router.put("/user-profile", protect, authorize("user"), UpdateUserProfile);

export default router;
