import express from "express";
import {
  AddToWishlist,
  RemoveFromWishlist,
  GetWishlist,
} from "../controllers/wishlist.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-to-wishlist", protect, authorize("user"), AddToWishlist);
router.get("/get-wishlist", protect, authorize("user"), GetWishlist);
router.delete(
  "/remove-from-wishlist/:productId",
  protect,
  authorize("user"),
  RemoveFromWishlist
);

export default router;