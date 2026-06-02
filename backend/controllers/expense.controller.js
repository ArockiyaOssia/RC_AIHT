// ============================================
// EXPENSE CONTROLLER
// ============================================

import mongoose from "mongoose"
import Expense from "../models/Expense.model.js"
import Event from "../models/Event.model.js"
import User from "../models/User.model.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { createAuditLog } from "../middleware/audit.middleware.js"
import { sendEmail, emailTemplates } from "../utils/email.js"
import { paginate, paginationResponse, getFinancialYear, deleteFile } from "../utils/helpers.js"
import { uploadToImageKit, deleteFromImageKit } from "../utils/imagekit.js"
import { logger } from "../utils/logger.js"

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
export const createExpense = async (req, res) => {
  try {
    const settings = await ClubSettings.getSettings()
    const { event, category, amount, date, paymentMode, description, notes } = req.body

    // Verify event exists
    const eventDoc = await Event.findById(event)
    if (!eventDoc) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    let billUrl = undefined
    let billFileId = undefined
    if (req.file) {
      const uploadResult = await uploadToImageKit(req.file.buffer, `bill-${req.user._id}-${Date.now()}`, "bills")
      billUrl = uploadResult.url
      billFileId = uploadResult.fileId
    }

    // Create expense
    const expense = await Expense.create({
      member: req.user._id,
      event,
      category,
      amount,
      date,
      paymentMode,
      description,
      notes,
      billUrl,
      billFileId,
      billOriginalName: req.file?.originalname,
      rotaractYear: settings.currentRotaractYear,
    })

    // Populate for response
    await expense.populate([
      { path: "event", select: "name" },
      { path: "member", select: "firstName lastName email" },
    ])

    // Send email to member
    const submittedEmail = emailTemplates.expenseSubmitted(req.user.firstName, amount, eventDoc.name)
    sendEmail({
      to: req.user.email,
      ...submittedEmail,
    }).catch(err => logger.error(`Email failed: ${err.message}`))

    // Send alert to treasurer
    const treasurer = await User.findOne({ role: "treasurer", isActive: true })
    if (treasurer) {
      const alertEmail = emailTemplates.newExpenseAlert(treasurer.firstName, req.user.fullName, amount, eventDoc.name)
      sendEmail({
        to: treasurer.email,
        ...alertEmail,
      }).catch(err => logger.error(`Email failed: ${err.message}`))
    }

    // Audit log
    await createAuditLog({
      action: "expense_create",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Expense submitted: ₹${amount} for ${eventDoc.name}`,
      req,
    })

    res.status(201).json({
      success: true,
      message: "Expense submitted successfully",
      data: expense,
    })

    // Real-time: notify treasurer & admin dashboards
    const io = req.app.get("io")
    if (io) {
      try {
        io.to("treasurer").emit("new_expense_notification", {
          type: "expense_submitted",
          expenseId: expense._id,
          memberId: expense.member._id,
          memberName: `${expense.member.firstName} ${expense.member.lastName}`,
          event: expense.event.name,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
        })

        io.to("admins").emit("dashboard_update", { reason: "expense_submitted" })
        io.to("admins").emit("refresh_expense_table", {})
      } catch (socketError) {
        logger.error(`Socket emit error (createExpense): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Create expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to submit expense",
      error: error.message,
    })
  }
}

// @desc    Get all expenses (Admin)
// @route   GET /api/expenses/all
// @access  Private/Admin
export const getAllExpenses = async (req, res) => {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit)
    const { status, category, event, member, month, year, rotaractYear } = req.query

    // Build query
    const query = {}

    if (status) query.status = status
    if (category) query.category = category
    if (event) query.event = event
    if (member) query.member = member
    if (rotaractYear) query.rotaractYear = rotaractYear

    // Date filter
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("event", "name")
        .populate("member", "firstName lastName email memberId role")
        .populate("approvedBy", "firstName lastName")
        .sort({ createdAt: -1 })
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
    logger.error(`Get all expenses error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get expenses",
    })
  }
}

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("event", "name")
      .populate("member", "firstName lastName email memberId phone")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .populate("reimbursedBy", "firstName lastName")

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    // Check authorization (member can only view own expenses, admin can view all)
    if (!req.user.isAdmin && expense.member._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this expense",
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

// @desc    Update expense (Admin - Treasurer)
// @route   PUT /api/expenses/:id
// @access  Private/Treasurer
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    const allowedUpdates = ["category", "amount", "date", "paymentMode", "description", "notes"]
    const updates = {}

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    // Update bill if new one uploaded
    if (req.file) {
      // Delete old if exists
      if (expense.billFileId) {
        await deleteFromImageKit(expense.billFileId)
      } else if (expense.billUrl) {
        deleteFile(expense.billUrl)
      }
      
      const uploadResult = await uploadToImageKit(req.file.buffer, `bill-${expense.member}-${Date.now()}`, "bills")
      updates.billUrl = uploadResult.url
      updates.billFileId = uploadResult.fileId
      updates.billOriginalName = req.file.originalname
    }

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate("event", "name")
      .populate("member", "firstName lastName")

    // Audit log
    await createAuditLog({
      action: "expense_update",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: "Expense updated",
      changes: updates,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: updatedExpense,
    })
  } catch (error) {
    logger.error(`Update expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to update expense",
    })
  }
}

// @desc    Approve expense
// @route   PUT /api/expenses/:id/approve
// @access  Private/Treasurer
export const approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("member", "firstName lastName email")
      .populate("event", "name")

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    if (expense.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve expense with status: ${expense.status}`,
      })
    }

    expense.status = "approved"
    expense.approvedBy = req.user._id
    expense.approvedAt = new Date()
    await expense.save()

    // Send email to member
    const approvedEmail = emailTemplates.expenseApproved(expense.member.firstName, expense.amount, expense.event.name)
    sendEmail({
      to: expense.member.email,
      ...approvedEmail,
    }).catch(err => logger.error(`Email failed: ${err.message}`))

    // Audit log
    await createAuditLog({
      action: "expense_approve",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Expense approved: ₹${expense.amount}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Expense approved successfully",
      data: expense,
    })

    // Real-time: notify member & dashboards
    const io = req.app.get("io")
    if (io) {
      try {
        io.to(String(expense.member._id)).emit("expense_approved_update", {
          expenseId: expense._id,
          memberId: expense.member._id,
          amount: expense.amount,
          approvedBy: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
          status: expense.status,
        })

        io.to("admins").emit("dashboard_update", { reason: "expense_approved" })
        io.to("admins").emit("refresh_expense_table", {})
      } catch (socketError) {
        logger.error(`Socket emit error (approveExpense): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Approve expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to approve expense",
    })
  }
}

// @desc    Reject expense
// @route   PUT /api/expenses/:id/reject
// @access  Private/Treasurer
export const rejectExpense = async (req, res) => {
  try {
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      })
    }

    const expense = await Expense.findById(req.params.id)
      .populate("member", "firstName lastName email")
      .populate("event", "name")

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    if (expense.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject expense with status: ${expense.status}`,
      })
    }

    expense.status = "rejected"
    expense.rejectedBy = req.user._id
    expense.rejectedAt = new Date()
    expense.rejectionReason = reason
    await expense.save()

    // Send email to member
    const rejectedEmail = emailTemplates.expenseRejected(
      expense.member.firstName,
      expense.amount,
      expense.event.name,
      reason,
    )
    sendEmail({
      to: expense.member.email,
      ...rejectedEmail,
    }).catch(err => logger.error(`Email failed: ${err.message}`))

    // Audit log
    await createAuditLog({
      action: "expense_reject",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Expense rejected: ₹${expense.amount} - ${reason}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Expense rejected",
      data: expense,
    })

    // Real-time: notify member & dashboards
    const io = req.app.get("io")
    if (io) {
      try {
        io.to(String(expense.member._id)).emit("expense_rejected_update", {
          expenseId: expense._id,
          memberId: expense.member._id,
          amount: expense.amount,
          reason,
          status: expense.status,
        })

        io.to("admins").emit("dashboard_update", { reason: "expense_rejected" })
        io.to("admins").emit("refresh_expense_table", {})
      } catch (socketError) {
        logger.error(`Socket emit error (rejectExpense): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Reject expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to reject expense",
    })
  }
}

// @desc    Mark expense as reimbursed/paid
// @route   PUT /api/expenses/:id/reimburse
// @access  Private/Treasurer
export const reimburseExpense = async (req, res) => {
  try {
    const { reference } = req.body

    const expense = await Expense.findById(req.params.id)

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    if (expense.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved expenses can be marked as reimbursed",
      })
    }

    expense.status = "reimbursed"
    expense.reimbursedBy = req.user._id
    expense.reimbursedAt = new Date()
    expense.reimbursementReference = reference
    await expense.save()

    // Audit log
    await createAuditLog({
      action: "expense_reimburse",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Expense reimbursed: ₹${expense.amount}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Expense marked as reimbursed",
      data: expense,
    })

    // Real-time: notify member & dashboards
    const io = req.app.get("io")
    if (io) {
      try {
        io.to(String(expense.member._id)).emit("reimbursement_notification", {
          expenseId: expense._id,
          memberId: expense.member._id,
          amount: expense.amount,
          reference,
        })

        io.to("admins").emit("dashboard_update", { reason: "expense_reimbursed" })
        io.to("admins").emit("refresh_expense_table", {})
      } catch (socketError) {
        logger.error(`Socket emit error (reimburseExpense): ${socketError.message}`)
      }
    }
  } catch (error) {
    logger.error(`Reimburse expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to reimburse expense",
    })
  }
}

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private/Treasurer
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      })
    }

    await expense.deleteOne()

    // Clean up physical file
    if (expense.billUrl) {
      deleteFile(expense.billUrl)
    }

    // Audit log
    await createAuditLog({
      action: "expense_delete",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Expense deleted: ₹${expense.amount}`,
      req,
    })

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    })
  } catch (error) {
    logger.error(`Delete expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    })
  }
}

// @desc    Add manual expense (Treasurer)
// @route   POST /api/expenses/manual
// @access  Private/Treasurer
export const addManualExpense = async (req, res) => {
  try {
    const settings = await ClubSettings.getSettings()
    // Log incoming request for debugging
    logger.info(`Add manual expense request body: ${JSON.stringify(req.body)}`)

    // Handle both JSON and FormData
    const member = req.body.member
    const event = req.body.event
    const category = req.body.category
    const amount = parseFloat(req.body.amount)
    const date = req.body.date
    const paymentMode = req.body.paymentMode
    const description = req.body.description || ""
    const notes = req.body.notes || ""
    const status = req.body.status || "approved"

    // Validate required fields
    if (!member || !event || !category || !amount || !date || !paymentMode) {
      logger.error(`Missing required fields - member: ${member}, event: ${event}, category: ${category}, amount: ${amount}, date: ${date}, paymentMode: ${paymentMode}`)
      return res.status(400).json({
        success: false,
        message: "Missing required fields: member, event, category, amount, date, and paymentMode are required",
      })
    }

    // Validate member ID format
    if (!mongoose.Types.ObjectId.isValid(member)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID format",
      })
    }

    // Validate event ID format
    if (!mongoose.Types.ObjectId.isValid(event)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format",
      })
    }

    // Verify member and event exist
    const [memberDoc, eventDoc] = await Promise.all([User.findById(member), Event.findById(event)])

    if (!memberDoc) {
      logger.error(`Member not found with ID: ${member}`)
      return res.status(404).json({
        success: false,
        message: "Member not found",
      })
    }

    if (!eventDoc) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    let billUrl = undefined
    let billFileId = undefined
    if (req.file) {
      const uploadResult = await uploadToImageKit(req.file.buffer, `bill-${member}-${Date.now()}`, "bills")
      billUrl = uploadResult.url
      billFileId = uploadResult.fileId
    }

    const expense = await Expense.create({
      member,
      event,
      category,
      amount,
      date,
      paymentMode,
      description,
      notes,
      status,
      billUrl,
      billFileId,
      billOriginalName: req.file?.originalname,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      rotaractYear: settings.currentRotaractYear,
    })

    await expense.populate([
      { path: "event", select: "name" },
      { path: "member", select: "firstName lastName email" },
    ])

    // Audit log
    await createAuditLog({
      action: "expense_create",
      user: req.user,
      targetType: "expense",
      targetId: expense._id,
      description: `Manual expense added: ₹${amount} for ${memberDoc.fullName}`,
      req,
    })

    res.status(201).json({
      success: true,
      message: "Manual expense added successfully",
      data: expense,
    })
  } catch (error) {
    logger.error(`Add manual expense error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to add manual expense",
      error: error.message,
    })
  }
}

export default {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  deleteExpense,
  addManualExpense,
}
