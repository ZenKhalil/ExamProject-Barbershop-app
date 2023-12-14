const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path"); // Import the path module

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// Import routes
const adminRouter = require("./routes/admin");
const bookingsRouter = require("./routes/bookings");
const barbersRouter = require("./routes/barbers");
const servicesRouter = require("./routes/services");
const galleryRouter = require("./routes/gallery");
const barberAvailabilityRouter = require("./routes/barber_availability");

// Middlewares
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.use("/api/admin", adminRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/services", servicesRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/barbers", barberAvailabilityRouter);

// Catch-all route to serve the frontend application
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

// Set up Nodemailer for sending email confirmations
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
