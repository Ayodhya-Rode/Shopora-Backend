import express from "express";
import {
  CreateReview,
  GetProductReviews,
  UpdateReview,
  DeleteReview,
} from "../controllers/review.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-review", protect, authorize("user"), CreateReview);
router.get("/product/:productId", GetProductReviews); // public
router.put("/update-review/:id", protect, authorize("user"), UpdateReview);
router.delete("/delete-review/:id", protect, authorize("user"), DeleteReview);

export default router;