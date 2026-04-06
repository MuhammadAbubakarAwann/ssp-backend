import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import routes from "./routes/index.js"

dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Routes
app.use("/api/v1", routes)

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Doomli Backend API is live 🚀",
    version: "1.0.0",
    documentation: "/api/v1/health",
  })
})

app.use((err, req, res, next) => {
  console.error("Global error:", err)

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
})

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`API Documentation: http://localhost:${PORT}/api/v1/health`)
})
