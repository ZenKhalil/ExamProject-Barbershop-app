const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// Use the hashed password from the environment variables
const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD; // Should be the hashed password

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Received credentials:", { username, password });

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

module.exports = router;
