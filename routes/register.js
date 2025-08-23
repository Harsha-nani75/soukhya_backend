const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../config/db'); // adjust your db connection
require('dotenv').config();
const path=require('path')
const fs = require('fs');
let otpStore = {}; // temporary store { email: { otp, expiresAt, attempts } }

//imageconvering for mail attachment
const imagePath = path.join(__dirname, "../assets/logo.png");
// const imageData = fs.readFileSync(imagePath).toString("base64");
// const logoBase64 = `data:image/png;base64,${imageData}`;


// // Now you can use it safely
// fs.readFile(imagePath, (err, data) => {
//   if (err) {
//     console.error("Error reading image:", err);
//   } else {
//     console.log("Image loaded successfully!");
//   }
// });
// Setup mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // keep in .env
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------- REGISTER (Step 1: Send OTP) ----------------
router.post('/register', async (req, res) => {
  const { name, phnum, email, password,role } = req.body;

  // 1. Generate OTP
  const otp = generateOtp();
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes validity

  otpStore[email] = {
    name,
    phnum,
    email,
    password,
    otp,
    role,
    expiresAt,
    createdAt: Date.now(),
    attempts: 0
  };

  // 2. Send OTP to mail
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
  to: email,
  subject: 'Soukhya Registration OTP',
  html: `
  <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
    <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
      <img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />
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
 attachments: [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }]
    });

    res.json({ message: 'OTP sent to email. Please verify within 2 minutes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ---------------- VERIFY OTP (Step 2: Save User if Valid) ----------------
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No OTP request found. Please register again.' });

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ error: 'OTP expired. Please try again.' });
  }

  if (record.otp !== otp) {
    record.attempts++;
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  // OTP valid → Save to DB
  try {
    const hashedPassword = await bcrypt.hash(record.password, 10);

    db.query(
      'INSERT INTO users (name, phnum, email, password, role) VALUES (?, ?,?, ?, ?)',
      [record.name, record.phnum, record.email, hashedPassword,'customer'],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        delete otpStore[email]; // cleanup
        res.json({ message: 'Registration successful' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ---------------- RESEND OTP (within 5 minutes max) ----------------
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No registration in progress.' });

  if (Date.now() - record.createdAt > 5 * 60 * 1000) {
    delete otpStore[email];
    return res.status(400).json({ error: 'Registration time window expired. Please register again.' });
  }

  // New OTP
  const otp = generateOtp();
  record.otp = otp;
  record.expiresAt = Date.now() + 2 * 60 * 1000;

try {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Soukhya Registration OTP (Resent)',
    html: `
  <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
    <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
      <img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />
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
 attachments: [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }]
    });

    res.json({ message: 'New OTP sent. Please verify within 2 minutes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});



// ---------------- FORGOT PASSWORD (Step 1: Send OTP) ----------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  // Check if user exists
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(400).json({ error: 'User not found' });

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

    otpStore[email] = {
      otp,
      expiresAt,
      createdAt: Date.now(),
      verified: false
    };

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Soukhya Forgot Password OTP',
        html: `
  <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
    <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
      <img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />
      <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
      <p style="font-size: 16px; color: #333;">
        Your <strong> Forgot One-Time Password (OTP)</strong> for Change password is:
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
 attachments: [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }]
    });

      res.json({ message: 'OTP sent to email for password reset.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });
});

// ---------------- VERIFY FORGOT PASSWORD OTP (Step 2) ----------------
router.post('/verify-forgot-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No OTP request found. Please try again.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ error: 'OTP expired. Please request again.' });
  }
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

  // Mark OTP verified
  record.verified = true;
  res.json({ message: 'OTP verified. You can now reset your password.' });
});

// ---------------- RESET PASSWORD (Step 3) ----------------
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const record = otpStore[email];

  if (!record || !record.verified) return res.status(400).json({ error: 'OTP not verified. Cannot reset password.' });

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err, result) => {
      if (err) return res.status(500).json({ error: err });

      delete otpStore[email]; // cleanup
      res.json({ message: 'Password reset successful' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ---------------- RESEND OTP (Forgot Password) ----------------
router.post('/resend-forgot-otp', async (req, res) => {
  const { email } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No forgot-password request found.' });

  // Check if the OTP request is still valid (e.g., within 5 minutes)
  if (Date.now() - record.createdAt > 5 * 60 * 1000) {
    delete otpStore[email];
    return res.status(400).json({ error: 'Password reset request expired. Please try again.' });
  }

  // Generate new OTP
  const otp = generateOtp();
  record.otp = otp;
  record.expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Soukhya Forgot Password OTP (Resent)',
      html: `
  <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; text-align: center;">
    <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
      <img src="cid:sokhya_logo" alt="Soukhya Logo" style="width: 200px; margin-bottom: 20px;" />
      <h2 style="color: #1a73e8;">Welcome to Soukhya Health</h2>
      <p style="font-size: 16px; color: #333;">
        Your <strong> Forgot One-Time Password (OTP)</strong> for reset password is:
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
 attachments: [{ filename: 'sokhya_logo.png', path: imagePath, cid: 'sokhya_logo' }]
    });

    res.json({ message: 'New OTP sent successfully. Please verify within 2 minutes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});


module.exports = router;
