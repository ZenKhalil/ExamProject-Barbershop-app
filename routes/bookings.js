const express = require("express");
const router = express.Router();
const db = require("../db");

// GET request to retrieve unavailable time slots for a specific barber and date
router.get("/unavailable-timeslots", (req, res) => {
  const barberId = req.query.barberId;
  const date = req.query.date;
  const startDate = req.query.start;
  const endDate = req.query.end;

  // Validate barberId
  if (!barberId) {
    return res.status(400).json({ message: "Missing barberId parameter" });
  }

  // Define queries for single date and date range
  const singleDateQuery = `
    SELECT 
      booking_time AS startTime,
      end_time AS endTime
    FROM bookings
    WHERE barber_id = ?
    AND booking_date = ?`;

  const dateRangeQuery = `
    SELECT 
      booking_date,
      booking_time AS startTime,
      end_time AS endTime
    FROM bookings
    WHERE barber_id = ?
    AND booking_date BETWEEN ? AND ?`;

  // Execute query based on input parameters
  if (date) {
    // Handling single date
    db.query(singleDateQuery, [barberId, date], (err, results) => {
      if (err) {
        console.error("Error fetching unavailable time slots for single date:", err);
        return res.status(500).json({
          message: "Error fetching unavailable time slots",
          error: err.message,
        });
      }
      // Map the result to the correct format
      const timeSlots = results.map((row) => ({
        start: `${date}T${row.startTime}`,
        end: `${date}T${row.endTime}`,
      }));
      res.status(200).json(timeSlots);
    });
  } else if (startDate && endDate) {
    // Handling date range
db.query(dateRangeQuery, [barberId, startDate, endDate], (err, results) => {
  if (err) {
    // handle error
  } else {
    try {
      const timeSlots = results.map((row) => {
        // Assuming the database returns the booking_date in UTC and startTime and endTime in local time
        // First, get the date as a string in YYYY-MM-DD format
        const bookingDateStr = row.booking_date.toISOString().split("T")[0];

        // Then, create a Date object for start and end using the local timezone
        const startTimeStr = `${bookingDateStr}T${row.startTime}Z`; // 'Z' denotes UTC
        const endTimeStr = `${bookingDateStr}T${row.endTime}Z`;

        // Now, we convert them to Date objects
        const start = new Date(startTimeStr);
        const end = new Date(endTimeStr);

        // Check if the dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error("Invalid date constructed");
        }

        // Then return the slots in ISO format
        return {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      });
      res.json(timeSlots);
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error constructing dates from database values",
          error: error.toString(),
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
function calculateEndTime(startTime, durationInMinutes) {
  if (!startTime) {
    throw new Error("startTime is undefined");
  }

  // Extract hours and minutes from the startTime
  let [hours, minutes] = startTime.split(":").map(Number);

  // Add duration to the minutes
  minutes += durationInMinutes;

  // Handle minute overflow
  while (minutes >= 60) {
    hours += 1;
    minutes -= 60;
  }

  // Handle hour overflow and keep hours within the 24-hour format
  hours = hours % 24;

  // Format the hours and minutes to ensure two digits
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");

  // Return the new time as a string
  return `${formattedHours}:${formattedMinutes}`;
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
