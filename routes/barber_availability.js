const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth.js");

// POST request to mark a barber as unavailable
router.post("/", authenticateToken, (req, res) => {
  const { barber_id, unavailable_date } = req.body;
  const insertQuery =
    "INSERT INTO barber_availability (barber_id, unavailable_date) VALUES (?, ?)";
  db.query(insertQuery, [barber_id, unavailable_date], (err, result) => {
    if (err) {
      console.error("Error marking barber as unavailable:", err);
      res.status(500).send("Error adding unavailable date");
    } else {
      res
        .status(201)
        .json({
          message: "Unavailable date added successfully",
          availabilityId: result.insertId,
        });
    }
  });
});

// GET request to retrieve all unavailable dates for a specific barber
router.get("/:barberId/unavailable-dates", (req, res) => {
  const barberId = req.params.barberId;
  // Use DATE_FORMAT to format the date as a string 'YYYY-MM-DD'
  const query = "SELECT DATE_FORMAT(unavailable_date, '%Y-%m-%d') AS unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).send("Error retrieving unavailable dates");
    } else {
      // The results now already contain the date in 'YYYY-MM-DD' format as a string
      const unavailableDates = results.map(record => record.unavailable_date);
      res.status(200).json(unavailableDates);
    }
  });
});


// PUT request to update barber's unavailable date
router.put("/:availabilityId", authenticateToken, (req, res) => {
  const { unavailable_date } = req.body;
  const availabilityId = req.params.availabilityId;
  const updateQuery =
    "UPDATE barber_availability SET unavailable_date = ? WHERE availability_id = ?";
  db.query(updateQuery, [unavailable_date, availabilityId], (err, result) => {
    if (err) {
      console.error("Error updating unavailable date:", err);
      res.status(500).send("Error updating unavailable date");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Unavailable date not found");
    } else {
      res
        .status(200)
        .json({ message: "Unavailable date updated successfully" });
    }
  });
});

// DELETE request to remove barber's unavailable date
router.delete("/:availabilityId", authenticateToken, (req, res) => {
  const availabilityId = req.params.availabilityId;
  const deleteQuery =
    "DELETE FROM barber_availability WHERE availability_id = ?";
  db.query(deleteQuery, [availabilityId], (err, result) => {
    if (err) {
      console.error("Error removing unavailable date:", err);
      res.status(500).send("Error deleting unavailable date");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Unavailable date not found");
    } else {
      res
        .status(200)
        .json({ message: "Unavailable date removed successfully" });
    }
  });
});

// Optional: GET request to retrieve all unavailable dates for a specific barber
router.get("/:barberId", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const query = "SELECT * FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).send("Error retrieving unavailable dates");
    } else {
      res.status(200).json(results);
    }
  });
});

module.exports = router;
