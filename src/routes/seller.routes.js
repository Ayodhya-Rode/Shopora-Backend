import express from "express";
import {
  RegisterSeller,
  LoginSeller,
  RefreshAccessToken,
  LogoutSeller,
  GetSellerProfile,
  UpdateSellerProfile
} from "../controllers/seller.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/seller-register", RegisterSeller);
router.post("/seller-login", LoginSeller);
router.post("/seller-refreshToken", RefreshAccessToken);
router.post("/seller-logout", LogoutSeller);
router.get("/seller-profile", protect, authorize("seller"), GetSellerProfile);
router.put("/seller-profile", protect, authorize("seller"), UpdateSellerProfile);


export default router;
