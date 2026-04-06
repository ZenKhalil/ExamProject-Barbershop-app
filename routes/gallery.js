const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateAdmin = require("./authenticateAdmin");

// GET — fetch all gallery images (public)
router.get("/", (req, res) => {
  const query = "SELECT id, caption, created_at FROM gallery ORDER BY sort_order ASC, created_at DESC";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching gallery:", err);
      return res.status(500).json({ error: "Error fetching gallery" });
    }
    res.json(results);
  });
});

// GET — fetch single image data (public, for lazy loading)
router.get("/:id/image", (req, res) => {
  const query = "SELECT image_data FROM gallery WHERE id = ?";
  db.query(query, [req.params.id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    // Return raw base64 data
    res.json({ image_data: results[0].image_data });
  });
});

// POST — upload new image (admin only)
router.post("/", authenticateAdmin, (req, res) => {
  const { image_data, caption } = req.body;

  if (!image_data) {
    return res.status(400).json({ error: "Image data is required" });
  }

  // Check size (limit ~2MB base64)
  if (image_data.length > 2800000) {
    return res.status(400).json({ error: "Image too large. Max 2MB." });
  }

  // Get next sort order
  db.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM gallery", (err, results) => {
    const sortOrder = results ? results[0].next_order : 1;

    const query = "INSERT INTO gallery (image_data, caption, sort_order) VALUES (?, ?, ?)";
    db.query(query, [image_data, caption || null, sortOrder], (err, result) => {
      if (err) {
        console.error("Error uploading image:", err);
        return res.status(500).json({ error: "Error uploading image" });
      }
      res.status(201).json({
        message: "Image uploaded successfully",
        id: result.insertId,
      });
    });
  });
});

// PUT — update caption (admin only)
router.put("/:id", authenticateAdmin, (req, res) => {
  const { caption } = req.body;
  const query = "UPDATE gallery SET caption = ? WHERE id = ?";
  db.query(query, [caption || null, req.params.id], (err, result) => {
    if (err) {
      console.error("Error updating image:", err);
      return res.status(500).json({ error: "Error updating image" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ message: "Image updated successfully" });
  });
});

// DELETE — remove image (admin only)
router.delete("/:id", authenticateAdmin, (req, res) => {
  const query = "DELETE FROM gallery WHERE id = ?";
  db.query(query, [req.params.id], (err, result) => {
    if (err) {
      console.error("Error deleting image:", err);
      return res.status(500).json({ error: "Error deleting image" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ message: "Image deleted successfully" });
  });
});

module.exports = router;