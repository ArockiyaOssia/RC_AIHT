// ============================================
// REPORT CONTROLLER
// ============================================

import Expense from "../models/Expense.model.js"
import Event from "../models/Event.model.js"
import ClubSettings from "../models/ClubSettings.model.js"
import { getFinancialYear, formatCurrency } from "../utils/helpers.js"
import { logger } from "../utils/logger.js"
import PDFDocument from "pdfkit"
import ExcelJS from "exceljs"
import archiver from "archiver"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// @desc    Get financial summary report
// @route   GET /api/reports/financial-summary
// @access  Private/Admin
export const getFinancialSummary = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    // Get comprehensive financial data
    const [expensesByCategory, expensesByStatus, expensesByMonth, expensesByEvent, topContributors] = await Promise.all(
      [
        // By category
        Expense.aggregate([
          { $match: { rotaractYear: year } },
          {
            $group: {
              _id: "$category",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]),

        // By status
        Expense.aggregate([
          { $match: { rotaractYear: year } },
          {
            $group: {
              _id: "$status",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),

        // By month
        Expense.aggregate([
          { $match: { rotaractYear: year } },
          {
            $group: {
              _id: {
                month: { $month: "$date" },
                year: { $year: "$date" },
              },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),

        // By event
        Expense.aggregate([
          { $match: { rotaractYear: year } },
          {
            $group: {
              _id: "$event",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "events",
              localField: "_id",
              foreignField: "_id",
              as: "event",
            },
          },
          { $unwind: "$event" },
        ]),

        // Top contributors
        Expense.aggregate([
          {
            $match: {
              rotaractYear: year,
              status: { $in: ["approved", "reimbursed", "paid"] },
            },
          },
          {
            $group: {
              _id: "$member",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "member",
            },
          },
          { $unwind: "$member" },
        ]),
      ],
    )

    // Calculate totals
    const totals = {
      totalExpenses: expensesByStatus.reduce((sum, item) => sum + item.total, 0),
      totalApproved: expensesByStatus.find((s) => s._id === "approved")?.total || 0,
      totalPending: expensesByStatus.find((s) => s._id === "pending")?.total || 0,
      totalRejected: expensesByStatus.find((s) => s._id === "rejected")?.total || 0,
      totalReimbursed: expensesByStatus.find((s) => s._id === "reimbursed")?.total || 0,
    }

    res.status(200).json({
      success: true,
      data: {
        rotaractYear: year,
        totals,
        expensesByCategory,
        expensesByStatus,
        expensesByMonth,
        expensesByEvent,
        topContributors,
      },
    })
  } catch (error) {
    logger.error(`Financial summary error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to generate financial summary",
    })
  }
}

// @desc    Get member-wise report
// @route   GET /api/reports/member-wise
// @access  Private/Admin
export const getMemberWiseReport = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    const memberReport = await Expense.aggregate([
      { $match: { rotaractYear: year } },
      {
        $group: {
          _id: "$member",
          totalAmount: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
          approvedAmount: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "reimbursed", "paid"]] }, "$amount", 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
          rejectedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0],
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: "$member" },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          expenseCount: 1,
          approvedAmount: 1,
          pendingAmount: 1,
          rejectedAmount: 1,
          "member.firstName": 1,
          "member.lastName": 1,
          "member.memberId": 1,
          "member.email": 1,
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        rotaractYear: year,
        members: memberReport,
      },
    })
  } catch (error) {
    logger.error(`Member-wise report error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to generate member-wise report",
    })
  }
}

// @desc    Get event-wise report
// @route   GET /api/reports/event-wise
// @access  Private/Admin
export const getEventWiseReport = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    const eventReport = await Event.aggregate([
      { $match: { rotaractYear: year } },
      {
        $lookup: {
          from: "expenses",
          localField: "_id",
          foreignField: "event",
          as: "expenses",
        },
      },
      {
        $project: {
          name: 1,
          category: 1,
          startDate: 1,
          endDate: 1,
          estimatedBudget: 1,
          status: 1,
          totalExpenses: { $sum: "$expenses.amount" },
          expenseCount: { $size: "$expenses" },
          approvedExpenses: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$expenses",
                    cond: { $in: ["$$this.status", ["approved", "reimbursed", "paid"]] },
                  },
                },
                in: "$$this.amount",
              },
            },
          },
          budgetVariance: {
            $subtract: ["$estimatedBudget", { $sum: "$expenses.amount" }],
          },
        },
      },
      { $sort: { startDate: -1 } },
    ])

    res.status(200).json({
      success: true,
      data: {
        rotaractYear: year,
        events: eventReport,
      },
    })
  } catch (error) {
    logger.error(`Event-wise report error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to generate event-wise report",
    })
  }
}

// @desc    Export financial report as PDF
// @route   GET /api/reports/export/pdf
// @access  Private/Admin
export const exportPDF = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    // Get data
    const expenses = await Expense.find({ rotaractYear: year })
      .populate("member", "firstName lastName memberId")
      .populate("event", "name")
      .sort({ date: -1 })

    // Create PDF
    const doc = new PDFDocument({ margin: 50 })

    // Set response headers
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=financial-report-${year}.pdf`)

    doc.pipe(res)

    // Title
    doc.fontSize(20).text("Rotaract Club Financial Report", { align: "center" })
    doc.fontSize(14).text(`Year: ${year}`, { align: "center" })
    doc.moveDown()

    // Summary
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
    const approvedAmount = expenses
      .filter((e) => ["approved", "reimbursed", "paid"].includes(e.status))
      .reduce((sum, e) => sum + e.amount, 0)

    doc.fontSize(12).text(`Total Expenses: ${formatCurrency(totalAmount)}`)
    doc.text(`Approved/Paid: ${formatCurrency(approvedAmount)}`)
    doc.text(`Total Entries: ${expenses.length}`)
    doc.moveDown()

    // Table header
    doc.fontSize(10)
    doc.text("Date", 50, doc.y, { width: 70 })
    doc.text("Member", 120, doc.y - 12, { width: 100 })
    doc.text("Event", 220, doc.y - 12, { width: 100 })
    doc.text("Category", 320, doc.y - 12, { width: 80 })
    doc.text("Amount", 400, doc.y - 12, { width: 60 })
    doc.text("Status", 460, doc.y - 12, { width: 60 })
    doc.moveDown()

    // Draw line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    // Table rows
    expenses.forEach((expense) => {
      if (doc.y > 700) {
        doc.addPage()
      }

      const y = doc.y
      doc.text(new Date(expense.date).toLocaleDateString(), 50, y, { width: 70 })
      doc.text(`${expense.member?.firstName || ""} ${expense.member?.lastName || ""}`, 120, y, { width: 100 })
      doc.text(expense.event?.name || "", 220, y, { width: 100 })
      doc.text(expense.category, 320, y, { width: 80 })
      doc.text(`₹${expense.amount}`, 400, y, { width: 60 })
      doc.text(expense.status, 460, y, { width: 60 })
      doc.moveDown()
    })

    // Footer
    doc.moveDown(2)
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" })

    doc.end()
  } catch (error) {
    logger.error(`Export PDF error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to export PDF",
    })
  }
}

// @desc    Export financial report as Excel
// @route   GET /api/reports/export/excel
// @access  Private/Admin
export const exportExcel = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    // Get data
    const expenses = await Expense.find({ rotaractYear: year })
      .populate("member", "firstName lastName memberId email")
      .populate("event", "name")
      .sort({ date: -1 })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Rotaract Club"
    workbook.created = new Date()

    // Add worksheet
    const worksheet = workbook.addWorksheet("Financial Report")

    // Define columns
    worksheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Member ID", key: "memberId", width: 15 },
      { header: "Member Name", key: "memberName", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Event", key: "event", width: 25 },
      { header: "Category", key: "category", width: 18 },
      { header: "Amount (₹)", key: "amount", width: 12 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Description", key: "description", width: 30 },
    ]

    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    }
    worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true }

    // Add data
    expenses.forEach((expense) => {
      worksheet.addRow({
        date: new Date(expense.date).toLocaleDateString(),
        memberId: expense.member?.memberId || "",
        memberName: `${expense.member?.firstName || ""} ${expense.member?.lastName || ""}`,
        email: expense.member?.email || "",
        event: expense.event?.name || "",
        category: expense.category,
        amount: expense.amount,
        paymentMode: expense.paymentMode,
        status: expense.status,
        description: expense.description || "",
      })
    })

    // Add summary at the end
    worksheet.addRow({})
    worksheet.addRow({
      date: "TOTAL",
      amount: expenses.reduce((sum, e) => sum + e.amount, 0),
    })

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename=financial-report-${year}.xlsx`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    logger.error(`Export Excel error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to export Excel",
    })
  }
}

// @desc    Download bills as ZIP
// @route   GET /api/reports/export/bills
// @access  Private/Admin
export const exportBillsZip = async (req, res) => {
  try {
    const { rotaractYear, eventId } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    // Build query
    const query = { rotaractYear: year, billUrl: { $exists: true, $ne: null } }
    if (eventId) query.event = eventId

    const expenses = await Expense.find(query).populate("member", "firstName lastName").populate("event", "name")

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bills found for the specified criteria",
      })
    }

    // Set response headers
    res.setHeader("Content-Type", "application/zip")
    res.setHeader("Content-Disposition", `attachment; filename=bills-${year}.zip`)

    // Create archive
    const archive = archiver("zip", { zlib: { level: 9 } })
    archive.pipe(res)

    // Add files to archive
    await Promise.allSettled(
      expenses.map(async (expense) => {
        try {
          if (!expense.billUrl) return

          let imageBuffer
          const fileName = `${expense.member?.firstName || "Unknown"}_${expense.event?.name || "Event"}_${expense.amount}_${expense._id}.webp`

          if (expense.billUrl.startsWith("http")) {
            const response = await fetch(expense.billUrl)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            imageBuffer = Buffer.from(await response.arrayBuffer())
            archive.append(imageBuffer, { name: fileName })
          } else {
            const filePath = path.join(__dirname, "..", expense.billUrl)
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: fileName })
            }
          }
        } catch (err) {
          logger.error(`Failed to add bill ${expense._id} to ZIP: ${err.message}`)
        }
      })
    )

    await archive.finalize()
  } catch (error) {
    logger.error(`Export bills ZIP error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to export bills",
    })
  }
}

// @desc    Get leaderboard
// @route   GET /api/reports/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const { rotaractYear } = req.query
    const settings = await ClubSettings.getSettings()
    const year = rotaractYear || settings.currentRotaractYear

    const leaderboard = await Expense.aggregate([
      {
        $match: {
          rotaractYear: year,
          status: { $in: ["approved", "reimbursed", "paid"] },
        },
      },
      {
        $group: {
          _id: "$member",
          totalContribution: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
          eventsContributed: { $addToSet: "$event" },
        },
      },
      { $sort: { totalContribution: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: "$member" },
      {
        $project: {
          _id: 1,
          totalContribution: 1,
          expenseCount: 1,
          eventsCount: { $size: "$eventsContributed" },
          "member.firstName": 1,
          "member.lastName": 1,
          "member.memberId": 1,
          "member.photo": 1,
          "member.role": 1,
        },
      },
    ])

    // Add rank
    const rankedLeaderboard = leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item,
    }))

    res.status(200).json({
      success: true,
      data: {
        rotaractYear: year,
        leaderboard: rankedLeaderboard,
      },
    })
  } catch (error) {
    logger.error(`Leaderboard error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to get leaderboard",
    })
  }
}

export default {
  getFinancialSummary,
  getMemberWiseReport,
  getEventWiseReport,
  exportPDF,
  exportExcel,
  exportBillsZip,
  getLeaderboard,
}
