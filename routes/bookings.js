const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateAdmin = require("./authenticateAdmin");
const { sendEmail } = require("./email"); // Import the email utility
require("dotenv").config(); // Ensure environment variables are loaded

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

// Function to format date consistently (avoid timezone shifts)
const formatDateForDB = (dateString) => {
  // Ensure we're working with the date as-is, without timezone conversion
  const date = new Date(dateString + "T00:00:00");
  return date.toISOString().split("T")[0];
};

// Function to create a local datetime without timezone conversion
const createLocalDateTime = (dateString, timeString) => {
  // Create date in local timezone without conversion
  return new Date(`${dateString}T${timeString}`);
};

// Function to generate ICS content for calendar event
const generateICS = (bookingDate, bookingTime, customerName, barber_name) => {
  // Use local time without timezone conversion
  const startDateTime = createLocalDateTime(bookingDate, bookingTime);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Assume 1-hour duration

  // Format for ICS in local time (no Z suffix to avoid UTC conversion)
  const formatForICS = (date) => {
    return (
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0") +
      "T" +
      date.getHours().toString().padStart(2, "0") +
      date.getMinutes().toString().padStart(2, "0") +
      date.getSeconds().toString().padStart(2, "0")
    );
  };

  const startDate = formatForICS(startDateTime);
  const endDate = formatForICS(endDateTime);

  // Generate a unique UID
  const uid = `${Date.now()}@salonsindbad.com`;

  return `BEGIN:VCALENDAR\r\n
VERSION:2.0\r\n
PRODID:-//Salon Sindbad//BookingApp//EN\r\n
CALSCALE:GREGORIAN\r\n
BEGIN:VEVENT\r\n
UID:${uid}\r\n
DTSTAMP:${startDate}\r\n
DTSTART:${startDate}\r\n
DTEND:${endDate}\r\n
SUMMARY:Booking with ${customerName}\r\n
DESCRIPTION:Your booking is confirmed on ${bookingDate} at ${bookingTime} with ${barber_name}\r\n
LOCATION:Nørrebrogade 64, 2200 København, Denmark\r\n
STATUS:CONFIRMED\r\n
END:VEVENT\r\n
END:VCALENDAR\r\n`.trim();
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
    db.query(dateRangeQuery, [barberId, startDate, endDate], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        res.status(500).json({
          message: "Error querying database for time slots",
          error: err.message,
        });
      } else {
        try {
          const timeSlots = results.map((row) => {
            // Handle date properly to avoid timezone shifts
            let bookingDateStr;
            if (row.booking_date instanceof Date) {
              // If it's already a Date object, format it properly
              bookingDateStr = row.booking_date.toISOString().split("T")[0];
            } else {
              // If it's a string, use it as-is
              bookingDateStr = row.booking_date;
            }

            // Create local datetime strings without timezone conversion
            const startISO = `${bookingDateStr}T${row.startTime}`;
            const endISO = `${bookingDateStr}T${row.endTime}`;

            return {
              start: startISO,
              end: endISO,
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
    });
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

    const barber_name = barberResults[0].barber_name;

    // Format the booking date to ensure consistency
    const formattedBookingDate = formatDateForDB(booking_date);

    console.log("Original booking_date:", booking_date);
    console.log("Formatted booking_date:", formattedBookingDate);
    console.log("Booking time:", booking_time);

    // Check if the time slot is already booked
    const checkTimeSlotQuery = `
      SELECT * FROM bookings 
      WHERE barber_id = ? 
      AND booking_date = ? 
      AND booking_time = ?`;
    const timeSlotResults = await queryDatabase(checkTimeSlotQuery, [
      barber_id,
      formattedBookingDate,
      booking_time,
    ]);

    if (timeSlotResults.length > 0) {
      console.log(
        "Time slot is already booked:",
        formattedBookingDate,
        booking_time
      );
      return res.status(400).json({ message: "Time slot is already booked" });
    }

    // Fetch service details
    const serviceDetailsQuery = `SELECT service_name, duration FROM services WHERE service_id IN (?)`;
    const serviceResults = await queryDatabase(serviceDetailsQuery, [services]);

    if (serviceResults.length === 0) {
      console.log("No valid services found for the provided service IDs.");
      return res.status(400).json({ message: "Invalid service IDs provided." });
    }

    const serviceNames = serviceResults
      .map((row) => row.service_name)
      .join(", ");
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
      formattedBookingDate, // Use formatted date
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

    // Generate ICS file content using original booking_date to maintain consistency
    const icsContent = generateICS(
      formattedBookingDate,
      booking_time,
      customer_name,
      barber_name
    );

    // Define email options for customer with ICS attachment
    const customerMailOptions = {
      from: EMAIL_USERNAME,
      to: customer_email,
      subject: "Booking Confirmation",
      text: `Hello ${customer_name},\n\nYour booking on ${formattedBookingDate} at ${booking_time} with barber ${barber_name} has been confirmed.\n\nThank you!`,
      attachments: [
        {
          filename: "booking-confirmation.ics",
          content: icsContent,
          contentType: "text/calendar",
          method: "REQUEST",
        },
      ],
    };

    await sendEmail(customerMailOptions);
    console.log(`Confirmation email sent to ${customer_email}`);

    // Define email options for owner with ICS attachment
    const ownerMailOptions = {
      from: EMAIL_USERNAME,
      to: OWNER_EMAIL,
      subject: "New Booking Confirmed at Salon Sindbad",
      text: `Hello,\n\nA new booking has been made for barber ${barber_name} by ${customer_name} on ${formattedBookingDate} at ${booking_time}.\n\nBooking Details:\n- Customer: ${customer_name}\n- Time: ${booking_time}\n- Date: ${formattedBookingDate}\n\nRegards,\nSalon Sindbad`,
      attachments: [
        {
          filename: "new-booking.ics",
          content: icsContent,
          contentType: "text/calendar",
          method: "REQUEST",
        },
      ],
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

    if (error.message.includes("Time slot is already booked")) {
      return res.status(400).json({ message: "Time slot is already booked" });
    } else if (error.response) {
      return res.status(500).json({
        message: "Booking created but failed to send confirmation emails",
        bookingId: null,
        error: error.message,
      });
    } else {
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

  // Get a connection from the pool and start a transaction
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Connection Error:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    // Start a transaction on the individual connection
    connection.beginTransaction((err) => {
      if (err) {
        console.error("Transaction Error:", err);
        connection.release();
        return res.status(500).json({ error: "Error starting transaction" });
      }

      // Delete related booking_services records
      const deleteServicesQuery = "DELETE FROM booking_services WHERE booking_id = ?";
      connection.query(deleteServicesQuery, [bookingId], (err, result) => {
        if (err) {
          return connection.rollback(() => {
            console.error("Error deleting booking services:", err);
            connection.release();
            res.status(500).json({ error: "Error deleting booking services" });
          });
        }

        // Delete the booking
        const deleteBookingQuery = "DELETE FROM bookings WHERE booking_id = ?";
        connection.query(deleteBookingQuery, [bookingId], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              console.error("Error deleting booking:", err);
              connection.release();
              res.status(500).json({ error: "Error deleting booking" });
            });
          } else if (result.affectedRows === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ error: "No booking found with the given ID." });
            });
          } else {
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  console.error("Transaction Commit Error:", err);
                  connection.release();
                  res.status(500).json({ error: "Error committing transaction" });
                });
              }
              connection.release();
              console.log(`Booking ${bookingId} deleted successfully`);
              res.status(200).json({ message: "Booking deleted successfully" });
            });
          }
        });
      });
    });
  });
});

module.exports = router;
