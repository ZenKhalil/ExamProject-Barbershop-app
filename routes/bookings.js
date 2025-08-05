const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateAdmin = require("./authenticateAdmin");
const { sendEmail } = require("./email"); // Import the email utility
require('dotenv').config(); // Ensure environment variables are loaded

// Destructure OWNER_EMAIL and EMAIL_USERNAME from environment variables
const { OWNER_EMAIL, EMAIL_USERNAME } = process.env;

// Helper function to calculate end time
const calculateEndTime = (startTime, durationInMinutes) => {
  let [hours, minutes] = startTime.split(":").map(Number);
  minutes += durationInMinutes;

  while (minutes >= 60) {
    hours++;
    minutes -= 60;
  }

  hours %= 24;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:00`;
};

// Utility function to query the database using Promises
const queryDatabase = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Function to generate ICS content for calendar event
const generateICS = (bookingDate, bookingTime, customerName, barber_name) => {
  const startDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Assume 1-hour duration
  
  const startDate = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0];
  const endDate = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0];
  
  // Generate a unique UID (you can use a more robust method if needed)
  const uid = `${Date.now()}@salonsindbad.com`; // Simple UID example
  
  return `
BEGIN:VCALENDAR\r\n
VERSION:2.0\r\n
PRODID:-//Salon Sindbad//BookingApp//EN\r\n
CALSCALE:GREGORIAN\r\n
BEGIN:VEVENT\r\n
UID:${uid}\r\n
DTSTAMP:${startDate}Z\r\n
DTSTART:${startDate}Z\r\n
DTEND:${endDate}Z\r\n
SUMMARY:Booking with ${customerName}\r\n
DESCRIPTION:Your booking is confirmed on ${bookingDate} at ${bookingTime} with ${barber_name}\r\n
LOCATION:Nørrebrogade 64, 2200 København, Denmark\r\n
STATUS:CONFIRMED\r\n
END:VEVENT\r\n
END:VCALENDAR\r\n
  `.trim(); // Remove any leading or trailing whitespace
};

// GET request to retrieve unavailable time slots for a specific barber and date
router.get("/unavailable-timeslots", (req, res) => {
  const barberId = req.query.barberId;
  const startDate = req.query.start;
  const endDate = req.query.end;

  if (!barberId) {
    return res.status(400).json({ message: "Missing barberId parameter" });
  }

  const dateRangeQuery = `
    SELECT 
      booking_date,
      booking_time AS startTime,
      end_time AS endTime
    FROM bookings
    WHERE barber_id = ?
    AND booking_date BETWEEN ? AND ?`;

  if (startDate && endDate) {
    db.query(
      dateRangeQuery,
      [barberId, startDate, endDate],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          res.status(500).json({
            message: "Error querying database for time slots",
            error: err.message,
          });
        } else {
          try {
            const timeSlots = results.map((row) => {
              const bookingDate = new Date(row.booking_date);
              const adjustedDateStr = bookingDate.toISOString().split("T")[0];
              const startISO = `${adjustedDateStr}T${row.startTime}`;
              const endISO = `${adjustedDateStr}T${row.endTime}`;
              const start = new Date(startISO);
              const end = new Date(endISO);
              return {
                start: start.toISOString(),
                end: end.toISOString(),
              };
            });
            res.json(timeSlots);
          } catch (error) {
            console.error("Error constructing dates:", error);
            res.status(500).json({
              message: "Error constructing dates from database values",
              error: error.message,
            });
          }
        }
      }
    );
  } else {
    return res.status(400).json({
      message: "Missing date or date range parameters",
    });
  }
});

// POST request to create a new booking
router.post("/create", async (req, res) => {
  console.log("Received booking data:", req.body);
  const {
    customer_name,
    customer_email,
    customer_phone,
    booking_date,
    booking_time,
    barber_id,
    services, // Array of service IDs
  } = req.body;

  // Validate required fields
  if (
    !customer_name ||
    !customer_email ||
    !booking_date ||
    !booking_time ||
    !barber_id ||
    !Array.isArray(services) ||
    services.length === 0
  ) {
    console.error("Missing required fields in booking data.");
    return res.status(400).json({ message: "Missing required fields." });
  }

  const preferred_haircut = services.length > 0 ? services[0] : null;
  const extra_services = services.length > 1 ? services.slice(1) : [];

  try {
    // Fetch the barber's name
    const barberQuery = `SELECT name AS barber_name FROM barbers WHERE barber_id = ?`;
    const barberResults = await queryDatabase(barberQuery, [barber_id]);

    if (barberResults.length === 0) {
      console.error("Barber not found with the given ID.");
      return res.status(400).json({ message: "Invalid barber ID." });
    }

    const barber_name = barberResults[0].barber_name; // Get barber name from results

    // Check if the time slot is already booked
    const checkTimeSlotQuery = `
      SELECT * FROM bookings 
      WHERE barber_id = ? 
      AND booking_date = ? 
      AND booking_time = ?`;
    const timeSlotResults = await queryDatabase(checkTimeSlotQuery, [
      barber_id,
      booking_date,
      booking_time,
    ]);

    if (timeSlotResults.length > 0) {
      console.log("Time slot is already booked:", booking_date, booking_time);
      return res.status(400).json({ message: "Time slot is already booked" });
    }

    // Fetch service details
    const serviceDetailsQuery = `SELECT service_name, duration FROM services WHERE service_id IN (?)`;
    const serviceResults = await queryDatabase(serviceDetailsQuery, [services]);

    if (serviceResults.length === 0) {
      console.log("No valid services found for the provided service IDs.");
      return res.status(400).json({ message: "Invalid service IDs provided." });
    }

    const serviceNames = serviceResults.map((row) => row.service_name).join(", ");
    const totalDuration = serviceResults.reduce(
      (sum, service) => sum + service.duration,
      0
    );

    const endTime = calculateEndTime(booking_time, totalDuration);
// Insert booking into the database
const insertBookingQuery = `
  INSERT INTO bookings (
    customer_name,
    customer_email,
    customer_phone,
    booking_date,
    booking_time,
    end_time,
    barber_id,
    preferred_haircut
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const bookingResult = await queryDatabase(insertBookingQuery, [
  customer_name,
  customer_email,
  customer_phone,
  booking_date,
  booking_time,
  endTime,
  barber_id,
  serviceNames,
]);

const bookingId = bookingResult.insertId;
console.log(`Booking inserted with ID: ${bookingId}`);

// Insert extra services if any
if (extra_services && extra_services.length > 0) {
  const placeholders = extra_services.map(() => "(?, ?)").join(", ");
  const insertServiceQuery = `INSERT INTO booking_services (booking_id, service_id) VALUES ${placeholders}`;

  const insertValues = [];
  extra_services.forEach((serviceId) => {
    insertValues.push(parseInt(bookingId), parseInt(serviceId));
  });

  await queryDatabase(insertServiceQuery, insertValues);
  console.log(`Inserted extra services for booking ID: ${bookingId}`);
}

// Generate ICS file content
const icsContent = generateICS(booking_date, booking_time, customer_name, barber_name);

// Define email options for customer with ICS attachment
const customerMailOptions = {
  from: EMAIL_USERNAME, // Sender address
  to: customer_email, // Receiver
  subject: "Booking Confirmation",
  text: `Hello ${customer_name},\n\nYour booking on ${booking_date} at ${booking_time} with barber ${barber_name} has been confirmed.\n\nThank you!`,
  attachments: [
    {
      filename: 'booking-confirmation.ics',
      content: icsContent, // Ensure this is the correctly formatted ICS content
      contentType: 'text/calendar', // Correct MIME type
      method: 'REQUEST' // Optional, can be used for invitations
    }
  ]
};

// Send the email (assuming you're using a mail service like nodemailer)
await sendEmail(customerMailOptions);
console.log(`Confirmation email sent to ${customer_email}`);


    // Define email options for owner with ICS attachment
const ownerMailOptions = {
  from: EMAIL_USERNAME, // Sender address
  to: OWNER_EMAIL, // Owner's email
  subject: "New Booking Confirmed at Salon Sindbad", // More specific subject
  text: `Hello,\n\nA new booking has been made for barber ${barber_name} by ${customer_name} on ${booking_date} at ${booking_time}.\n\nBooking Details:\n- Customer: ${customer_name}\n- Time: ${booking_time}\n- Date: ${booking_date}\n\nRegards,\nSalon Sindbad`, // Detailed message
  attachments: [
    {
      filename: 'new-booking.ics',
      content: icsContent, // Attach the generated ICS content
      contentType: 'text/calendar', // Correct MIME type
      method: 'REQUEST' // Optional, keep if treating it as an invitation
    }
  ]
};


    console.log("Sending notification email to owner...");
    await sendEmail(ownerMailOptions);
    console.log("Owner email sent successfully.");

    // Send success response
    return res.status(201).json({
      message: "Booking created successfully and emails sent",
      bookingId: bookingId,
    });
  } catch (error) {
    console.error("Error during booking creation or email sending:", error);

    // Determine error type and respond accordingly
    if (error.message.includes("Time slot is already booked")) {
      return res.status(400).json({ message: "Time slot is already booked" });
    } else if (error.response) {
      // Nodemailer-specific errors
      return res.status(500).json({
        message: "Booking created but failed to send confirmation emails",
        bookingId: null, // Booking ID might not be available here
        error: error.message,
      });
    } else {
      // General errors
      return res.status(500).json({
        message: "Error creating booking",
        error: error.message,
      });
    }
  }
});


// GET request to retrieve all bookings
router.get("/", (req, res) => {
  const query = "SELECT * FROM bookings";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching bookings:", err);
      res
        .status(500)
        .json({ message: "Error fetching bookings", error: err.message });
    } else {
      res.status(200).json(results);
    }
  });
});

// DELETE request to delete a booking
router.delete("/delete/:bookingId", authenticateAdmin, (req, res) => {
  const bookingId = req.params.bookingId;

  // Start a transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("Transaction Error:", err);
      return res.status(500).send("Error starting transaction");
    }

    // Delete related booking_services records
    const deleteServicesQuery = "DELETE FROM booking_services WHERE booking_id = ?";
    db.query(deleteServicesQuery, [bookingId], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error deleting booking services:", err);
          res.status(500).send("Error deleting booking services");
        });
      }

      // Delete the booking
      const deleteBookingQuery = "DELETE FROM bookings WHERE booking_id = ?";
      db.query(deleteBookingQuery, [bookingId], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Error deleting booking:", err);
            res.status(500).send("Error deleting booking");
          });
        } else if (result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).send("No booking found with the given ID.");
          });
        } else {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Transaction Commit Error:", err);
                res.status(500).send("Error committing transaction");
              });
            }
            res.status(200).send("Booking deleted successfully");
          });
        }
      });
    });
  });
});

module.exports = router;
