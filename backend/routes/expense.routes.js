// ============================================
// EXPENSE ROUTES
// ============================================

import express from "express"
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  deleteExpense,
  addManualExpense,
} from "../controllers/expense.controller.js"
import { protect, adminOnly, treasurerOnly } from "../middleware/auth.middleware.js"
import { uploadBillMemory } from "../middleware/upload.middleware.js"
import { expenseValidation, paramValidation, queryValidation } from "../middleware/validation.middleware.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Admin routes (place static routes first)
router.get("/all", adminOnly, queryValidation.pagination, getAllExpenses)
router.post("/manual", treasurerOnly, uploadBillMemory, addManualExpense)

// Member routes
router.post("/", uploadBillMemory, expenseValidation.create, createExpense)
router.get("/:id", paramValidation.mongoId, getExpenseById)

// Treasurer/Admin protected actions
router.put("/:id", treasurerOnly, uploadBillMemory, expenseValidation.update, updateExpense)
router.put("/:id/approve", treasurerOnly, approveExpense)
router.put("/:id/reject", treasurerOnly, rejectExpense)
router.put("/:id/reimburse", treasurerOnly, reimburseExpense)
router.delete("/:id", treasurerOnly, deleteExpense)

export default router
