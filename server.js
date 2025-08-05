// Import necessary modules
const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors"); // CORS module for handling Cross-Origin Resource Sharing
const jwt = require("jsonwebtoken"); // Added for JWT handling
const db = require("./db"); // Import the database connection

// Load environment variables from .env file
dotenv.config();

// Log environment variables for debugging (remove in production)
console.log("Admin Username:", process.env.ADMIN_USERNAME);
console.log(
  "Admin Password:",
  process.env.ADMIN_PASSWORD ? "***SET***" : "NOT SET"
);
console.log("JWT Secret:", process.env.JWT_SECRET ? "***SET***" : "NOT SET");
console.log("DB Host:", process.env.DB_HOST);
console.log("DB User:", process.env.DB_USER);
console.log("DB Name:", process.env.DB_NAME);

// Create an Express server
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(
  cors({
    origin: [
      "https://examproject-barbershop-app-frontend.onrender.com",
      "https://salonsindbad.pages.dev",
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean), // Remove any undefined values
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" })); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" })); // For parsing application/x-www-form-urlencoded

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  next();
});

// Test database connection endpoint
app.get("/api/test-db", (req, res) => {
  db.query("SELECT 1 as test", (err, results) => {
    if (err) {
      console.error("Database test failed:", err);
      return res.status(500).json({
        error: "Database connection failed",
        details: err.message,
      });
    }
    res.json({
      message: "Database connection successful",
      results: results,
    });
  });
});

// Import routes
const bookingsRouter = require("./routes/bookings");
const barbersRouter = require("./routes/barbers");
const servicesRouter = require("./routes/services");
const adminRouter = require("./routes/admin");
const barberAvailabilityRouter = require("./routes/barber_availability");
//const mapRouter = require("./routes/map");

// Use the routes
app.use("/api/bookings", bookingsRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/services", servicesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/barber-availability", barberAvailabilityRouter); // Fixed route path
//app.use("/api/map", mapRouter);

// Set up Nodemailer for sending email confirmations
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Test email configuration
const testEmailConfig = () => {
  if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    transporter.verify((error, success) => {
      if (error) {
        console.log("Email configuration error:", error);
      } else {
        console.log("Email server is ready to take our messages");
      }
    });
  }
};

testEmailConfig();

// This middleware is used to authenticate JWT tokens on protected routes.
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("JWT verification error:", err);
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization header missing" });
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Barbershop API is running",
    version: "1.0.0",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  db.end(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  db.end(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
