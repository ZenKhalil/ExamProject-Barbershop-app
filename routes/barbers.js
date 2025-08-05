const express = require("express");
const router = express.Router();
const db = require("../db"); // Database connection

// GET request to fetch barber details
router.get("/", (req, res) => {
  const query = "SELECT * FROM barbers";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send("Error fetching barbers");
    } else {
      res.status(200).json(results);
    }
  });
});

// GET request to fetch barber availability
router.get("/:barberId/availability", (req, res) => {
  const barberId = req.params.barberId;
  const query =
    "SELECT unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      res.status(500).send("Error fetching availability");
    } else {
      res.status(200).json(results);
    }
  });
});

// GET request to fetch unavailable dates for a barber
router.get("/:barberId/unavailable-dates", (req, res) => {
  const { barberId } = req.params;

  const query = "SELECT unavailable_date FROM barber_availability WHERE barber_id = ?";
  
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).json({ message: "Error fetching unavailable dates", error: err.message });
      return;
    }
    res.status(200).json(results.map(result => result.unavailable_date));
  });
});

// GET request to fetch unavailable timeslots for a barber
router.get("/:barberId/unavailable-timeslots", (req, res) => {
  const { barberId } = req.params;
  const { start, end } = req.query;

  const query = `
    SELECT start_time, end_time FROM booking_services
    WHERE barber_id = ? AND booking_date BETWEEN ? AND ?
  `;

  db.query(query, [barberId, start, end], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable timeslots:", err);
      res.status(500).json({ message: "Error fetching unavailable timeslots", error: err.message });
      return;
    }
    res.status(200).json(results);
  });
});

module.exports = router;
