import express from "express";
import {
  AddToCart,
  GetCart,
  UpdateCartItem,
  RemoveCartItem,
  ClearCart,
} from "../controllers/cart.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-to-cart", protect, authorize("user"), AddToCart);
router.get("/get-cart", protect, authorize("user"), GetCart);
router.put("/update-cart-item", protect, authorize("user"), UpdateCartItem);
router.delete("/remove-cart-item", protect, authorize("user"), RemoveCartItem);
router.delete("/clear-cart", protect, authorize("user"), ClearCart);

export default router;