const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateAdmin = require("./authenticateAdmin");

const jwt = require("jsonwebtoken");

// GET — fetch barbers (public: name only, admin: full data with email)
router.get("/", (req, res) => {
  // Check if request has valid admin token
  let isAdmin = false;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      isAdmin = true;
    } catch (e) { /* not admin, that's fine */ }
  }

  const query = isAdmin
    ? "SELECT * FROM barbers"
    : "SELECT barber_id, name FROM barbers";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Error fetching barbers" });
    } else {
      res.status(200).json(results);
    }
  });
});

// POST — add a new barber (admin only)
router.post("/", authenticateAdmin, (req, res) => {
  const { name, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Barber name is required" });
  }

  const query = "INSERT INTO barbers (name, email) VALUES (?, ?)";
  db.query(query, [name.trim(), email || null], (err, result) => {
    if (err) {
      console.error("Error adding barber:", err);
      return res.status(500).json({ error: "Error adding barber" });
    }
    res.status(201).json({
      message: "Barber added successfully",
      barber_id: result.insertId,
      name: name.trim(),
      email: email || null,
    });
  });
});

// PUT — update barber name and email (admin only)
router.put("/:barberId", authenticateAdmin, (req, res) => {
  const { barberId } = req.params;
  const { name, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Barber name is required" });
  }

  const query = "UPDATE barbers SET name = ?, email = ? WHERE barber_id = ?";
  db.query(query, [name.trim(), email || null, barberId], (err, result) => {
    if (err) {
      console.error("Error updating barber:", err);
      return res.status(500).json({ error: "Error updating barber" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Barber not found" });
    }
    res.status(200).json({ message: "Barber updated successfully" });
  });
});

// DELETE — remove a barber (admin only)
router.delete("/:barberId", authenticateAdmin, (req, res) => {
  const { barberId } = req.params;

  // Delete in order: booking_services → bookings → barber_availability → barber
  const deleteBookingServices = `
    DELETE bs FROM booking_services bs 
    INNER JOIN bookings b ON bs.booking_id = b.booking_id 
    WHERE b.barber_id = ?`;
  
  db.query(deleteBookingServices, [barberId], (err) => {
    if (err) {
      console.error("Error deleting booking services:", err);
      return res.status(500).json({ error: "Error deleting barber data" });
    }

    const deleteBookings = "DELETE FROM bookings WHERE barber_id = ?";
    db.query(deleteBookings, [barberId], (err) => {
      if (err) {
        console.error("Error deleting bookings:", err);
        return res.status(500).json({ error: "Error deleting barber bookings" });
      }

      const deleteAvail = "DELETE FROM barber_availability WHERE barber_id = ?";
      db.query(deleteAvail, [barberId], (err) => {
        if (err) {
          console.error("Error deleting availability:", err);
          return res.status(500).json({ error: "Error deleting barber availability" });
        }

        const deleteBarber = "DELETE FROM barbers WHERE barber_id = ?";
        db.query(deleteBarber, [barberId], (err, result) => {
          if (err) {
            console.error("Error deleting barber:", err);
            return res.status(500).json({ error: "Error deleting barber" });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Barber not found" });
          }
          res.status(200).json({ message: "Barber deleted successfully" });
        });
      });
    });
  });
});

// GET — fetch barber availability
router.get("/:barberId/availability", (req, res) => {
  const barberId = req.params.barberId;
  const query = "SELECT unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      res.status(500).json({ error: "Error fetching availability" });
    } else {
      res.status(200).json(results);
    }
  });
});

// GET — fetch unavailable dates for a barber
router.get("/:barberId/unavailable-dates", (req, res) => {
  const { barberId } = req.params;
  const query = "SELECT unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).json({ error: "Error fetching unavailable dates" });
      return;
    }
    res.status(200).json(results.map(result => result.unavailable_date));
  });
});

// GET — fetch unavailable timeslots for a barber
router.get("/:barberId/unavailable-timeslots", (req, res) => {
  const { barberId } = req.params;
  const { start, end } = req.query;

  const query = `
    SELECT booking_time as start_time, end_time 
    FROM bookings 
    WHERE barber_id = ? AND booking_date BETWEEN ? AND ?
  `;

  db.query(query, [barberId, start, end], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable timeslots:", err);
      res.status(500).json({ error: "Error fetching unavailable timeslots" });
      return;
    }
    res.status(200).json(results.map(r => ({
      start: start + "T" + r.start_time,
      end: start + "T" + r.end_time,
    })));
  });
});

module.exports = router;