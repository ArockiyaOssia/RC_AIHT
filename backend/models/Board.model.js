// ============================================
// BOARD MODEL
// ============================================

import mongoose from "mongoose"

const boardMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
    enum: [
      "president",
      "immediate_past_president",
      "vice_president",
      "secretary",
      "joint_secretary",
      "treasurer",
      "sergeant_at_arms",
      "director_club_service",
      "director_community_service",
      "director_professional_development",
      "director_international_service",
      "director_public_relations",
      "editor",
      "webmaster",
    ],
  },
  photo: String,
  photoId: String,
  email: String,
  phone: String,
  linkedIn: String,
})

const boardSchema = new mongoose.Schema(
  {
    // Year
    rotaractYear: {
      type: String,
      required: true,
      unique: true,
    },

    // Theme
    theme: String,
    themeDescription: String,

    // Board Members
    members: [boardMemberSchema],

    // Photos
    boardPhoto: String,
    boardPhotoId: String,
    bannerImage: String,
    bannerImageId: String,

    // Installation Details
    installationDate: Date,
    installationVenue: String,

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index
boardSchema.index({ rotaractYear: 1 })

const Board = mongoose.model("Board", boardSchema)

export default Board
