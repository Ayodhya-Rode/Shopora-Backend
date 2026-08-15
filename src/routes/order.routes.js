import express from "express";
import {
  PlaceOrder,
  GetMyOrders,
  GetOrderById,
  CancelOrder,
  GetSellerOrders,
  UpdateOrderStatus,
  CreatePaymentOrder,
  GetSellerSalesAnalytics,
} from "../controllers/order.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/place-order", protect, authorize("user"), PlaceOrder);
router.get("/my-orders", protect, authorize("user"), GetMyOrders);
router.get("/order/:id", protect, authorize("user"), GetOrderById);

//soft delete -> don't delete order history only change status pending to cancelled
router.put("/cancel-order/:id", protect, authorize("user"), CancelOrder);

//only user can to payment of their order
router.post(
  "/create-payment-order",
  protect,
  authorize("user"),
  CreatePaymentOrder,
);

router.get("/seller-orders", protect, authorize("seller"), GetSellerOrders);

router.put(
  "/seller-update-status/:id",
  protect,
  authorize("seller"),
  UpdateOrderStatus,
);

router.get(
  "/seller/sales-analytics",
  protect,
  authorize("seller"),
  GetSellerSalesAnalytics,
);

export default router;
