const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();  // This should be done before accessing any environment variables

const secretKey = process.env.JWT_SECRET;

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token is missing" });
  }

  jwt.verify(token, secretKey, (err, admin) => {
    if (err) {
      return res.status(403).json({ message: "Invalid access token" });
    }

    // You can add more checks here if needed
    req.admin = admin;
    next();
  });
}

module.exports = authenticateAdmin;
