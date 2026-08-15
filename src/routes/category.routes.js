import express from "express"
import { CreateCategory,GetAllCategories,GetCategoryById,UpdateCategory,DeleteCategory } from "../controllers/category.controller.js"
import { protect,authorize } from "../middleware/authMiddleware.js"

const router = express.Router()

//protected - only admin can create category
router.post("/create-category",protect,authorize("admin"), CreateCategory)
router.get("/categories", GetAllCategories)
router.get("/category/:id", GetCategoryById);
router.put("/update-category/:id",protect,authorize("admin"),UpdateCategory)
router.delete("/delete-category/:id",protect,authorize("admin"),DeleteCategory)

export default router
