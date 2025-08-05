const express = require("express");
const router = express.Router();
const db = require("../db.js");
const authenticateAdmin = require("./authenticateAdmin.js");

// Helper function to generate date range
function generateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const range = [];

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    range.push(day.toISOString().split("T")[0]);
  }

  return range;
}

// Helper function to check if the date is valid
function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false; // Invalid format
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0, 10) === dateString;
}

// POST request to mark a barber as unavailable for a range of dates
router.post("/:barberId/unavailable-dates", authenticateAdmin, (req, res) => {
  console.log("POST request received for /:barberId/unavailable-dates");
  const barberId = req.params.barberId;
  const { start_date, end_date } = req.body;

  // Validate input dates
  if (!isValidDate(start_date)) {
    console.error("Invalid start date:", start_date);
    return res.status(400).json({ message: "Invalid start date format" });
  }
  if (end_date && !isValidDate(end_date)) {
    console.error("Invalid end date:", end_date);
    return res.status(400).json({ message: "Invalid end date format" });
  }

  const dates = generateDateRange(start_date, end_date || start_date);
  console.log("Generated date range:", dates);

  const values = dates.map((date) => [barberId, date]);
  const placeholders = values.map(() => "(?, ?)").join(", ");
  const insertQuery = `
    INSERT IGNORE INTO barber_availability (barber_id, unavailable_date)
    VALUES ${placeholders}
  `;

  const flattenedValues = values.flat();

  console.log("Insert Query:", insertQuery);
  console.log("Flattened Values:", flattenedValues);

  db.query(insertQuery, flattenedValues, (err, result) => {
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
  const query = `
    SELECT DATE_FORMAT(unavailable_date, '%Y-%m-%d') AS unavailable_date
    FROM barber_availability
    WHERE barber_id = ?
  `;
  db.query(query, [barberId], (err, results) => {
    if (err) {
      console.error("Error fetching unavailable dates:", err);
      res.status(500).send("Error retrieving unavailable dates");
    } else {
      const unavailableDates = results.map((record) => record.unavailable_date);
      res.status(200).json(unavailableDates);
    }
  });
});

// PUT request to update a range of barber's unavailable dates
router.put("/:barberId/unavailable-dates", authenticateAdmin, (req, res) => {
  const barberId = req.params.barberId;
  const { old_start_date, old_end_date, new_start_date, new_end_date } = req.body;

  // Validate input dates
  if (
    !isValidDate(old_start_date) ||
    !isValidDate(old_end_date) ||
    !isValidDate(new_start_date) ||
    !isValidDate(new_end_date)
  ) {
    return res.status(400).json({ message: "Invalid date format" });
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
      AND unavailable_date BETWEEN ? AND ?
    `;

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
        const insertPlaceholders = insertValues.map(() => "(?, ?)").join(", ");
        const insertQuery = `
          INSERT IGNORE INTO barber_availability (barber_id, unavailable_date) 
          VALUES ${insertPlaceholders}
        `;
        const insertFlattenedValues = insertValues.flat();

        db.query(insertQuery, insertFlattenedValues, (insertErr, insertResult) => {
          if (insertErr) {
            console.error("Error inserting new unavailable dates:", insertErr);
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
            res.status(200).json({ message: "Unavailable dates updated successfully" });
          });
        });
      }
    );
  });
});

// DELETE request to remove a single or a range of barber's unavailable dates
router.delete("/:barberId/unavailable-dates", authenticateAdmin, (req, res) => {
  const barberId = req.params.barberId;
  const { dates, start_date, end_date } = req.body;

  // Helper function to validate 'YYYY-MM-DD' format
  function isValidDate(dateString) {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false; // Invalid format
    const d = new Date(dateString);
    const dNum = d.getTime();
    if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
    return d.toISOString().slice(0, 10) === dateString;
  }

  // Validation
  if (dates && Array.isArray(dates)) {
    // Deleting specific dates
    const invalidDates = dates.filter(date => !isValidDate(date));
    if (invalidDates.length > 0) {
      return res.status(400).json({ message: "Invalid date format in dates array" });
    }

    const deleteQuery = `
      DELETE FROM barber_availability 
      WHERE barber_id = ? 
      AND unavailable_date IN (?)
    `;
    db.query(deleteQuery, [barberId, dates], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error("Error deleting unavailable dates:", deleteErr);
        return res.status(500).send("Error deleting unavailable dates");
      }

      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ message: "No unavailable dates found to remove" });
      }

      res.status(200).json({
        message: "Unavailable dates removed successfully",
        affectedRows: deleteResult.affectedRows,
      });
    });
  } else if (start_date && isValidDate(start_date)) {
    // Deleting a range of dates
    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({ message: "Invalid end date format" });
    }

    const deleteQuery = end_date
      ? `
        DELETE FROM barber_availability 
        WHERE barber_id = ? 
        AND unavailable_date BETWEEN ? AND ?
      `
      : `
        DELETE FROM barber_availability 
        WHERE barber_id = ? 
        AND unavailable_date = ?
      `;
    const queryParams = end_date
      ? [barberId, start_date, end_date]
      : [barberId, start_date];

    db.query(deleteQuery, queryParams, (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error("Error deleting unavailable dates:", deleteErr);
        return res.status(500).send("Error deleting unavailable dates");
      }

      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ message: "No unavailable dates found to remove" });
      }

      res.status(200).json({
        message: "Unavailable dates removed successfully",
        affectedRows: deleteResult.affectedRows,
      });
    });
  } else {
    return res.status(400).json({ message: "Invalid request parameters" });
  }
});


module.exports = router;
