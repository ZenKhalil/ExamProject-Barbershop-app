// Import necessary modules
const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors"); // CORS module for handling Cross-Origin Resource Sharing
const jwt = require("jsonwebtoken"); // Added for JWT handling
const db = require('./db'); // Import the database connection

// Load environment variables from .env file
dotenv.config();
console.log("Admin Username:", process.env.ADMIN_USERNAME);
console.log("Admin Password:", process.env.ADMIN_PASSWORD);
console.log("JWT Secret:", process.env.JWT_SECRET);

// Create an Express server
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middlewares
app.use(express.json());
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Import routes
const bookingsRouter = require("./routes/bookings");
const barbersRouter = require("./routes/barbers");
const servicesRouter = require("./routes/services");
const adminRouter = require('./routes/admin');
const barberAvailabilityRouter = require("./routes/barber_availability");
//const mapRouter = require("./routes/map");

// Use the routes
app.use("/api/bookings", bookingsRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/services", servicesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/barbers", barberAvailabilityRouter);
//app.use("/api/map", mapRouter);

// Set up Nodemailer for sending email confirmations
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// This middleware is used to authenticate JWT tokens on protected routes.
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
