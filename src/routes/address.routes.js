import express from "express";
import {
  AddAddress,
  GetMyAddresses,
  UpdateAddress,
  DeleteAddress,
  SetDefaultAddress,
} from "../controllers/address.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-address", protect, authorize("user"), AddAddress);
router.get("/my-addresses", protect, authorize("user"), GetMyAddresses);
router.put("/update-address/:id", protect, authorize("user"), UpdateAddress);
router.delete("/delete-address/:id", protect, authorize("user"), DeleteAddress);
router.put("/set-default/:id", protect, authorize("user"), SetDefaultAddress);

export default router;