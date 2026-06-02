// ============================================
// EVENT ROUTES
// ============================================

import express from "express"
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addGalleryImages,
  getEventsDropdown,
} from "../controllers/event.controller.js"
import { protect, adminOnly } from "../middleware/auth.middleware.js"
import { uploadPhotoMemory, uploadGalleryMemory } from "../middleware/upload.middleware.js"
import { eventValidation, paramValidation, queryValidation } from "../middleware/validation.middleware.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

router.get("/dropdown", getEventsDropdown)
router.get("/", queryValidation.pagination, getEvents)
router.get("/:id", paramValidation.mongoId, getEventById)

// Admin routes
router.post("/", adminOnly, uploadPhotoMemory, eventValidation.create, createEvent)
router.put("/:id", adminOnly, uploadPhotoMemory, updateEvent)
router.delete("/:id", adminOnly, deleteEvent)
router.post("/:id/gallery", adminOnly, uploadGalleryMemory, addGalleryImages)

export default router
