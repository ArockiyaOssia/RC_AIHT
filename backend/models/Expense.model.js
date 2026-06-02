// ============================================
// EXPENSE MODEL
// ============================================

import mongoose from "mongoose"

const expenseSchema = new mongoose.Schema(
  {
    // Submitter
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Event
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Expense Details
    category: {
      type: String,
      enum: [
        "donation",
        "personal_contribution",
        "travel_expense",
        "accommodation",
        "event_material",
        "food_refreshments",
        "miscellaneous",
      ],
      required: [true, "Category is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ["upi", "cash", "bank_transfer", "cheque"],
      required: [true, "Payment mode is required"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },

    // Bill/Receipt
    billUrl: {
      type: String,
    },
    billFileId: String,
    billOriginalName: String,

    // Status & Approval
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reimbursed", "paid"],
      default: "pending",
    },

    // Approval Details
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,

    // Reimbursement
    reimbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reimbursedAt: Date,
    reimbursementReference: String,

    // Metadata
    rotaractYear: {
      type: String,
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
expenseSchema.index({ member: 1, status: 1 })
expenseSchema.index({ event: 1 })
expenseSchema.index({ category: 1 })
expenseSchema.index({ rotaractYear: 1 })
expenseSchema.index({ date: -1 })
expenseSchema.index({ status: 1, rotaractYear: 1 })

// Virtual for formatted amount
expenseSchema.virtual("formattedAmount").get(function () {
  return `₹${this.amount.toLocaleString("en-IN")}`
})

const Expense = mongoose.model("Expense", expenseSchema)

export default Expense
