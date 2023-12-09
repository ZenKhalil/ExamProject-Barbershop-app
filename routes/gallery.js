const express = require("express");
const router = express.Router();
const db = require("../db"); // Update this path if necessary
const multer = require("multer");
const fs = require("fs");
const authenticateToken = require("../middleware/auth.js"); // Update this path if necessary

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// GET request to retrieve all images - No authentication needed to view images
router.get("/", (req, res) => {
  db.query("SELECT * FROM barbershop_gallery", (err, results) => {
    if (err) {
      res.status(500).send("Error retrieving images from database");
    } else {
      res.status(200).json(results);
    }
  });
});

// POST request to upload a new image - Restricted to authenticated admin
router.post("/", authenticateToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image uploaded.");
  }

  const image_name = req.body.image_name || req.file.filename;
  const image_path = req.file.path;

  fs.readFile(image_path, (err, image_data) => {
    if (err) {
      return res.status(500).send("Error reading image file");
    }

    const query =
      "INSERT INTO barbershop_gallery (image_name, image) VALUES (?, ?)";
    db.query(query, [image_name, image_data], (err, result) => {
      if (err) {
        res.status(500).send("Error saving image to database");
      } else {
        fs.unlink(image_path, (err) => {
          if (err) console.error("Error deleting temp image file:", err);
        });
        res.status(201).send("Image uploaded successfully");
      }
    });
  });
});

// DELETE request to delete an image - Restricted to authenticated admin
router.delete("/:image_id", authenticateToken, (req, res) => {
  const image_id = req.params.image_id;

  const query = "DELETE FROM barbershop_gallery WHERE image_id = ?";
  db.query(query, [image_id], (err, result) => {
    if (err) {
      res.status(500).send("Error deleting image from database");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Image not found");
    } else {
      res.status(200).send("Image deleted successfully");
    }
  });
});

module.exports = router;
