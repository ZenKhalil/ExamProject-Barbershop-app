const mysql = require("mysql");
const fs = require("fs");
const path = require("path"); 
require("dotenv").config();

const sslPath = path.join(__dirname, "DigiCertGlobalRootCA.crt.pem");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: "+01:00", // Set the timezone to Copenhagen's timezone (UTC+1)
  ssl: {
    ca: fs.readFileSync(sslPath),
  },
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

module.exports = connection;
