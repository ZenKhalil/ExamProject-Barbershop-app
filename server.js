// Import necessary modules
const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");

// Load environment variables from .env file
dotenv.config();

// Create an Express server
const app = express();
const port = process.env.PORT || 3000;

// Import routes
const adminRouter = require("./routes/admin");
const bookingsRouter = require("./routes/bookings");
const barbersRouter = require("./routes/barbers");
const servicesRouter = require("./routes/services");
const galleryRouter = require("./routes/gallery");
const barberAvailabilityRouter = require("./routes/barber_availability"); 

// Middlewares
app.use(express.json());
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Use the routes
app.use(cors());
app.use("/api/admin", adminRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/services", servicesRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/barber", barberAvailabilityRouter);

// Set up Nodemailer for sending email confirmations
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
