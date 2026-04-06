const db = require("./db");

// Delete bookings older than 12 months
// Runs once on startup, then every 24 hours
function cleanupOldBookings() {
  const query = `
    DELETE bs FROM booking_services bs
    INNER JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE b.booking_date < DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("[Cleanup] Error deleting old booking_services:", err.message);
      return;
    }

    const deletedServices = result.affectedRows;

    const bookingsQuery = `
      DELETE FROM bookings 
      WHERE booking_date < DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    `;

    db.query(bookingsQuery, (err, result) => {
      if (err) {
        console.error("[Cleanup] Error deleting old bookings:", err.message);
        return;
      }

      if (result.affectedRows > 0) {
        console.log(
          "[Cleanup] Removed " + result.affectedRows + " booking(s) and " +
          deletedServices + " service record(s) older than 12 months"
        );
      } else {
        console.log("[Cleanup] No old bookings to remove");
      }
    });
  });
}

function startCleanupSchedule() {
  // Run once on startup
  console.log("[Cleanup] Data retention policy: 12 months. Running initial check...");
  cleanupOldBookings();

  // Then run every 24 hours
  setInterval(cleanupOldBookings, 24 * 60 * 60 * 1000);
}

module.exports = { startCleanupSchedule };