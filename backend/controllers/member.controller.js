// ============================================
// MEMBER CONTROLLER
// ============================================

import User from "../models/User.model.js"
import Expense from "../models/Expense.model.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { createAuditLog } from "../middleware/audit.middleware.js"
import { paginate, paginationResponse, getFinancialYear, deleteFile } from "../utils/helpers.js"
import { uploadToImageKit, deleteFromImageKit } from "../utils/imagekit.js"
import { logger } from "../utils/logger.js"

// @desc    Get member dashboard data
// @route   GET /api/members/dashboard
// @access  Private
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id
    const settings = await ClubSettings.getSettings()
    const currentYear = settings.currentRotaractYear

    // Get member's expenses summary
    const expensesSummary = await Expense.aggregate([
      {
        $match: {
          member: userId,
          rotaractYear: currentYear,
        },
      },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ])

    // Calculate totals
    const summary = {
      totalContribution: 0,
      pendingReimbursements: 0,
      approvedExpenses: 0,
      rejectedExpenses: 0,
      paidExpenses: 0,
    }

    expensesSummary.forEach((item) => {
      if (item._id === "pending") {
        summary.pendingReimbursements = item.total
      } else if (item._id === "approved") {
        summary.approvedExpenses = item.total
      } else if (item._id === "rejected") {
        summary.rejectedExpenses = item.total
      } else if (item._id === "paid" || item._id === "reimbursed") {
        summary.paidExpenses = item.total
      }
      summary.totalContribution += item.total
    })

    // Get recent expenses
    const recentExpenses = await Expense.find({ member: userId })
      .populate("event", "name")
      .sort({ createdAt: -1 })
      .limit(5)

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.fullName,
          memberId: req.user.memberId,
          role: req.user.role,
          rotaractYear: req.user.rotaractYear,
          photo: req.user.photo,
        },
        summary,
        recentExpenses,
      },
    })
  } catch (error) {
    logger.error(`Dashboard error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    })
  }
}

// @desc    Get member profile
// @route   GET /api/members/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    })
  }
}

// @desc    Update member profile
// @route   PUT /api/members/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ["firstName", "lastName", "phone", "dateOfBirth", "address", "collegeName", "courseName"]

    const updates = {}
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })

    // Audit log
    await createAuditLog({
      action: "profile_update",
      user: req.user,
      targetType: "user",
      targetId: user._id,
      description: "Profile updated",
      changes: updates,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    })
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    })
  }
}

// @desc    Update profile photo
// @route   PUT /api/members/profile/photo
// @access  Private
export const updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a photo",
      })
    }

    // Upload optimized image to ImageKit
    const uploadResult = await uploadToImageKit(
      req.file.buffer,
      `photo-${req.user._id}-${Date.now()}`,
      "photos"
    )

    const photoUrl = uploadResult.url
    const photoId = uploadResult.fileId

    const currentUser = await User.findById(req.user._id)
    
    // Delete old photo from ImageKit if it exists
    if (currentUser && currentUser.photoId) {
      await deleteFromImageKit(currentUser.photoId)
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { photo: photoUrl, photoId: photoId }, 
      { new: true }
    )

    res.status(200).json({
      success: true,
      message: "Photo updated successfully",
      data: { photo: user.photo },
    })
  } catch (error) {
    logger.error(`Update photo error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update photo",
    })
  }
}

// @desc    Get member's expense history
// @route   GET /api/members/expenses
// @access  Private
export const getMyExpenses = async (req, res) => {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit)
    const { status, category, event, month, year } = req.query

    // Build query
    const query = { member: req.user._id }

    if (status) query.status = status
    if (category) query.category = category
    if (event) query.event = event

    // Date filter
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("event", "name")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Expense.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: paginationResponse(total, page, limit),
    })
  } catch (error) {
    logger.error(`Get expenses error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get expenses",
    })
  }
}

// @desc    Get single expense
// @route   GET /api/members/expenses/:id
// @access  Private
export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      member: req.user._id,
    }).populate("event", "name")

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    res.status(200).json({
      success: true,
      data: expense,
    })
  } catch (error) {
    logger.error(`Get expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get expense",
    })
  }
}

export default {
  getDashboard,
  getProfile,
  updateProfile,
  updatePhoto,
  getMyExpenses,
  getExpense,
}
