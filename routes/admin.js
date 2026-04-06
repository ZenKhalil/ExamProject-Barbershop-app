const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();
const authenticateAdmin = require("./authenticateAdmin");

// Use the hashed password from the environment variables
const adminUsername = process.env.ADMIN_USERNAME || "admin";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Received credentials:", { username, password: "***" });

  // Re-read .env to get latest password (in case it was changed)
  const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, "..", ".env")));
  const adminPassword = envConfig.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (username === adminUsername) {
    const match = bcrypt.compareSync(password, adminPassword);
    console.log("Password match:", match);

    if (match) {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    } else {
      res.status(401).send("Authentication failed");
    }
  } else {
    res.status(401).send("Authentication failed");
  }
});

// PUT — change admin password
router.put("/change-password", authenticateAdmin, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Both current and new password are required" });
  }

  if (new_password.length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  }

  // Read current .env to get the stored hashed password
  const envPath = path.join(__dirname, "..", ".env");
  let envContent;
  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch (err) {
    console.error("Error reading .env:", err);
    return res.status(500).json({ error: "Server configuration error" });
  }

  const envConfig = dotenv.parse(envContent);
  const storedHash = envConfig.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  // Verify current password
  const isMatch = bcrypt.compareSync(current_password, storedHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  // Hash the new password
  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(new_password, salt);

  // Update .env file
  const updatedEnv = envContent.replace(
    /^ADMIN_PASSWORD=.*/m,
    "ADMIN_PASSWORD=" + newHash
  );

  try {
    fs.writeFileSync(envPath, updatedEnv, "utf8");
    // Update process.env so it takes effect immediately
    process.env.ADMIN_PASSWORD = newHash;
    console.log("Admin password updated successfully");
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error writing .env:", err);
    res.status(500).json({ error: "Failed to save new password" });
  }
});

module.exports = router;