const express = require("express");
const router = express.Router();
const db = require("../config/db");
const nodemailer = require('nodemailer');
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

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
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
        pass: process.env.EMAIL_PASS,
      },
    });
  } catch (error) {
    console.error("Email transporter error:", error.message);
    return null;
  }
};

// GET all enquiries
router.get("/", (req, res) => {
  try {
    const sql = `SELECT 
      id,
      name,
      email,
      phoneNo,
      address,
      message,
      serviceType,
      treatmentIssue,
      createdDate AS created_date,
      resolved,
      resolvedDate AS resolved_date
    FROM enquiries
    ORDER BY createdDate DESC
    LIMIT 0, 25`;

    safeQuery(sql, [], (err, results) => {
      if (err) {
        console.error("Get enquiries error:", err.message);
        return res.status(500).json({ error: "Failed to fetch enquiries" });
      }
      res.json(results || []);
    });
  } catch (error) {
    console.error("Get enquiries route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST API to save enquiry
router.post("/enquiries", (req, res) => {
  try {
    const {
      name,
      email,
      phoneNo,
      address,
      message,
      serviceType,
      treatmentIssue
    } = req.body;

    // Input validation
    if (!name || !email || !phoneNo || !message || !serviceType) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validatePhone(phoneNo)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Validate serviceType
    if (!["elder care", "medical tourism"].includes(serviceType)) {
      return res.status(400).json({ error: "Invalid service type. Must be 'elder care' or 'medical tourism'" });
    }

    // Validation for medical tourism
    if (serviceType === "medical tourism" && !treatmentIssue) {
      return res.status(400).json({ error: "Treatment issue is required for medical tourism" });
    }

    // Validation for elder care
    if (serviceType === "elder care" && treatmentIssue) {
      return res.status(400).json({ error: "Treatment issue should not be provided for elder care" });
    }

    const sql = `
      INSERT INTO enquiries 
      (name, email, phoneNo, address, message, serviceType, treatmentIssue) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    safeQuery(
      sql,
      [name, email, phoneNo, address, message, serviceType, treatmentIssue || null],
      (err, result) => {
        if (err) {
          console.error("Insert enquiry error:", err.message);
          return res.status(500).json({ error: "Failed to save enquiry" });
        }
        
        res.status(201).json({
          message: "Enquiry saved successfully",
          enquiryId: result.insertId
        });
      }
    );
  } catch (error) {
    console.error("Save enquiry route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /send-contact-email
router.post('/send-contact-email', async (req, res) => {
  try {
    const { fullName, phone, message } = req.body;

    // Input validation
    if (!fullName || !phone || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters long' });
    }

    // Create email transporter
    const transporter = createTransporter();
    if (!transporter) {
      return res.status(500).json({ error: 'Email service not available' });
    }

    // Styled email template
    const mailOptions = {
      from: `"Contact Form" <${process.env.EMAIL_USER}>`,
      to: "harsha7595@gmail.com",
      subject: "📩 New Contact Us Message",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; 
                    border: 1px solid #ddd; border-radius: 10px; background: #f9f9f9;">
          <h2 style="color: #2c3e50; text-align: center;">New Contact Request</h2>
          
          <p style="font-size: 15px; color: #333;">
            You have received a new message from your <strong>Contact Us</strong> form:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
            </tr>
          </table>

          <p style="margin-top: 20px; text-align: center; color: #777; font-size: 13px;">
            📧 This message was sent from your website contact form.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Email sent successfully ✅" });
  } catch (err) {
    console.error("Email send error:", err.message);
    res.status(500).json({ error: "Failed to send email ❌" });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Enquiry router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
