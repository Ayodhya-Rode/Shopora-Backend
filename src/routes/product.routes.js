import express from "express";
import {
  CreateProduct,
  GetAllProducts,
  GetProductById,
  UpdateProduct,
  DeleteProduct,
  GetProductsByCategory,
  GetMyProducts,
  GetRecommendedProducts
} from "../controllers/product.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadImageMiddleware.js";

const router = express.Router();

router.post(
  "/create-product",
  protect,
  authorize("seller"),
  upload.array("images", 5),
  CreateProduct,
);
router.get("/all-product", GetAllProducts);
router.get("/get-product/:id", GetProductById);
router.put(
  "/update-product/:id",
  protect,
  authorize("seller"),
  upload.array("images", 5),
  UpdateProduct,
);
router.delete(
  "/delete-product/:id",
  protect,
  authorize("seller"),
  DeleteProduct,
);
router.get("/products-by-category/:slug", GetProductsByCategory);
router.get("/my-products", protect, authorize("seller"), GetMyProducts);

router.get("/recommendations/:id", GetRecommendedProducts);

export default router;
