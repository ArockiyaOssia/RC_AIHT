// ============================================
// ROTARACT CLUB MANAGEMENT SYSTEM - MAIN SERVER
// ============================================

import express from "express"
import http from "http"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import compression from "compression"
import rateLimit from "express-rate-limit"
import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Import Routes
import authRoutes from "./routes/auth.routes.js"
import memberRoutes from "./routes/member.routes.js"
import adminRoutes from "./routes/admin.routes.js"
import expenseRoutes from "./routes/expense.routes.js"
import eventRoutes from "./routes/event.routes.js"
import reportRoutes from "./routes/report.routes.js"
import boardRoutes from "./routes/board.routes.js"
import settingsRoutes from "./routes/settings.routes.js"
import archiveRoutes from "./routes/archive.routes.js"
import publicRoutes from "./routes/public.routes.js"
import galleryRoutes from "./routes/gallery.routes.js"

// Import Error Handler
import { errorHandler, notFound } from "./middleware/error.middleware.js"
import { logger } from "./utils/logger.js"
import config from "./config/config.js"
import User from "./models/User.model.js"
import syncAdminUsers from "./utils/adminSync.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    // Allow images and other resources to be loaded cross-origin (e.g. from Next.js dev server)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// Enable CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

// Rate limiting - General
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000000000000000000000, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting - Auth (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login attempts per hour
  message: {
    success: false,
    message: "Too many login attempts, please try again after an hour",
  },
  skipSuccessfulRequests: true,
})

app.use("/api", generalLimiter)
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/admin-login", authLimiter)

// Body parser
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))

// Data sanitization against NoSQL query injection
app.use(mongoSanitize())

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["category", "status", "eventId", "memberId", "month", "year"],
  }),
)

// Compression
app.use(compression())

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  )
}

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// ============================================
// DATABASE CONNECTION
// ============================================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rotaract_club", {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    logger.info(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    logger.error(`Database Connection Error: ${error.message}`)
    process.exit(1)
  }
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Rotaract Club API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// Public routes (no auth required)
app.use("/api/public", publicRoutes)

// Auth routes
app.use("/api/auth", authRoutes)

// Protected routes
app.use("/api/members", memberRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/expenses", expenseRoutes)
app.use("/api/events", eventRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/board", boardRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/archive", archiveRoutes)
app.use("/api/gallery", galleryRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

// ============================================
// SOCKET.IO SETUP
// ============================================

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
})

// Attach io instance to app so controllers can use it via req.app.get("io")
app.set("io", io)

// Socket authentication & role-based rooms
io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token
    const headerToken = socket.handshake.headers?.authorization?.startsWith("Bearer ")
      ? socket.handshake.headers.authorization.split(" ")[1]
      : null

    const token = authToken || headerToken

    if (!token) {
      return next(new Error("UNAUTHORIZED"))
    }

    const decoded = jwt.verify(token, config.jwtSecret)
    const user = await User.findById(decoded.id).select("-password")

    if (!user || !user.isActive) {
      return next(new Error("UNAUTHORIZED"))
    }

    // attach user to socket for later use
    socket.user = user

    // role-based rooms
    if (user.isAdmin) {
      socket.join("admins")
    }

    if (["treasurer", "secretary", "joint_secretary", "president"].includes(user.role)) {
      socket.join("treasurer")
    }

    if (user.role === "member") {
      socket.join("members")
    }

    // personal room
    socket.join(String(user._id))

    next()
  } catch (error) {
    logger.error(`Socket auth error: ${error.message}`)
    next(new Error("UNAUTHORIZED"))
  }
})

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.user?.email || socket.id}`)

  // Optional: typing indicator from members to treasurers
  socket.on("member_typing", () => {
    if (socket.user?.role === "member") {
      io.to("treasurer").emit("member_typing", {
        memberId: String(socket.user._id),
        memberName: socket.user.fullName || `${socket.user.firstName} ${socket.user.lastName}`,
      })
    }
  })

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.user?.email || socket.id}`)
  })
})

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()

  // Sync admin users from .env configuration
  try {
    await syncAdminUsers()
  } catch (error) {
    logger.error(`Failed to sync admin users: ${error.message}`)
  }

  // Only listen if not running on Vercel
  if (process.env.NODE_ENV !== "production") {
    server.listen(PORT, () => {
      logger.info(`Server running in development mode on port ${PORT}`)
    })
  }
}

// Start for local development
if (process.env.NODE_ENV !== "production") {
  startServer()
} else {
  // Just connect to DB for production/serverless
  connectDB()
}

export default app

