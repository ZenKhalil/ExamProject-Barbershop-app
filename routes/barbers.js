const express = require("express");
const router = express.Router();
const db = require("../db"); // Update the path if necessary
const authenticateToken = require("../middleware/auth.js"); // Update the path if necessary

// GET request to fetch all barber details
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

// POST request to add a new barber - Restricted to authenticated admin
router.post("/", authenticateToken, (req, res) => {
  const { name, email, phone } = req.body;
  const query = "INSERT INTO barbers (name, email, phone) VALUES (?, ?, ?)";
  db.query(query, [name, email, phone], (err, result) => {
    if (err) {
      res.status(500).send("Error adding new barber");
    } else {
      res
        .status(201)
        .json({
          message: "Barber added successfully",
          barberId: result.insertId,
        });
    }
  });
});

// PUT request to update an existing barber - Restricted to authenticated admin
router.put("/:barberId", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const { name, email, phone } = req.body;
  const query =
    "UPDATE barbers SET name = ?, email = ?, phone = ? WHERE barber_id = ?";
  db.query(query, [name, email, phone, barberId], (err, result) => {
    if (err) {
      res.status(500).send("Error updating barber");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Barber not found");
    } else {
      res.status(200).json({ message: "Barber updated successfully" });
    }
  });
});

// DELETE request to delete a barber - Restricted to authenticated admin
router.delete("/:barberId", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const query = "DELETE FROM barbers WHERE barber_id = ?";
  db.query(query, [barberId], (err, result) => {
    if (err) {
      res.status(500).send("Error deleting barber");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Barber not found");
    } else {
      res.status(200).json({ message: "Barber deleted successfully" });
    }
  });
});

// GET request to fetch a specific barber's availability
router.get("/:barberId/availability", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const query =
    "SELECT unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      res.status(500).send("Error fetching barber's availability");
    } else {
      res.status(200).json(results);
    }
  });
});

module.exports = router;
