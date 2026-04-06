const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { startCleanupSchedule } = require("./cleanup");

dotenv.config();

// Log config (masked)
console.log("Admin Username:", process.env.ADMIN_USERNAME);
console.log("Admin Password:", process.env.ADMIN_PASSWORD ? "***SET***" : "NOT SET");
console.log("JWT Secret:", process.env.JWT_SECRET ? "***SET***" : "NOT SET");
console.log("DB Host:", process.env.DB_HOST);
console.log("DB User:", process.env.DB_USER);
console.log("DB Name:", process.env.DB_NAME);

const app = express();
const port = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: [
      "https://salonsindbad.pages.dev",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:1234",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Import routes
const bookingsRouter = require("./routes/bookings");
const barbersRouter = require("./routes/barbers");
const servicesRouter = require("./routes/services");
const adminRouter = require("./routes/admin");
const barberAvailabilityRouter = require("./routes/barber_availability");
const settingsRouter = require("./routes/settings");
const legalRouter = require("./routes/legal");

// Mount routes
app.use("/api/bookings", bookingsRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/barbers", barberAvailabilityRouter);
app.use("/api/services", servicesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/settings", settingsRouter);
app.use("/api/legal", legalRouter);

// Email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
  transporter.verify((error) => {
    if (error) {
      console.log("Email configuration error:", error.message);
    } else {
      console.log("Email server is ready to take our messages");
    }
  });
}

// JWT auth middleware (available for routes that need it)
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Root
app.get("/", (req, res) => {
  res.json({ message: "Barbershop API is running", version: "1.0.0" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
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

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Start GDPR data retention cleanup (deletes bookings older than 12 months)
  startCleanupSchedule();
});