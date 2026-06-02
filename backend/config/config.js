// ============================================
// CONFIGURATION
// ============================================

import dotenv from "dotenv"
dotenv.config()

// Helper to safely get and trim env values
const getEnv = (key, defaultValue = null) => {
  const value = process.env[key]
  if (!value) return defaultValue
  return typeof value === 'string' ? value.trim() : value
}

export const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Database
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/rotaract_club",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "30d",

  // Bcrypt
  bcryptSaltRounds: 12,

  // Email
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  fromEmail: process.env.FROM_EMAIL || "noreply@rotaract.com",

  // ImageKit
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,

  // File Upload
  maxUploadSize: 15 * 1024 * 1024, // 15 MB limit for initial upload (to allow for high-res phone photos)
  maxStorageSize: 500 * 1024, // 500 KB limit for ImageKit storage as requested
  allowedFileTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],

  // Club Settings
  currentRotaractYear: process.env.ROTARACT_YEAR || "2025-2026",
  clubName: process.env.CLUB_NAME || "Rotaract Club of AIHT",
  parentClubName: process.env.PARENT_CLUB_NAME || "Rotary Club of Chennai",
  rid: process.env.RID || "3233",

  // Admin Users Configuration (from .env)
  adminUsers: {
    president: {
      email: getEnv("PRESIDENT_EMAIL"),
      password: getEnv("PRESIDENT_PASSWORD"),
      firstName: getEnv("PRESIDENT_FIRST_NAME", "President"),
      lastName: getEnv("PRESIDENT_LAST_NAME", "Admin"),
      phone: getEnv("PRESIDENT_PHONE", "9999999999"),
    },
    secretary: {
      email: getEnv("SECRETARY_EMAIL"),
      password: getEnv("SECRETARY_PASSWORD"),
      firstName: getEnv("SECRETARY_FIRST_NAME", "Secretary"),
      lastName: getEnv("SECRETARY_LAST_NAME", "Admin"),
      phone: getEnv("SECRETARY_PHONE", "9999999998"),
    },
    treasurer: {
      email: getEnv("TREASURER_EMAIL"),
      password: getEnv("TREASURER_PASSWORD"),
      firstName: getEnv("TREASURER_FIRST_NAME", "Treasurer"),
      lastName: getEnv("TREASURER_LAST_NAME", "Admin"),
      phone: getEnv("TREASURER_PHONE", "9999999996"),
    },
    faculty_coordinator: {
      email: getEnv("FACULTY_COORDINATOR_EMAIL"),
      password: getEnv("FACULTY_COORDINATOR_PASSWORD"),
      firstName: getEnv("FACULTY_COORDINATOR_FIRST_NAME", "Faculty"),
      lastName: getEnv("FACULTY_COORDINATOR_LAST_NAME", "Coordinator"),
      phone: getEnv("FACULTY_COORDINATOR_PHONE", "9999999995"),
    },
  },
}

export default config
