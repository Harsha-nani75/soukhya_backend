const express = require('express');
const router = express.Router();
const db = require('../config/db.js'); // your DB connection file

// GET all diseases with system + category
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        d.disease_id,
        d.name AS disease_name,
        d.code,
        c.category_id,
        c.name AS category_name,
        s.system_id,
        s.name AS system_name
      FROM diseases d
      JOIN categories c ON d.category_id = c.category_id
      JOIN systems s ON c.system_id = s.system_id
      ORDER BY s.name, c.name, d.name;
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
