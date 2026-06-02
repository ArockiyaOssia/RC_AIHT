// ============================================
// EVENT CONTROLLER
// ============================================

import Event from "../models/Event.model.js"
import Expense from "../models/Expense.model.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { createAuditLog } from "../middleware/audit.middleware.js"
import { paginate, paginationResponse, getFinancialYear, deleteFile } from "../utils/helpers.js"
import { uploadToImageKit, deleteFromImageKit } from "../utils/imagekit.js"
import { logger } from "../utils/logger.js"
import User from "../models/User.model.js"
import { sendEmail, emailTemplates } from "../utils/email.js"

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Admin
export const createEvent = async (req, res) => {
  try {
    const settings = await ClubSettings.getSettings()
    const { name, description, startDate, endDate, category, tags, estimatedBudget, venue, coordinator, volunteers, attendees } =
      req.body

    let coverImage = undefined
    let coverImageId = undefined
    if (req.file) {
      const uploadResult = await uploadToImageKit(req.file.buffer, `event-${name}-${Date.now()}`, "events")
      coverImage = uploadResult.url
      coverImageId = uploadResult.fileId
    }

    const event = await Event.create({
      name,
      description,
      startDate,
      endDate,
      category,
      tags: tags || [],
      estimatedBudget,
      venue,
      coordinator,
      volunteers,
      attendees: parseInt(attendees) || 0,
      coverImage,
      coverImageId,
      createdBy: req.user._id,
      rotaractYear: settings.currentRotaractYear,
    })

    // Audit log
    await createAuditLog({
      action: "event_create",
      user: req.user,
      targetType: "event",
      targetId: event._id,
      description: `Event created: ${name}`,
      req,
    })

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    })

    // Real-time: notify members & admin dashboards about new event
    const io = req.app.get("io")
    if (io) {
      try {
        io.to("members").emit("new_event_added", {
          eventId: event._id,
          name: event.name,
          startDate: event.startDate,
        })
        io.to("admins").emit("dashboard_update", { reason: "event_created" })
      } catch (socketError) {
        logger.error(`Socket emit error (createEvent): ${socketError.message}`)
      }
    }

    // Email Broadcast
    try {
      const activeUsers = await User.find({ isActive: true }).select('email firstName')
      
      // Fire and forget mechanism to avoid blocking the request
      Promise.allSettled(
        activeUsers.map(user => {
          if (!user.email) return Promise.resolve()
          
          const emailContent = emailTemplates.newEventNotification(
            user.firstName, 
            event.name, 
            event.startDate, 
            event.category,
            event._id
          )
          
          return sendEmail({
            to: user.email,
            ...emailContent
          })
        })
      ).catch(e => logger.error(`Error in mass email broadcast: ${e.message}`))
      
    } catch (emailError) {
      logger.error(`Failed to broadcast event emails: ${emailError.message}`)
    }
    
  } catch (error) {
    logger.error(`Create event error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: error.message,
    })
  }
}

// @desc    Get all events
// @route   GET /api/events
// @access  Private
export const getEvents = async (req, res) => {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit)
    const { category, status, rotaractYear, search } = req.query

    // Build query
    const query = {}

    if (category) query.category = category
    if (status) query.status = status
    if (rotaractYear) query.rotaractYear = rotaractYear
    if (search) {
      query.$text = { $search: search }
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("coordinator", "firstName lastName")
        .populate("createdBy", "firstName lastName")
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Event.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      data: events,
      pagination: paginationResponse(total, page, limit),
    })
  } catch (error) {
    logger.error(`Get events error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get events",
    })
  }
}

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("coordinator", "firstName lastName email")
      .populate("volunteers", "firstName lastName")
      .populate("createdBy", "firstName lastName")

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    // Get event expenses summary
    const expensesSummary = await Expense.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ])

    const totalSpending = expensesSummary.reduce((sum, item) => sum + item.total, 0)

    res.status(200).json({
      success: true,
      data: {
        ...event.toObject(),
        expensesSummary,
        actualSpending: totalSpending,
      },
    })
  } catch (error) {
    logger.error(`Get event error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get event",
    })
  }
}

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    const allowedUpdates = [
      "name",
      "description",
      "startDate",
      "endDate",
      "category",
      "tags",
      "estimatedBudget",
      "venue",
      "coordinator",
      "volunteers",
      "reportLink",
      "attendees",
      "status",
    ]

    const updates = {}
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    if (req.file) {
      if (event.coverImageId) {
        await deleteFromImageKit(event.coverImageId)
      } else if (event.coverImage) {
        deleteFile(event.coverImage)
      }
      const uploadResult = await uploadToImageKit(req.file.buffer, `event-${event.name}-${Date.now()}`, "events")
      updates.coverImage = uploadResult.url
      updates.coverImageId = uploadResult.fileId
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })

    // Audit log
    await createAuditLog({
      action: "event_update",
      user: req.user,
      targetType: "event",
      targetId: event._id,
      description: `Event updated: ${event.name}`,
      changes: updates,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    })

    // Real-time: refresh dashboards when event updates
    const io = req.app.get("io")
    if (io) {
      try {
        io.to("admins").emit("dashboard_update", { reason: "event_updated" })
      } catch (socketError) {
        logger.error(`Socket emit error (updateEvent): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Update event error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update event",
    })
  }
}

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    // Check if event has expenses
    const expenseCount = await Expense.countDocuments({ event: event._id })
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete event with ${expenseCount} associated expenses`,
      })
    }

    await event.deleteOne()

    // Clean up physical files
    if (event.coverImageId) {
      await deleteFromImageKit(event.coverImageId)
    } else if (event.coverImage) {
      deleteFile(event.coverImage)
    }
    
    if (event.gallery && event.gallery.length > 0) {
      await Promise.all(
        event.gallery.map(async (img) => {
          if (img.fileId) {
            return deleteFromImageKit(img.fileId)
          } else if (img.url) {
            return deleteFile(img.url)
          }
        }),
      )
    }

    // Audit log
    await createAuditLog({
      action: "event_delete",
      user: req.user,
      targetType: "event",
      targetId: event._id,
      description: `Event deleted: ${event.name}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    })

    // Real-time: update dashboards after event deletion
    const io = req.app.get("io")
    if (io) {
      try {
        io.to("admins").emit("dashboard_update", { reason: "event_deleted" })
      } catch (socketError) {
        logger.error(`Socket emit error (deleteEvent): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Delete event error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    })
  }
}

// @desc    Add gallery images to event
// @route   POST /api/events/:id/gallery
// @access  Private/Admin
export const addGalleryImages = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      })
    }

    const uploadPromises = req.files.map(async (file) => {
      const uploadResult = await uploadToImageKit(file.buffer, `event-gallery-${Date.now()}`, "events")
      return {
        url: uploadResult.url,
        fileId: uploadResult.fileId,
        caption: "",
        uploadedAt: new Date(),
      }
    })

    const newImages = await Promise.all(uploadPromises)

    event.gallery.push(...newImages)
    await event.save()

    res.status(200).json({
      success: true,
      message: "Gallery images added successfully",
      data: event.gallery,
    })
  } catch (error) {
    logger.error(`Add gallery error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to add gallery images",
    })
  }
}

// @desc    Get events dropdown list (for expense form)
// @route   GET /api/events/dropdown
// @access  Private
export const getEventsDropdown = async (req, res) => {
  try {
    const settings = await ClubSettings.getSettings()
    const events = await Event.find({
      rotaractYear: settings.currentRotaractYear,
      isArchived: false,
    })
      .select("_id name startDate")
      .sort({ startDate: -1 })

    res.status(200).json({
      success: true,
      data: events,
    })
  } catch (error) {
    logger.error(`Get events dropdown error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get events",
    })
  }
}

export default {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addGalleryImages,
  getEventsDropdown,
}
