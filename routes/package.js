const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ---------------- CRUD APIs ----------------

// CREATE Package
router.post('/', (req, res) => {
  const { service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions } = req.body;
  const sql = `INSERT INTO packages (service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ id: result.insertId, message: 'Package created successfully' });
  });
});

// READ All Packages
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM packages ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// READ Single Package
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM packages WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});

// UPDATE Package
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions } = req.body;
  const sql = `UPDATE packages SET service=?, name=?, priceMonthly=?, priceYearly=?, aboutPackage=?, termsAndConditions=? WHERE id=?`;
  db.query(sql, [service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Package not found' });
    res.json({ message: 'Package updated successfully' });
  });
});

// DELETE Package
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM packages WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Package not found' });
    res.json({ message: 'Package deleted success fully' });
  });
});

module.exports = router;
