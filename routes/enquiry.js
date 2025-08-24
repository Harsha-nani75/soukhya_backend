const express = require("express");
const router = express.Router();
const db = require("../config/db"); // your MySQL connection file
const { route } = require("./patient_update");
const { configDotenv } = require("dotenv");
const nodemailer = require('nodemailer');


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


// POST API to save enquiry
router.post("/enquiries", (req, res) => {
  const {
    name,
    email,
    phoneNo,
    address,
    message,
    serviceType,
    treatmentIssue
  } = req.body;

  // validate serviceType
  if (!["elder care", "medical tourism"].includes(serviceType)) {
    return res.status(400).json({ error: "Invalid service type" });
  }

  // validation for medical tourism
  if (serviceType === "medical tourism" && !treatmentIssue) {
    return res
      .status(400)
      .json({ error: "treatmentIssue is required for medical tourism" });
  }

  // validation for elder care
  if (serviceType === "elder care" && treatmentIssue) {
    return res
      .status(400)
      .json({ error: "treatmentIssue should be null for elder care" });
  }

  const sql = `
    INSERT INTO enquiries 
    (name, email, phoneNo, address, message, serviceType, treatmentIssue) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, email, phoneNo, address, message, serviceType, treatmentIssue || null],
    (err, result) => {
      if (err) {
        console.error("Insert error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }
      res.status(201).json({
        message: "Enquiry saved successfully",
        enquiryId: result.insertId
      });
    }
  );
});// POST /send-contact-email
router.post('/send-contact-email', async (req, res) => {
  const { fullName, phone, message } = req.body;

  if (!fullName || !phone || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // from .env
        pass: process.env.EMAIL_PASS, // from .env
      },
    });

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
    console.error("Email send error:", err);
    res.status(500).json({ error: "Failed to send email ❌" });
  }
});


module.exports = router;
