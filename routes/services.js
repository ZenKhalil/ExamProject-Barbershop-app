const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateAdmin = require("./authenticateAdmin");

// GET — fetch all services
router.get("/", (req, res) => {
  const query = "SELECT * FROM services ORDER BY is_main DESC, service_name ASC";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching services:", err);
      res.status(500).json({ error: "Error fetching services" });
    } else {
      res.status(200).json(results);
    }
  });
});

// POST — add a new service (admin only)
router.post("/", authenticateAdmin, (req, res) => {
  const { service_name, price, duration, is_main } = req.body;

  if (!service_name || !service_name.trim()) {
    return res.status(400).json({ error: "Service name is required" });
  }
  if (price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  const query = "INSERT INTO services (service_name, price, duration, is_main) VALUES (?, ?, ?, ?)";
  db.query(query, [service_name.trim(), price, duration || 30, is_main ? 1 : 0], (err, result) => {
    if (err) {
      console.error("Error adding service:", err);
      return res.status(500).json({ error: "Error adding service" });
    }
    res.status(201).json({
      message: "Service added successfully",
      service_id: result.insertId,
      service_name: service_name.trim(),
      price,
      duration: duration || 30,
      is_main: is_main ? 1 : 0,
    });
  });
});

// PUT — update a service (admin only)
router.put("/:serviceId", authenticateAdmin, (req, res) => {
  const { serviceId } = req.params;
  const { service_name, price, duration, is_main } = req.body;

  if (!service_name || !service_name.trim()) {
    return res.status(400).json({ error: "Service name is required" });
  }
  if (price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  const query = "UPDATE services SET service_name = ?, price = ?, duration = ?, is_main = ? WHERE service_id = ?";
  db.query(query, [service_name.trim(), price, duration || 30, is_main ? 1 : 0, serviceId], (err, result) => {
    if (err) {
      console.error("Error updating service:", err);
      return res.status(500).json({ error: "Error updating service" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.status(200).json({ message: "Service updated successfully" });
  });
});

// DELETE — remove a service (admin only)
router.delete("/:serviceId", authenticateAdmin, (req, res) => {
  const { serviceId } = req.params;

  // First delete related booking_services records
  const deleteBookingServices = "DELETE FROM booking_services WHERE service_id = ?";
  db.query(deleteBookingServices, [serviceId], (err) => {
    if (err) {
      console.error("Error deleting booking services:", err);
      return res.status(500).json({ error: "Error deleting service data" });
    }

    const query = "DELETE FROM services WHERE service_id = ?";
    db.query(query, [serviceId], (err, result) => {
      if (err) {
        console.error("Error deleting service:", err);
        return res.status(500).json({ error: "Error deleting service" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.status(200).json({ message: "Service deleted successfully" });
    });
  });
});

module.exports = router;