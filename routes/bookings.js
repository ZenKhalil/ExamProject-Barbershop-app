const express = require("express");
const router = express.Router();
const db = require("../db");

// GET request to retrieve unavailable time slots for a specific barber and date
router.get("/unavailable-timeslots", (req, res) => {
  const barberId = req.query.barberId;
  const startDate = req.query.start;
  const endDate = req.query.end;

  // Validate barberId
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
    // Handling date range
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
            // Create a new Date object from booking_date
            const bookingDate = new Date(row.booking_date);

            // Add one day to the booking date
            bookingDate.setDate(bookingDate.getDate() + 1);

            // Convert adjusted date to ISO string
            const adjustedDateStr = bookingDate.toISOString().split("T")[0];

            // Construct full ISO strings without UTC designation ('Z')
            const startISO = `${adjustedDateStr}T${row.startTime}`;
            const endISO = `${adjustedDateStr}T${row.endTime}`;

            // Create JavaScript Date objects and subtract one hour
            const start = new Date(startISO);
            start.setHours(start.getHours() - 1);
            const end = new Date(endISO);
            end.setHours(end.getHours() - 1);

            // Return ISO strings for adjusted Date objects
            return {
              start: start.toISOString(),
              end: end.toISOString(),
            };
          });

          // Send the constructed time slots back in the response
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
    // Missing required date parameters
    return res.status(400).json({
      message: "Missing date or date range parameters",
    });
  }
});

// Helper function to calculate end time
// Adjusting calculateEndTime function
function calculateEndTime(startTime, durationInMinutes) {
  // Ensure startTime is in UTC
  let [hours, minutes] = startTime.split(":").map(Number);
  minutes += durationInMinutes;

  // Handle minute and hour overflow
  while (minutes >= 60) {
    hours++;
    minutes -= 60;
  }
  hours %= 24;

  // Format and return time as UTC
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// POST request to create a new booking
router.post("/create", (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    booking_date,
    booking_time,
    barber_id,
    services, // Array of service IDs
  } = req.body;

  // First, check if the time slot for the barber is already taken
  const checkTimeSlotQuery = `
    SELECT * FROM bookings 
    WHERE barber_id = ? 
    AND booking_date = ? 
    AND booking_time = ?`;

  db.query(
    checkTimeSlotQuery,
    [barber_id, booking_date, booking_time],
    (timeSlotErr, timeSlotResults) => {
      if (timeSlotErr) {
        console.error("Error checking time slot availability:", timeSlotErr);
        return res.status(500).json({
          message: "Error checking time slot availability",
          error: timeSlotErr.message,
        });
      }

      if (timeSlotResults.length > 0) {
        return res.status(400).json({ message: "Time slot is already booked" });
      }

      // Fetch service details (names and durations) based on IDs
      const serviceDetailsQuery = `SELECT service_name, duration FROM services WHERE service_id IN (?)`;
      db.query(
        serviceDetailsQuery,
        [services],
        (serviceErr, serviceResults) => {
          if (serviceErr) {
            console.error("Error fetching service details:", serviceErr);
            return res.status(500).json({
              message: "Error fetching service details",
              error: serviceErr.message,
            });
          }

          // Concatenate service names and calculate total duration
          const serviceNames = serviceResults
            .map((row) => row.service_name)
            .join(", ");
          const totalDuration = serviceResults.reduce(
            (sum, service) => sum + service.duration,
            0
          );

          // Calculate end time based on total duration
          const endTime = calculateEndTime(booking_time, totalDuration);

          // Create the booking
          const insertBookingQuery = `
        INSERT INTO bookings (
          customer_name,
          customer_email,
          customer_phone,
          booking_date,
          booking_time,
          end_time,
          barber_id,
          preferred_haircut,
          service_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          db.query(
            insertBookingQuery,
            [
              customer_name,
              customer_email,
              customer_phone,
              booking_date,
              booking_time,
              endTime,
              barber_id,
              serviceNames,
              JSON.stringify(services),
            ],
            (bookingErr, bookingResult) => {
              if (bookingErr) {
                console.error("Error creating booking:", bookingErr);
                return res.status(500).json({
                  message: "Error creating booking",
                  error: bookingErr.message,
                });
              }

              res.status(201).json({
                message: "Booking created successfully",
                bookingId: bookingResult.insertId,
              });
            }
          );
        }
      );
    }
  );
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
router.delete("/delete/:bookingId", (req, res) => {
  const bookingId = req.params.bookingId;
  const deleteQuery = "DELETE FROM bookings WHERE booking_id = ?";
  db.query(deleteQuery, [bookingId], (err, result) => {
    if (err) {
      console.error("Error deleting booking:", err);
      res.status(500).send("Error deleting booking");
    } else if (result.affectedRows === 0) {
      res.status(404).send("No booking found with the given ID.");
    } else {
      res.status(200).send("Booking deleted successfully");
    }
  });
});

module.exports = router;
