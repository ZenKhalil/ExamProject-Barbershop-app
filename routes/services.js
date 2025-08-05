const express = require("express");
const router = express.Router();
const db = require("../db"); // Database connection

// GET request to list all services
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

module.exports = router;
