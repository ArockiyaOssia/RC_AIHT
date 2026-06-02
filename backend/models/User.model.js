// ============================================
// USER MODEL (MEMBERS & ADMINS)
// ============================================

import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import config from "../config/config.js"

export const USER_ROLES = [
  "member",
  "director",
  "associate_director",
  "sergeant_at_arms",
  "associate_sergeant_at_arms",
  "club_photographer",
  "public_relation_officer_pro",
  "club_editor",
  "content_writer",
  "blood_donation_chairman",
  "green_rotaractor",
  "vice_president",
  "joint_secretary",
  "secretary",
  "treasurer",
  "president",
  "faculty_coordinator",
  "alumni",
]

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    memberId: {
      type: String,
      unique: true,
      required: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[6-9]\d{9}$/, "Please provide a valid Indian phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // Profile
    photo: {
      type: String,
      default: "default-avatar.png",
    },
    photoId: String,
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    collegeName: String,
    courseName: String,

    // Role & Status
    role: {
      type: String,
      enum: USER_ROLES,
      default: "member",
    },
    isAdmin: {
      type: Boolean,
      default:true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAlumni: {
      type: Boolean,
      default: false,
    },

    // Rotaract Info
    rotaractYear: {
      type: String,
      required: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    designation: String,

    // Security
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    passwordChangedAt: Date,
    hasChangedPassword: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailChangeRequest: {
      newEmail: { type: String, lowercase: true, trim: true },
      token: String,
      expiresAt: Date,
      requestedAt: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    lastLogin: Date,
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ memberId: 1 })
userSchema.index({ role: 1 })
userSchema.index({ rotaractYear: 1 })

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Pre-save: Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  this.password = await bcrypt.hash(this.password, config.bcryptSaltRounds)
  this.passwordChangedAt = Date.now() - 1000
  next()
})

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method: Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      isAdmin: this.isAdmin,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpire },
  )
}

// Method: Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = jwt.sign({ id: this._id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire })

  this.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  })

  return refreshToken
}

// Method: Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex")

  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000 // 1 hour

  return resetToken
}

// Method: Check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Number.parseInt(this.passwordChangedAt.getTime() / 1000, 10)
    return JWTTimestamp < changedTimestamp
  }
  return false
}

// Method: Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now()
}

// Method: Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    })
  }

  const updates = { $inc: { loginAttempts: 1 } }

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }
  }

  return this.updateOne(updates)
}

const User = mongoose.model("User", userSchema)

export default User
