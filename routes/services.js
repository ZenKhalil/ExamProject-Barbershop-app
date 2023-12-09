const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth.js"); // Assuming you have this middleware

// GET request to list all services (publicly accessible)
router.get("/", (req, res) => {
  const query = "SELECT * FROM services";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send("Error fetching services");
    } else {
      res.status(200).json(results);
    }
  });
});

// POST request to add a new service (both main and extra)
router.post("/", authenticateToken, (req, res) => {
  const { service_name, price, is_main, duration } = req.body;
  const insertQuery =
    "INSERT INTO services (service_name, price, is_main, duration) VALUES (?, ?, ?, ?)";
  db.query(
    insertQuery,
    [service_name, price, is_main, duration],
    (err, result) => {
      if (err) {
        res.status(500).send("Error adding new service");
      } else {
        res.status(201).json({
          message: "Service added successfully",
          serviceId: result.insertId,
        });
      }
    }
  );
});

// PUT request to update an existing service (both main and extra)
router.put("/:serviceId", authenticateToken, (req, res) => {
  const { service_name, price, is_main, duration } = req.body;
  const serviceId = req.params.serviceId;
  const updateQuery =
    "UPDATE services SET service_name = ?, price = ?, is_main = ?, duration = ? WHERE service_id = ?";
  db.query(
    updateQuery,
    [service_name, price, is_main, duration, serviceId],
    (err, result) => {
      if (err) {
        res.status(500).send("Error updating service");
      } else if (result.affectedRows === 0) {
        res.status(404).send("Service not found");
      } else {
        res.status(200).json({ message: "Service updated successfully" });
      }
    }
  );
});

// DELETE request to delete a service (both main and extra)
router.delete("/:serviceId", authenticateToken, (req, res) => {
  const serviceId = req.params.serviceId;
  const deleteQuery = "DELETE FROM services WHERE service_id = ?";
  db.query(deleteQuery, [serviceId], (err, result) => {
    if (err) {
      res.status(500).send("Error deleting service");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Service not found");
    } else {
      res.status(200).send("Service deleted successfully");
    }
  });
});

module.exports = router;
