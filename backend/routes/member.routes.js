// ============================================
// MEMBER ROUTES
// ============================================

import express from "express"
import {
  getDashboard,
  getProfile,
  updateProfile,
  updatePhoto,
  getMyExpenses,
  getExpense,
} from "../controllers/member.controller.js"
import { protect } from "../middleware/auth.middleware.js"
import { uploadPhotoMemory } from "../middleware/upload.middleware.js"
import { userValidation, queryValidation, paramValidation } from "../middleware/validation.middleware.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

router.get("/dashboard", getDashboard)
router.get("/profile", getProfile)
router.put("/profile", userValidation.updateProfile, updateProfile)
router.put("/profile/photo", uploadPhotoMemory, updatePhoto)
router.get("/expenses", queryValidation.pagination, getMyExpenses)
router.get("/expenses/:id", paramValidation.mongoId, getExpense)

export default router
