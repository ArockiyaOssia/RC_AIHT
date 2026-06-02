// ============================================
// ARCHIVE ROUTES
// ============================================

import express from "express"
import {
  getArchives,
  getArchiveByYear,
  closeYear,
  startNewYear,
  addArchiveFile,
} from "../controllers/archive.controller.js"
import { protect, adminOnly, treasurerOnly } from "../middleware/auth.middleware.js"
import { upload, memoryUpload } from "../middleware/upload.middleware.js"

const router = express.Router()

// All routes require authentication and admin access
router.use(protect)
router.use(adminOnly)

router.get("/", getArchives)
router.get("/:year", getArchiveByYear)
router.post("/close-year", treasurerOnly, closeYear)
router.post("/start-new-year", treasurerOnly, startNewYear)
router.post("/:year/files", treasurerOnly, memoryUpload.single("file"), addArchiveFile)

export default router
