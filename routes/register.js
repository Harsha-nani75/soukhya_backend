const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../config/db');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// OTP storage with cleanup mechanism
let otpStore = {}; // temporary store { email: { otp, expiresAt, attempts } }

// Cleanup expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(otpStore).forEach(email => {
    if (otpStore[email].expiresAt < now) {
      delete otpStore[email];
    }
  });
}, 10 * 60 * 1000);

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

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateName = (name) => {
  return name && name.trim().length >= 2;
};

// Email transporter setup with error handling
const createTransporter = () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email configuration missing");
    }
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } catch (error) {
    console.error("Email transporter error:", error.message);
    return null;
  }
};

// Image path handling with error checking
const getImagePath = () => {
  try {
    const imagePath = path.join(__dirname, "../assets/logo.png");
    if (!fs.existsSync(imagePath)) {
      console.warn("Logo image not found at:", imagePath);
      return null;
    }
    return imagePath;
  } catch (error) {
    console.error("Image path error:", error.message);
    return null;
  }
};

// Generate OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting for OTP requests
const otpRateLimit = new Map();
const RATE_LIMIT_WINDOW = 2 * 60 * 1000; // 2 minutes
const MAX_OTP_ATTEMPTS = 3;

const checkRateLimit = (email) => {
  const now = Date.now();
  const userAttempts = otpRateLimit.get(email) || { count: 0, firstAttempt: now };
  
  if (now - userAttempts.firstAttempt > RATE_LIMIT_WINDOW) {
    userAttempts.count = 1;
    userAttempts.firstAttempt = now;
  } else {
    userAttempts.count++;
  }
  
  otpRateLimit.set(email, userAttempts);
  
  if (userAttempts.count > MAX_OTP_ATTEMPTS) {
    return false;
  }
  
  return true;
};

// ---------------- REGISTER (Step 1: Send OTP) ----------------
router.post('/register', async (req, res) => {
  try {
    const { name, phnum, email, password, role } = req.body;

    // Input validation
    if (!name || !phnum || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validateName(name)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    if (!validatePhone(phnum)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait before trying again.' });
    }

    // Check if user already exists
    safeQuery('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error("Check user exists error:", err.message);
        return res.status(500).json({ error: 'Failed to check user existence' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes validity

      otpStore[email] = {
        name,
        phnum,
        email,
        password,
        otp,
        role: role || 'customer',
        expiresAt,
        createdAt: Date.now(),
        attempts: 0
      };

      // Send OTP to mail
      const transporter = createTransporter();
      if (!transporter) {
        return res.status(500).json({ error: 'Email service not available' });
      }

      const imagePath = getImagePath();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Soukhya Registration OTP',
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
            <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
              ${imagePath ? `<img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />` : ''}
              <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
              <p style="font-size: 16px; color: #333;">
                Your <strong>One-Time Password (OTP)</strong> for registration is:
              </p>
              <h1 style="letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
              <p style="color: #666; font-size: 14px;">
                This OTP is valid for <strong>2 minutes</strong>. Please do not share it with anyone.
              </p>
              <hr style="margin: 20px 0;"/>
              <p style="font-size: 12px; color: #999;">
                &copy; 2025 Soukhya Health. All rights reserved.
              </p>
            </div>
          </div>
        `,
        attachments: imagePath ? [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }] : []
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error("Send OTP error:", err.message);
          delete otpStore[email]; // Cleanup on failure
          return res.status(500).json({ error: 'Failed to send OTP' });
        }

        res.json({ message: 'OTP sent to email. Please verify within 2 minutes.' });
      });
    });
  } catch (error) {
    console.error("Register route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- VERIFY OTP (Step 2: Save User if Valid) ----------------
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = otpStore[email];

    if (!record) {
      return res.status(400).json({ error: 'No OTP request found. Please register again.' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP expired. Please try again.' });
    }

    if (record.otp !== otp) {
      record.attempts++;
      if (record.attempts >= 3) {
        delete otpStore[email];
        return res.status(400).json({ error: 'Too many failed attempts. Please register again.' });
      }
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP valid → Save to DB
    try {
      const hashedPassword = await bcrypt.hash(record.password, 10);

      safeQuery(
        'INSERT INTO users (name, phnum, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [record.name, record.phnum, record.email, hashedPassword, record.role],
        (err, result) => {
          if (err) {
            console.error("Insert user error:", err.message);
            return res.status(500).json({ error: 'Failed to create user account' });
          }

          delete otpStore[email]; // cleanup
          res.json({ message: 'Registration successful' });
        }
      );
    } catch (hashError) {
      console.error("Password hash error:", hashError.message);
      res.status(500).json({ error: 'Failed to process registration' });
    }
  } catch (error) {
    console.error("Verify OTP route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- RESEND OTP (within 5 minutes max) ----------------
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const record = otpStore[email];

    if (!record) {
      return res.status(400).json({ error: 'No registration in progress.' });
    }

    if (Date.now() - record.createdAt > 5 * 60 * 1000) {
      delete otpStore[email];
      return res.status(400).json({ error: 'Registration time window expired. Please register again.' });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait before trying again.' });
    }

    // New OTP
    const otp = generateOtp();
    record.otp = otp;
    record.expiresAt = Date.now() + 2 * 60 * 1000;

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(500).json({ error: 'Email service not available' });
    }

    const imagePath = getImagePath();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Soukhya Registration OTP (Resent)',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
          <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
            ${imagePath ? `<img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />` : ''}
            <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
            <p style="font-size: 16px; color: #333;">
              Your New <strong>One-Time Password (OTP)</strong> for registration is:
            </p>
            <h1 style="letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
            <p style="color: #666; font-size: 14px;">
              This OTP is valid for <strong>2 minutes</strong>. Please do not share it with anyone.
            </p>
            <hr style="margin: 20px 0;"/>
            <p style="font-size: 12px; color: #999;">
              &copy; 2025 Soukhya Health. All rights reserved.
            </p>
          </div>
        </div>
      `,
      attachments: imagePath ? [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }] : []
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Resend OTP error:", err.message);
        return res.status(500).json({ error: 'Failed to resend OTP' });
      }

      res.json({ message: 'New OTP sent. Please verify within 2 minutes.' });
    });
  } catch (error) {
    console.error("Resend OTP route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- FORGOT PASSWORD (Step 1: Send OTP) ----------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait before trying again.' });
    }

    // Check if user exists
    safeQuery('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error("Check user exists error:", err.message);
        return res.status(500).json({ error: 'Failed to check user existence' });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

      otpStore[email] = {
        otp,
        expiresAt,
        createdAt: Date.now(),
        verified: false
      };

      const transporter = createTransporter();
      if (!transporter) {
        return res.status(500).json({ error: 'Email service not available' });
      }

      const imagePath = getImagePath();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Soukhya Forgot Password OTP',
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
            <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
              ${imagePath ? `<img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />` : ''}
              <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
              <p style="font-size: 16px; color: #333;">
                Your <strong>Forgot One-Time Password (OTP)</strong> for Change password is:
              </p>
              <h1 style="letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
              <p style="color: #666; font-size: 14px;">
                This OTP is valid for <strong>2 minutes</strong>. Please do not share it with anyone.
              </p>
              <hr style="margin: 20px 0;"/>
              <p style="font-size: 12px; color: #999;">
                &copy; 2025 Soukhya Health. All rights reserved.
              </p>
            </div>
          </div>
        `,
        attachments: imagePath ? [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }] : []
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error("Send forgot password OTP error:", err.message);
          delete otpStore[email]; // Cleanup on failure
          return res.status(500).json({ error: 'Failed to send OTP' });
        }

        res.json({ message: 'OTP sent to email for password reset.' });
      });
    });
  } catch (error) {
    console.error("Forgot password route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- VERIFY FORGOT PASSWORD OTP (Step 2) ----------------
router.post('/verify-forgot-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = otpStore[email];

    if (!record) {
      return res.status(400).json({ error: 'No OTP request found. Please try again.' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP expired. Please request again.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // Mark OTP verified
    record.verified = true;
    res.json({ message: 'OTP verified. You can now reset your password.' });
  } catch (error) {
    console.error("Verify forgot password OTP route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- RESET PASSWORD (Step 3) ----------------
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const record = otpStore[email];

    if (!record || !record.verified) {
      return res.status(400).json({ error: 'OTP not verified. Cannot reset password.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      safeQuery('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err, result) => {
        if (err) {
          console.error("Update password error:", err.message);
          return res.status(500).json({ error: 'Failed to reset password' });
        }

        if (result.affectedRows === 0) {
          return res.status(400).json({ error: 'User not found' });
        }

        delete otpStore[email]; // cleanup
        res.json({ message: 'Password reset successful' });
      });
    } catch (hashError) {
      console.error("Password hash error:", hashError.message);
      res.status(500).json({ error: 'Failed to process password reset' });
    }
  } catch (error) {
    console.error("Reset password route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- RESEND OTP (Forgot Password) ----------------
router.post('/resend-forgot-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const record = otpStore[email];

    if (!record) {
      return res.status(400).json({ error: 'No forgot-password request found.' });
    }

    // Check if the OTP request is still valid (e.g., within 5 minutes)
    if (Date.now() - record.createdAt > 5 * 60 * 1000) {
      delete otpStore[email];
      return res.status(400).json({ error: 'Password reset request expired. Please try again.' });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait before trying again.' });
    }

    // Generate new OTP
    const otp = generateOtp();
    record.otp = otp;
    record.expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(500).json({ error: 'Email service not available' });
    }

    const imagePath = getImagePath();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Soukhya Forgot Password OTP (Resent)',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
          <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
            ${imagePath ? `<img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />` : ''}
            <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
            <p style="font-size: 16px; color: #333;">
              Your <strong>Forgot One-Time Password (OTP)</strong> for reset password is:
            </p>
            <h1 style="letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
            <p style="color: #666; font-size: 14px;">
              This OTP is valid for <strong>2 minutes</strong>. Please do not share it with anyone.
            </p>
            <hr style="margin: 20px 0;"/>
            <p style="font-size: 12px; color: #999;">
              &copy; 2025 Soukhya Health. All rights reserved.
            </p>
          </div>
        </div>
      `,
      attachments: imagePath ? [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }] : []
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Resend forgot password OTP error:", err.message);
        return res.status(500).json({ error: 'Failed to resend OTP' });
      }

      res.json({ message: 'New OTP sent successfully. Please verify within 2 minutes.' });
    });
  } catch (error) {
    console.error("Resend forgot password OTP route error:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Register router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
