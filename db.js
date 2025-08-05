const mysql = require("mysql2");
require("dotenv").config();

// Configuration for AWS RDS
const dbConfig = {
  host:
    process.env.DB_HOST ||
    "barbershop-db.c3umamg4mgp7.eu-north-1.rds.amazonaws.com",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  dateStrings: true,
  // AWS RDS specific settings
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  // Connection pool settings only
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
};

// Create connection pool instead of single connection for better performance
const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the AWS RDS database:", err.message);
    console.error("Error code:", err.code);
    console.error("Error details:", {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
    });

    // Common error messages and solutions
    if (err.code === "ENOTFOUND") {
      console.error(
        "Solution: Check if the RDS endpoint is correct and accessible"
      );
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("Solution: Check your database username and password");
    } else if (err.code === "ECONNREFUSED") {
      console.error(
        "Solution: Check if the RDS instance is running and security groups allow access"
      );
    }
    return;
  }

  console.log("Successfully connected to AWS RDS MySQL database");
  console.log("Connection ID:", connection.threadId);

  // Test query
  connection.query("SELECT VERSION() as version", (err, results) => {
    if (err) {
      console.error("Error testing database query:", err);
    } else {
      console.log("MySQL Version:", results[0].version);
    }
    connection.release(); // Release the connection back to pool
  });
});

// Handle pool errors
pool.on("connection", (connection) => {
  console.log(
    "New database connection established as id " + connection.threadId
  );
});

pool.on("error", (err) => {
  console.error("Database pool error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.error("Database connection was closed.");
  }
  if (err.code === "ER_CON_COUNT_ERROR") {
    console.error("Database has too many connections.");
  }
  if (err.code === "ECONNREFUSED") {
    console.error("Database connection was refused.");
  }
});

// Helper function to get a connection and handle transactions
pool.getConnectionWithTransaction = function (callback) {
  this.getConnection((err, connection) => {
    if (err) return callback(err);

    // Add transaction methods to the connection
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Add commit helper
      connection.commitTransaction = function (callback) {
        this.commit((err) => {
          this.release();
          callback(err);
        });
      };

      // Add rollback helper
      connection.rollbackTransaction = function (callback) {
        this.rollback(() => {
          this.release();
          if (callback) callback();
        });
      };

      callback(null, connection);
    });
  });
};

// Export the pool for use in other modules
module.exports = pool;
