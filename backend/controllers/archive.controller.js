// ============================================
// ARCHIVE CONTROLLER
// ============================================

import Archive from "../models/Archive.model.js"
import User from "../models/User.model.js"
import Expense from "../models/Expense.model.js"
import Event from "../models/Event.model.js"
import Board from "../models/Board.model.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { createAuditLog } from "../middleware/audit.middleware.js"
import { getFinancialYear } from "../utils/helpers.js"
import { logger } from "../utils/logger.js"

// @desc    Get archive list
// @route   GET /api/archive
// @access  Private/Admin
export const getArchives = async (req, res) => {
  try {
    const archives = await Archive.find().populate("closedBy", "firstName lastName").sort({ rotaractYear: -1 })

    res.status(200).json({
      success: true,
      data: archives,
    })
  } catch (error) {
    logger.error(`Get archives error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get archives",
    })
  }
}

// @desc    Get archive by year
// @route   GET /api/archive/:year
// @access  Private/Admin
export const getArchiveByYear = async (req, res) => {
  try {
    const archive = await Archive.findOne({ rotaractYear: req.params.year }).populate("closedBy", "firstName lastName")

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archive not found for this year",
      })
    }

    res.status(200).json({
      success: true,
      data: archive,
    })
  } catch (error) {
    logger.error(`Get archive error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get archive",
    })
  }
}

// @desc    Close current year and create archive
// @route   POST /api/archive/close-year
// @access  Private/Treasurer
export const closeYear = async (req, res) => {
  try {
    const { notes, carryOverMembers } = req.body
    const settings = await ClubSettings.getSettings()
    const currentYear = settings.currentRotaractYear

    // Check if already archived
    const existingArchive = await Archive.findOne({
      rotaractYear: currentYear,
      status: "archived",
    })

    if (existingArchive) {
      return res.status(400).json({
        success: false,
        message: "This year has already been archived",
      })
    }

    // Calculate summary
    const [totalMembers, totalEvents, expensesSummary, board] = await Promise.all([
      User.countDocuments({ rotaractYear: currentYear, isActive: true }),
      Event.countDocuments({ rotaractYear: currentYear }),
      Expense.aggregate([
        { $match: { rotaractYear: currentYear } },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: "$amount" },
            totalContributions: {
              $sum: {
                $cond: [{ $in: ["$status", ["approved", "reimbursed", "paid"]] }, "$amount", 0],
              },
            },
            totalReimbursements: {
              $sum: {
                $cond: [{ $eq: ["$status", "reimbursed"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
      Board.findOne({ rotaractYear: currentYear }),
    ])

    const summary = expensesSummary[0] || {
      totalExpenses: 0,
      totalContributions: 0,
      totalReimbursements: 0,
    }

    // Create or update archive
    let archive = await Archive.findOne({ rotaractYear: currentYear })

    if (archive) {
      archive.status = "archived"
      archive.closedAt = new Date()
      archive.closedBy = req.user._id
      archive.notes = notes
    } else {
      archive = new Archive({
        rotaractYear: currentYear,
        status: "archived",
        closedAt: new Date(),
        closedBy: req.user._id,
        notes,
      })
    }

    archive.summary = {
      totalMembers,
      totalEvents,
      totalExpenses: summary.totalExpenses,
      totalContributions: summary.totalContributions,
      totalReimbursements: summary.totalReimbursements,
    }

    archive.boardSnapshot = {
      president: board?.members.find((m) => m.position === "president")?.name,
      secretary: board?.members.find((m) => m.position === "secretary")?.name,
      treasurer: board?.members.find((m) => m.position === "treasurer")?.name,
      theme: board?.theme,
    }

    await archive.save()

    // Mark all expenses and events as archived
    await Promise.all([
      Expense.updateMany({ rotaractYear: currentYear }, { isArchived: true }),
      Event.updateMany({ rotaractYear: currentYear }, { isArchived: true }),
      Board.updateOne({ rotaractYear: currentYear }, { isActive: false }),
    ])

    // Handle member carry over
    if (!carryOverMembers) {
      // Mark all non-admin members as alumni
      await User.updateMany(
        {
          rotaractYear: currentYear,
          role: "member",
        },
        {
          isAlumni: true,
          role: "alumni",
        },
      )
    }

    // Audit log
    await createAuditLog({
      action: "year_close",
      user: req.user,
      targetType: "archive",
      targetId: archive._id,
      description: `Year ${currentYear} closed and archived`,
      req,
    })

    res.status(200).json({
      success: true,
      message: `Year ${currentYear} has been closed and archived`,
      data: archive,
    })

    // Real-time: notify president & secretary/treasurer group about year archive
    const io = req.app.get("io")
    if (io) {
      try {
        // Notify treasurer room (includes treasurer, president, secretary per auth middleware)
        io.to("treasurer").emit("year_archived", {
          year: currentYear,
          archiveId: archive._id,
        })

        io.to("admins").emit("dashboard_update", { reason: "year_archived" })
      } catch (socketError) {
        logger.error(`Socket emit error (closeYear): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Close year error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to close year",
      error: error.message,
    })
  }
}

// @desc    Start new year
// @route   POST /api/archive/start-new-year
// @access  Private/Treasurer
export const startNewYear = async (req, res) => {
  try {
    const { newYear, theme, carryOverMembers } = req.body

    if (!newYear) {
      return res.status(400).json({
        success: false,
        message: "New year is required (e.g., 2026-2027)",
      })
    }

    // Update club settings
    const settings = await ClubSettings.getSettings()
    settings.currentRotaractYear = newYear
    settings.themeOfYear = theme || ""
    settings.yearStartDate = new Date()
    await settings.save()

    // Create new board entry
    await Board.create({
      rotaractYear: newYear,
      theme: theme || "",
      isActive: true,
    })

    // Create archive entry for new year
    await Archive.create({
      rotaractYear: newYear,
      status: "active",
    })

    // Update members if carrying over
    if (carryOverMembers) {
      await User.updateMany({ isActive: true, isAlumni: false }, { rotaractYear: newYear })
    }

    // Audit log
    await createAuditLog({
      action: "archive_create",
      user: req.user,
      targetType: "archive",
      description: `New year ${newYear} started`,
      req,
    })

    res.status(200).json({
      success: true,
      message: `New year ${newYear} has been started`,
      data: {
        currentYear: newYear,
        theme,
      },
    })
  } catch (error) {
    logger.error(`Start new year error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to start new year",
      error: error.message,
    })
  }
}

// @desc    Add file to archive
// @route   POST /api/archive/:year/files
// @access  Private/Treasurer
export const addArchiveFile = async (req, res) => {
  try {
    const { type, name } = req.body

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      })
    }

    const archive = await Archive.findOne({ rotaractYear: req.params.year })

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archive not found",
      })
    }

    const uploadResult = await uploadToImageKit(
      req.file.buffer, 
      `archive-${req.params.year}-${req.file.originalname}`, 
      "archives"
    )

    archive.files.push({
      name: name || req.file.originalname,
      type: type || "other",
      url: uploadResult.url,
      fileId: uploadResult.fileId,
    })

    await archive.save()

    res.status(200).json({
      success: true,
      message: "File added to archive",
      data: archive.files,
    })
  } catch (error) {
    logger.error(`Add archive file error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to add file",
    })
  }
}

export default {
  getArchives,
  getArchiveByYear,
  closeYear,
  startNewYear,
  addArchiveFile,
}
