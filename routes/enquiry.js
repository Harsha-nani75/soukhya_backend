const express = require("express");
const router = express.Router();
const db = require("../config/db"); // your MySQL connection file

// GET all enquires
router.get("/", (req, res) => {
  const sql = `SELECT 
  id,
  name,
  email,
  phoneNo,
  address,
  message,
  serviceType,
  treatmentIssue,
  createdDate AS created_date,   -- correct column name
  resolved,
  resolvedDate AS resolved_date  -- correct column name
FROM enquiries
ORDER BY createdDate DESC
LIMIT 0, 25;
`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching enquires:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
