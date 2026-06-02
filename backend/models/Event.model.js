// ============================================
// EVENT MODEL
// ============================================

import mongoose from "mongoose"

const eventSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: [200, "Event name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    // Dates
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // Category & Tags
    category: {
      type: String,
      enum: [
        "community_service",
        "professional_development",
        "international_service",
        "club_service",
        "fundraising",
        "social",
        "installation",
        "other",
      ],
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Budget
    estimatedBudget: {
      type: Number,
      default: 0,
    },
    actualSpending: {
      type: Number,
      default: 0,
    },

    // Venue
    venue: {
      name: String,
      address: String,
      city: String,
    },

    // Media
    coverImage: String,
    coverImageId: String,
    gallery: [
      {
        url: String,
        fileId: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    videoLinks: [String],

    // Report
    reportLink: String,
    attendees: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    // Organizers
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    volunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Metadata
    rotaractYear: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
eventSchema.index({ name: "text", description: "text" })
eventSchema.index({ startDate: -1 })
eventSchema.index({ category: 1 })
eventSchema.index({ rotaractYear: 1 })
eventSchema.index({ status: 1 })

// Virtual for expenses
eventSchema.virtual("expenses", {
  ref: "Expense",
  localField: "_id",
  foreignField: "event",
})

// Pre-save: Update status based on dates
eventSchema.pre("save", function (next) {
  const now = new Date()
  if (this.status !== "cancelled") {
    if (now < this.startDate) {
      this.status = "upcoming"
    } else if (now >= this.startDate && now <= this.endDate) {
      this.status = "ongoing"
    } else {
      this.status = "completed"
    }
  }
  next()
})

const Event = mongoose.model("Event", eventSchema)

export default Event
