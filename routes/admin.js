const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();

// Admin login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (username === adminUsername) {
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    if (passwordMatch) {
      // Token generation
      const token = jwt.sign({ username }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    } else {
      // Invalid password
      res.status(401).send("Unauthorized: Incorrect password");
    }
  } else {
    // Invalid username
    res.status(401).send("Unauthorized: Incorrect username");
  }
});

module.exports = router;
