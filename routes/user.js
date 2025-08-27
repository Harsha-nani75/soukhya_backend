const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

// JWT secret validation
const getJWTSecret = () => {
  const secret = process.env.SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured in environment variables");
    throw new Error("JWT configuration missing");
  }
  return secret;
};

// Token verification middleware with error handling
function verifyToken(req, res, next) {
  try {
    const token = req.headers['authorization'];
    
    if (!token) {
      return res.status(403).json({ error: 'No token provided' });
    }

    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    if (!tokenValue) {
      return res.status(403).json({ error: 'Invalid token format' });
    }

    let secret;
    try {
      secret = getJWTSecret();
    } catch (secretError) {
      console.error("JWT secret error:", secretError.message);
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }

    jwt.verify(tokenValue, secret, (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err.message);
        
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        } else {
          return res.status(500).json({ error: 'Failed to authenticate' });
        }
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Role authorization middleware with error handling
function authorizeRoles(roles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!req.user.role) {
        return res.status(403).json({ error: 'User role not defined' });
      }

      if (!Array.isArray(roles)) {
        console.error("Invalid roles configuration:", roles);
        return res.status(500).json({ error: 'Authorization configuration error' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Access denied',
          required: roles,
          current: req.user.role
        });
      }
      
      next();
    } catch (error) {
      console.error("Role authorization error:", error.message);
      res.status(500).json({ error: 'Authorization failed' });
    }
  }
};

// Admin data endpoint
router.get('/admin-data', verifyToken, authorizeRoles(['admin']), (req, res) => {
  try {
    res.json({ 
      message: 'Admin content',
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Admin data route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisor data endpoint
router.get('/supervisor-data', verifyToken, authorizeRoles(['supervisor']), (req, res) => {
  try {
    res.json({ 
      message: 'Supervisor content',
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Supervisor data route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User data endpoint
router.get('/user-data', verifyToken, authorizeRoles(['user', 'customer']), (req, res) => {
  try {
    res.json({ 
      message: 'User content',
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("User data route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile endpoint (accessible by authenticated users)
router.get('/profile', verifyToken, (req, res) => {
  try {
    res.json({ 
      message: 'User profile retrieved successfully',
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("User profile route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("User router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;

