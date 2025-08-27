const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper function for safe database operations
const safeQuery = (query, params = [], callback) => {
  try {
    db.query(query, params, (err, result) => {
      if (err) {
        console.error("Database query error:", err.message);
        callback(new Error(`Database operation failed: ${err.message}`));
      } else {
        callback(null, result);
      }
    });
  } catch (error) {
    console.error("Query execution error:", error.message);
    callback(new Error(`Query execution failed: ${error.message}`));
  }
};

// Input validation helpers
const validatePackageId = (id) => {
  const packageId = parseInt(id);
  if (isNaN(packageId) || packageId <= 0) {
    throw new Error("Invalid package ID");
  }
  return packageId;
};

const validatePackageData = (data) => {
  const errors = [];
  
  if (!data.service || typeof data.service !== 'string' || data.service.trim().length === 0) {
    errors.push("Service is required and must be a non-empty string");
  }
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push("Package name is required and must be a non-empty string");
  }
  
  if (data.priceMonthly !== undefined && (isNaN(data.priceMonthly) || data.priceMonthly < 0)) {
    errors.push("Monthly price must be a non-negative number");
  }
  
  if (data.priceYearly !== undefined && (isNaN(data.priceYearly) || data.priceYearly < 0)) {
    errors.push("Yearly price must be a non-negative number");
  }
  
  if (data.aboutPackage !== undefined && typeof data.aboutPackage !== 'string') {
    errors.push("About package must be a string");
  }
  
  if (data.termsAndConditions !== undefined && typeof data.termsAndConditions !== 'string') {
    errors.push("Terms and conditions must be a string");
  }
  
  return errors;
};

// ---------------- CRUD APIs ----------------

// CREATE Package
router.post('/', (req, res) => {
  try {
    const { service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions } = req.body;

    // Input validation
    const validationErrors = validatePackageData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    const sql = `INSERT INTO packages (service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    safeQuery(sql, [service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions], (err, result) => {
      if (err) {
        console.error("Create package error:", err.message);
        return res.status(500).json({ error: 'Failed to create package' });
      }
      
      res.status(201).json({ 
        id: result.insertId, 
        message: 'Package created successfully',
        package: {
          id: result.insertId,
          service,
          name,
          priceMonthly,
          priceYearly,
          aboutPackage,
          termsAndConditions
        }
      });
    });
  } catch (error) {
    console.error("Create package route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// READ All Packages
router.get('/', (req, res) => {
  try {
    const sql = 'SELECT * FROM packages ORDER BY created_at DESC';
    safeQuery(sql, [], (err, results) => {
      if (err) {
        console.error("Get packages error:", err.message);
        return res.status(500).json({ error: 'Failed to fetch packages' });
      }
      
      res.json(results || []);
    });
  } catch (error) {
    console.error("Get packages route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// READ Single Package
router.get('/:id', (req, res) => {
  try {
    const id = validatePackageId(req.params.id);
    const sql = 'SELECT * FROM packages WHERE id = ?';
    
    safeQuery(sql, [id], (err, result) => {
      if (err) {
        console.error("Get package error:", err.message);
        return res.status(500).json({ error: 'Failed to fetch package' });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      res.json(result[0]);
    });
  } catch (error) {
    console.error("Get package route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// UPDATE Package
router.put('/:id', (req, res) => {
  try {
    const id = validatePackageId(req.params.id);
    const { service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions } = req.body;

    // Input validation
    const validationErrors = validatePackageData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    const sql = `UPDATE packages SET service=?, name=?, priceMonthly=?, priceYearly=?, aboutPackage=?, termsAndConditions=? WHERE id=?`;
    
    safeQuery(sql, [service, name, priceMonthly, priceYearly, aboutPackage, termsAndConditions, id], (err, result) => {
      if (err) {
        console.error("Update package error:", err.message);
        return res.status(500).json({ error: 'Failed to update package' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      res.json({ 
        message: 'Package updated successfully',
        package: {
          id,
          service,
          name,
          priceMonthly,
          priceYearly,
          aboutPackage,
          termsAndConditions
        }
      });
    });
  } catch (error) {
    console.error("Update package route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// DELETE Package
router.delete('/:id', (req, res) => {
  try {
    const id = validatePackageId(req.params.id);
    const sql = 'DELETE FROM packages WHERE id = ?';
    
    safeQuery(sql, [id], (err, result) => {
      if (err) {
        console.error("Delete package error:", err.message);
        return res.status(500).json({ error: 'Failed to delete package' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      res.json({ message: 'Package deleted successfully' });
    });
  } catch (error) {
    console.error("Delete package route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Package router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
