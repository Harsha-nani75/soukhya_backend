const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();


require('dotenv').config();
const SECRET = process.env.SECRET 


function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(500).json({ error: 'Failed to authenticate' });
    req.user = decoded;
    next();
  });
}

function authorizeRoles(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

router.get('/admin-data', verifyToken, authorizeRoles(['admin']), (req, res) => {
  res.json({ message: 'Admin content' });
});

router.get('/supervisor-data', verifyToken, authorizeRoles(['supervisor']), (req, res) => {
  res.json({ message: 'Supervisor content' });
});

router.get('/user-data', verifyToken, authorizeRoles(['user']), (req, res) => {
  res.json({ message: 'User content' });
});

module.exports = router;

