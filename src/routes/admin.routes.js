import express from "express"
import { RegisterAdmin,LoginAdmin,RefreshAccessToken,LogoutAdmin,GetAdminProfile,GetAllSellers,BlockSeller,UnblockSeller } from "../controllers/admin.controller.js"
import { protect,authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/admin-register", RegisterAdmin)
router.post("/admin-login",LoginAdmin)
router.post("/admin-refreshToken",RefreshAccessToken)
router.post("/admin-logout",LogoutAdmin)
router.get("/admin-profile",protect, authorize("admin"), GetAdminProfile)

router.get("/sellers", protect, authorize("admin"), GetAllSellers)
router.put("/block-seller/:id", protect, authorize("admin"), BlockSeller)
router.put("/unblock-seller/:id", protect, authorize("admin"), UnblockSeller)

export default router