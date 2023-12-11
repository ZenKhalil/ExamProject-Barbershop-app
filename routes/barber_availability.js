const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/auth.js");

// Helper function to generate date range
function generateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const range = [];

  for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
    range.push(new Date(day).toISOString().split('T')[0]);
  }

  return range;
}

// POST request to mark a barber as unavailable for a range of dates
router.post("/:barberId/unavailable-dates", authenticateToken, (req, res) => {
  console.log("POST request received for /:barberId/unavailable-dates");
  const barberId = req.params.barberId;
  const { start_date, end_date } = req.body;

  const dates = generateDateRange(start_date, end_date);
  const insertQuery =
    "INSERT INTO barber_availability (barber_id, unavailable_date) VALUES ?";

  const values = dates.map((date) => [barberId, date]);

  db.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("Error marking barber as unavailable:", err);
      return res.status(500).send("Error adding unavailable dates");
    }
    res.status(201).json({
      message: "Unavailable dates added successfully",
      affectedRows: result.affectedRows,
    });
  });
});

// GET request to retrieve all unavailable dates for a specific barber
router.get("/:barberId/unavailable-dates", (req, res) => {
  const barberId = req.params.barberId;
  // Use DATE_FORMAT to format the date as a string 'YYYY-MM-DD'
  const query = "SELECT DATE_FORMAT(unavailable_date, '%Y-%m-%d') AS unavailable_date FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).send("Error retrieving unavailable dates");
    } else {
      // The results now already contain the date in 'YYYY-MM-DD' format as a string
      const unavailableDates = results.map(record => record.unavailable_date);
      res.status(200).json(unavailableDates);
    }
  });
});


// Helper function to check if the date is valid
function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;  // Invalid format
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0,10) === dateString;
}

// PUT request to update a range of barber's unavailable dates
router.put("/:barberId/unavailable-dates", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const { old_start_date, old_end_date, new_start_date, new_end_date } =
    req.body;

  if (
    !isValidDate(old_start_date) ||
    !isValidDate(old_end_date) ||
    !isValidDate(new_start_date) ||
    !isValidDate(new_end_date)
  ) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  if (new Date(new_start_date) >= new Date(new_end_date)) {
    return res
      .status(400)
      .json({ message: "Start date must be before end date" });
  }

  // Start a transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Error starting transaction:", transactionErr);
      return res.status(500).send("Error starting transaction");
    }

    // Delete the old range of unavailable dates
    const deleteQuery = `
      DELETE FROM barber_availability 
      WHERE barber_id = ? 
      AND unavailable_date BETWEEN ? AND ?`;

    db.query(
      deleteQuery,
      [barberId, old_start_date, old_end_date],
      (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error("Error deleting old unavailable dates:", deleteErr);
          return db.rollback(() => {
            res.status(500).send("Error deleting old unavailable dates");
          });
        }

        // Generate the new range of unavailable dates
        const newDates = generateDateRange(new_start_date, new_end_date);
        const insertValues = newDates.map((date) => [barberId, date]);

        if (insertValues.length === 0) {
          // No new dates to insert, so just commit the transaction
          db.commit((commitErr) => {
            if (commitErr) {
              console.error("Error committing transaction:", commitErr);
              return db.rollback(() => {
                res.status(500).send("Error committing transaction");
              });
            }
            res
              .status(200)
              .json({ message: "Unavailable dates updated successfully" });
          });
        } else {
          const insertQuery = `
          INSERT INTO barber_availability (barber_id, unavailable_date) 
          VALUES ?`;

          db.query(insertQuery, [insertValues], (insertErr, insertResult) => {
            if (insertErr) {
              console.error(
                "Error inserting new unavailable dates:",
                insertErr
              );
              return db.rollback(() => {
                res.status(500).send("Error inserting new unavailable dates");
              });
            }

            // Commit the transaction
            db.commit((commitErr) => {
              if (commitErr) {
                console.error("Error committing transaction:", commitErr);
                return db.rollback(() => {
                  res.status(500).send("Error committing transaction");
                });
              }
              res
                .status(200)
                .json({ message: "Unavailable dates updated successfully" });
            });
          });
        }
      }
    );
  });
});

// DELETE request to remove a single or a range of barber's unavailable dates
router.delete("/:barberId/unavailable-dates", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const { start_date, end_date } = req.body;

  // Check if at least start_date is provided and valid
  if (!isValidDate(start_date)) {
    return res.status(400).json({ message: "Invalid start date format" });
  }

  // If end_date is provided, check if it's valid and after start_date
  if (end_date && (!isValidDate(end_date) || new Date(start_date) >= new Date(end_date))) {
    return res
      .status(400)
      .json({ message: "Invalid end date format or start date must be before end date" });
  }

  // Start a transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Error starting transaction:", transactionErr);
      return res.status(500).send("Error starting transaction");
    }

    // Define the query based on whether an end date was provided
    let deleteQuery;
    let queryParams;
    if (end_date) {
      // Range deletion
      deleteQuery = `
        DELETE FROM barber_availability 
        WHERE barber_id = ? 
        AND unavailable_date BETWEEN ? AND ?`;
      queryParams = [barberId, start_date, end_date];
    } else {
      // Single date deletion
      deleteQuery = `
        DELETE FROM barber_availability 
        WHERE barber_id = ? 
        AND unavailable_date = ?`;
      queryParams = [barberId, start_date];
    }

    // Execute the delete query
    db.query(deleteQuery, queryParams, (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error("Error deleting unavailable dates:", deleteErr);
        return db.rollback(() => {
          res.status(500).send("Error deleting unavailable dates");
        });
      }

      if (deleteResult.affectedRows === 0) {
        return db.rollback(() => {
          res.status(404).json({ message: "No unavailable dates found to remove" });
        });
      }

      // Commit the transaction
      db.commit((commitErr) => {
        if (commitErr) {
          console.error("Error committing transaction:", commitErr);
          return db.rollback(() => {
            res.status(500).send("Error committing transaction");
          });
        }

        res.status(200).json({ message: "Unavailable dates removed successfully", affectedRows: deleteResult.affectedRows });
      });
    });
  });
});

// Optional: GET request to retrieve all unavailable dates for a specific barber
router.get("/:barberId", authenticateToken, (req, res) => {
  const barberId = req.params.barberId;
  const query = "SELECT * FROM barber_availability WHERE barber_id = ?";
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).send("Error retrieving unavailable dates");
    } else {
      res.status(200).json(results);
    }
  });
});

module.exports = router;
