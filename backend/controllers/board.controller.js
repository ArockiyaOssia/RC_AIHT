// ============================================
// BOARD CONTROLLER
// ============================================

import Board from "../models/Board.model.js"
import { createAuditLog } from "../middleware/audit.middleware.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { getFinancialYear, deleteFile } from "../utils/helpers.js"
import { uploadToImageKit, deleteFromImageKit } from "../utils/imagekit.js"
import { logger } from "../utils/logger.js"

// @desc    Get current board
// @route   GET /api/board
// @access  Public
export const getCurrentBoard = async (req, res) => {
  try {
    const settings = await ClubSettings.getSettings()
    const currentYear = settings.currentRotaractYear

    let board = await Board.findOne({ rotaractYear: currentYear, isActive: true }).populate(
      "members.user",
      "firstName lastName email photo",
    )

    if (!board) {
      // Return empty board structure
      board = {
        rotaractYear: currentYear,
        members: [],
        theme: "",
        isActive: true,
      }
    }

    res.status(200).json({
      success: true,
      data: board,
    })
  } catch (error) {
    logger.error(`Get board error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get board",
    })
  }
}

// @desc    Get board by year
// @route   GET /api/board/:year
// @access  Public
export const getBoardByYear = async (req, res) => {
  try {
    const board = await Board.findOne({ rotaractYear: req.params.year }).populate(
      "members.user",
      "firstName lastName email photo",
    )

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found for this year",
      })
    }

    res.status(200).json({
      success: true,
      data: board,
    })
  } catch (error) {
    logger.error(`Get board by year error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get board",
    })
  }
}

// @desc    Create or update board
// @route   POST /api/board
// @access  Private/Admin
export const createOrUpdateBoard = async (req, res) => {
  try {
    const { rotaractYear, theme, themeDescription, members, installationDate, installationVenue } = req.body

    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    let board = await Board.findOne({ rotaractYear: year })

    if (board) {
      // Update existing board
      board.theme = theme || board.theme
      board.themeDescription = themeDescription || board.themeDescription
      board.members = members || board.members
      board.installationDate = installationDate || board.installationDate
      board.installationVenue = installationVenue || board.installationVenue

      if (req.files?.boardPhoto) {
        if (board.boardPhotoId) {
          await deleteFromImageKit(board.boardPhotoId)
        } else if (board.boardPhoto) {
          deleteFile(board.boardPhoto)
        }
        
        const uploadResult = await uploadToImageKit(req.files.boardPhoto[0].buffer, `board-${year}`, "board")
        board.boardPhoto = uploadResult.url
        board.boardPhotoId = uploadResult.fileId
      }
      if (req.files?.bannerImage) {
        if (board.bannerImageId) {
          await deleteFromImageKit(board.bannerImageId)
        } else if (board.bannerImage) {
          deleteFile(board.bannerImage)
        }
        
        const uploadResult = await uploadToImageKit(req.files.bannerImage[0].buffer, `banner-${year}`, "board")
        board.bannerImage = uploadResult.url
        board.bannerImageId = uploadResult.fileId
      }

      await board.save()
    } else {
      // Create new board
      const createData = {
        rotaractYear: year,
        theme,
        themeDescription,
        members: members || [],
        installationDate,
        installationVenue,
      }

      if (req.files?.boardPhoto) {
        const uploadResult = await uploadToImageKit(req.files.boardPhoto[0].buffer, `board-${year}`, "board")
        createData.boardPhoto = uploadResult.url
        createData.boardPhotoId = uploadResult.fileId
      }
      if (req.files?.bannerImage) {
        const uploadResult = await uploadToImageKit(req.files.bannerImage[0].buffer, `banner-${year}`, "board")
        createData.bannerImage = uploadResult.url
        createData.bannerImageId = uploadResult.fileId
      }

      board = await Board.create(createData)
    }

    // Audit log
    await createAuditLog({
      action: "board_update",
      user: req.user,
      targetType: "board",
      targetId: board._id,
      description: `Board updated for ${year}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Board updated successfully",
      data: board,
    })

    // Real-time: notify members & admin dashboards about board change
    const io = req.app.get("io")
    if (io) {
      try {
        io.to("members").emit("board_updated", {
          year: year,
        })
        io.to("admins").emit("dashboard_update", { reason: "board_updated" })
      } catch (socketError) {
        logger.error(`Socket emit error (createOrUpdateBoard): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Create/update board error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update board",
      error: error.message,
    })
  }
}

// @desc    Update board member
// @route   PUT /api/board/member
// @access  Private/Admin
export const updateBoardMember = async (req, res) => {
  try {
    const { position, name, email, phone, linkedIn, userId, photo } = req.body

    const settings = await ClubSettings.getSettings()
    const currentYear = settings.currentRotaractYear
    let board = await Board.findOne({ rotaractYear: currentYear })

    if (!board) {
      board = await Board.create({ rotaractYear: currentYear })
    }

    // Find and update or add member
    const memberIndex = board.members.findIndex((m) => m.position === position)

    // Build member payload
    const memberData = {
      position,
      name,
      email,
      phone,
      linkedIn,
      user: userId,
    }

    // Prefer uploaded file if present, otherwise accept photo URL from body
    if (req.file) {
      if (memberIndex >= 0 && board.members[memberIndex].photoId) {
        await deleteFromImageKit(board.members[memberIndex].photoId)
      } else if (memberIndex >= 0 && board.members[memberIndex].photo) {
        deleteFile(board.members[memberIndex].photo)
      }
      
      const uploadResult = await uploadToImageKit(req.file.buffer, `member-${position}-${Date.now()}`, "board")
      memberData.photo = uploadResult.url
      memberData.photoId = uploadResult.fileId
    } else if (photo) {
      memberData.photo = photo
    }

    if (memberIndex >= 0) {
      // Update existing member (works for both Mongoose subdocs and plain objects)
      const existing = board.members[memberIndex]
      const base =
        typeof existing.toObject === "function"
          ? existing.toObject()
          : existing

      board.members[memberIndex] = {
        ...base,
        ...memberData,
      }
    } else {
      // Add new member
      board.members.push(memberData)
    }

    await board.save()

    // Audit log
    await createAuditLog({
      action: "board_update",
      user: req.user,
      targetType: "board",
      targetId: board._id,
      description: `Board member updated: ${position}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Board member updated successfully",
      data: board,
    })
  } catch (error) {
    logger.error(`Update board member error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update board member",
    })
  }
}

// @desc    Get all boards (history)
// @route   GET /api/board/history
// @access  Public
export const getBoardHistory = async (req, res) => {
  try {
    const boards = await Board.find()
      .select("rotaractYear theme installationDate boardPhoto")
      .sort({ rotaractYear: -1 })

    res.status(200).json({
      success: true,
      data: boards,
    })
  } catch (error) {
    logger.error(`Get board history error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get board history",
    })
  }
}

export default {
  getCurrentBoard,
  getBoardByYear,
  createOrUpdateBoard,
  updateBoardMember,
  getBoardHistory,
}
