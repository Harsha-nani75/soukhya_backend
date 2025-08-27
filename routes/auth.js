const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

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
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 1;
};

// JWT secret validation
const getJWTSecret = () => {
  const secret = process.env.SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured in environment variables");
    throw new Error("JWT configuration missing");
  }
  return secret;
};

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get JWT secret
    let secret;
    try {
      secret = getJWTSecret();
    } catch (secretError) {
      console.error("JWT secret error:", secretError.message);
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }

    // Check if user exists
    safeQuery('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error("Login database error:", err.message);
        return res.status(500).json({ error: 'Authentication failed' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = results[0];

      try {
        // Verify password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            role: user.role,
            email: user.email 
          }, 
          secret, 
          { 
            expiresIn: '1h',
            issuer: 'soukhya-health',
            audience: 'soukhya-users'
          }
        );

        // Return success response
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            name: user.name, 
            role: user.role,
            email: user.email
          },
          message: 'Login successful'
        });
      } catch (bcryptError) {
        console.error("Password comparison error:", bcryptError.message);
        return res.status(500).json({ error: 'Authentication failed' });
      }
    });
  } catch (error) {
    console.error("Login route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Auth router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
