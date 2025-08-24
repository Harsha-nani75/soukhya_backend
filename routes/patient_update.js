const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Helper: format saved path (always relative, forward slashes)
// const formatPath = (filePath) => {
//   return "/" + filePath.replace(/\\/g, "/"); // ensures /uploads/... format
// };

// Multer storage config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let patientName = "unknown";
//     if (req.body.patient) {
//       try {
//         const patient = JSON.parse(req.body.patient);
//         patientName = patient.name.replace(/\s+/g, "_");
//       } catch (err) {
//         console.error("Patient parse error:", err);
//       }
//     }
//     let folder = "uploads/others";
//     if (file.fieldname === "photo") {
//       folder = `uploads/images/${patientName}`;
//     } else if (file.fieldname === "proofFile") {
//       folder = `uploads/files/${patientName}`;
//     } else if (file.fieldname === "policyFiles") {
//       folder = `uploads/insurance/${patientName}`;
//     }
//     fs.mkdirSync(folder, { recursive: true });
//     cb(null, folder);
//   },
//   filename: (req, file, cb) => {
//     let patientName = "unknown";
//     if (req.body.patient) {
//       try {
//         const patient = JSON.parse(req.body.patient);
//         patientName = patient.name.replace(/\s+/g, "_");
//       } catch (err) {
//         console.error("Patient parse error:", err);
//       }
//     }
//     const ext = path.extname(file.originalname);
//     cb(null, `${patientName}_${Date.now()}${ext}`);
//   }
// });
// const upload = multer({ storage });

// Multer storage config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let patientName = "unknown";
    
    // Get patient name from database for folder creation
    const patientId = req.params.id;
    db.query("SELECT name FROM patients WHERE id = ?", [patientId], (err, result) => {
      if (!err && result.length > 0) {
        patientName = result[0].name.replace(/\s+/g, "_");
      }
      
      let folder = `uploads/images/${patientName}`;
      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    });
  },
  filename: (req, file, cb) => {
    let patientName = "unknown";
    const patientId = req.params.id;
    
    db.query("SELECT name FROM patients WHERE id = ?", [patientId], (err, result) => {
      if (!err && result.length > 0) {
        patientName = result[0].name.replace(/\s+/g, "_");
      }
      const ext = path.extname(file.originalname);
      cb(null, `${patientName}_${Date.now()}${ext}`);
    });
  }
});

const upload = multer({ storage });

// ✅ Update photo for a patient
router.put("/photo/:id", upload.single('photo'), (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: "No photo file uploaded" });
  }

  const photoPath = req.file.path;

  // Update patient photo in database
  const sql = "UPDATE patients SET photo = ? WHERE id = ?";
  db.query(sql, [photoPath, id], (err, result) => {
    if (err) {
      console.error("Photo update error:", err);
      return res.status(500).json({ error: "Failed to update photo" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }
    
    res.json({ 
      message: "Photo updated successfully",
      photo: photoPath
    });
  });
});

// ✅ Update habits for a patient
router.put("/habits/:id", (req, res) => {
  const { id } = req.params;
  const { habits } = req.body;

  if (!habits) {
    return res.status(400).json({ error: "Habits data is required" });
  }

  // Normalize habits data
  let habitsArray = [];
  if (!Array.isArray(habits) && typeof habits === 'object') {
    // Convert object format to array format
    if (habits.tobacco) {
      habitsArray.push({ habit_code: "tobacco", answer: habits.tobacco, years: habits.tobaccoYears });
    }
    if (habits.smoking) {
      habitsArray.push({ habit_code: "smoking", answer: habits.smoking, years: habits.smokingYears });
    }
    if (habits.alcohol) {
      habitsArray.push({ habit_code: "alcohol", answer: habits.alcohol, years: habits.alcoholYears });
    }
    if (habits.drugs) {
      habitsArray.push({ habit_code: "drugs", answer: habits.drugs, years: habits.drugsYears });
    }
  } else if (Array.isArray(habits)) {
    habitsArray = habits;
  }

  // First, delete existing habits
  db.query("DELETE FROM habits WHERE patient_id = ?", [id], (err) => {
    if (err) {
      console.error("Delete habits error:", err);
      return res.status(500).json({ error: "Failed to delete existing habits" });
    }

    // If no new habits to add, return success
    if (habitsArray.length === 0) {
      return res.json({ message: "Habits updated successfully" });
    }

    // Insert new habits
    const insertPromises = habitsArray.map(habit => {
      return new Promise((resolve, reject) => {
        const sql = `
          INSERT INTO habits (patient_id, habit_code, answer, years)
          VALUES (?, ?, ?, ?)
        `;
        const values = [
          id,
          habit.habit_code || '',
          habit.answer || 'no',
          habit.years || null
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        res.json({ 
          message: "Habits updated successfully",
          habits: habitsArray
        });
      })
      .catch((error) => {
        console.error("Insert habits error:", error);
        res.status(500).json({ error: "Failed to insert new habits" });
      });
  });
});

// ✅ Update insurance details for a patient
router.put("/insurance/:id", (req, res) => {
  const { id } = req.params;
  const { insurance } = req.body;

  if (!insurance) {
    return res.status(400).json({ error: "Insurance data is required" });
  }

  // First, delete existing insurance details
  db.query("DELETE FROM insurance_details WHERE patient_id = ?", [id], (err) => {
    if (err) {
      console.error("Delete insurance error:", err);
      return res.status(500).json({ error: "Failed to delete existing insurance" });
    }

    // Insert new insurance details
    const sql = `
      INSERT INTO insurance_details
        (patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles,
         declinedCoverage, similarInsurances, package, packageDetail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      id,
      insurance.insuranceCompany || '',
      insurance.periodInsurance || '',
      insurance.sumInsured || null,
      insurance.policyFiles || '',
      insurance.declinedCoverage || '',
      insurance.similarInsurances || '',
      insurance.package || '',
      insurance.packageDetail || ''
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Insert insurance error:", err);
        return res.status(500).json({ error: "Failed to insert insurance details" });
      }

      const insuranceId = result.insertId;

      // Handle insurance hospitals if provided
      if (insurance.hospitals && Array.isArray(insurance.hospitals) && insurance.hospitals.length > 0) {
        const hospitalPromises = insurance.hospitals.map(hospital => {
          return new Promise((resolve, reject) => {
            const hospitalSql = `
              INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
              VALUES (?, ?, ?)
            `;
            const hospitalValues = [
              insuranceId,
              hospital.hospitalName || '',
              hospital.hospitalAddress || ''
            ];

            db.query(hospitalSql, hospitalValues, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
        });

        Promise.all(hospitalPromises)
          .then(() => {
            res.json({ 
              message: "Insurance details updated successfully",
              insurance: insurance,
              insuranceId: insuranceId
            });
          })
          .catch((error) => {
            console.error("Insert hospitals error:", error);
            res.status(500).json({ error: "Failed to insert insurance hospitals" });
          });
      } else {
        res.json({ 
          message: "Insurance details updated successfully",
          insurance: insurance,
          insuranceId: insuranceId
        });
      }
    });
  });
});

// ✅ Update questions for a patient
router.put("/questions/:id", (req, res) => {
  const { id } = req.params;
  const { questions } = req.body;

  if (!questions) {
    return res.status(400).json({ error: "Questions data is required" });
  }

  // Normalize questions data
  let questionsArray = [];
  if (!Array.isArray(questions) && typeof questions === 'object') {
    // Convert object format to array format
    questionsArray = Object.keys(questions).map(key => ({
      question_code: key,
      answer: questions[key].answer || 'no',
      details: questions[key].details || ''
    }));
  } else if (Array.isArray(questions)) {
    questionsArray = questions;
  }

  // First, delete existing questions
  db.query("DELETE FROM questions WHERE patient_id = ?", [id], (err) => {
    if (err) {
      console.error("Delete questions error:", err);
      return res.status(500).json({ error: "Failed to delete existing questions" });
    }

    // If no new questions to add, return success
    if (questionsArray.length === 0) {
      return res.json({ message: "Questions updated successfully" });
    }

    // Insert new questions
    const insertPromises = questionsArray.map(question => {
      return new Promise((resolve, reject) => {
        const sql = `
          INSERT INTO questions (patient_id, question_code, answer, details)
          VALUES (?, ?, ?, ?)
        `;
        const values = [
          id,
          question.question_code || '',
          question.answer || 'no',
          question.details || ''
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        res.json({ 
          message: "Questions updated successfully",
          questions: questionsArray
        });
      })
      .catch((error) => {
        console.error("Insert questions error:", error);
        res.status(500).json({ error: "Failed to insert new questions" });
      });
  });
});

// routes/patients.js

// ✅ Update caretakers for a patient
router.put("/caretakers/:id", (req, res) => {
  const { id } = req.params;
  const { caretakers } = req.body;

  if (!Array.isArray(caretakers)) {
    return res.status(400).json({ error: "Caretakers must be an array" });
  }

  // First, delete all existing caretakers for this patient
  db.query(`DELETE FROM caretakers WHERE patient_id = ?`, [id], (err) => {
    if (err) {
      console.error("Delete Error:", err);
      return res.status(500).json({ error: "Failed to delete existing caretakers" });
    }

    // If no new caretakers to add, return success
    if (caretakers.length === 0) {
      return res.json({ message: "Caretakers updated successfully" });
    }

    // Insert new caretakers
    const insertPromises = caretakers.map(caretaker => {
      return new Promise((resolve, reject) => {
        const sql = `
          INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
          id,
          caretaker.name || '',
          caretaker.relation || '',
          caretaker.phone || '',
          caretaker.email || '',
          caretaker.address || ''
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        res.json({ 
          message: "Caretakers updated successfully",
          caretakers: caretakers
        });
      })
      .catch((error) => {
        console.error("Insert Error:", error);
        res.status(500).json({ error: "Failed to insert new caretakers" });
      });
  });
});

// ✅ Update patient by ID
router.put("/patient/:id", (req, res) => {
  const { id } = req.params;

  // exclude photo & proofFile
  const {
    name,
    lname,
    sname,
    abb,
    abbname,
    gender,
    dob,
    age,
    ocupation,
    phone,
    email,
    rstatus,
    raddress,
    rcity,
    rstate,
    rzipcode,
    paddress,
    pcity,
    pstate,
    pzipcode,
    idnum,
    addressTextProof
  } = req.body;

  const sql = `
    UPDATE patients SET
      name = ?, lname = ?, sname = ?, abb = ?, abbname = ?,
      gender = ?, dob = ?, age = ?, ocupation = ?, phone = ?, email = ?,
      rstatus = ?, raddress = ?, rcity = ?, rstate = ?, rzipcode = ?,
      paddress = ?, pcity = ?, pstate = ?, pzipcode = ?,
      idnum = ?, addressTextProof = ?
    WHERE id = ?
  `;

  const values = [
    name, lname, sname, abb, abbname,
    gender, dob, age, ocupation, phone, email,
    rstatus, raddress, rcity, rstate, rzipcode,
    paddress, pcity, pstate, pzipcode,
    idnum, addressTextProof,
    id
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Update Error:", err);
      return res.status(500).json({ error: "Database update failed" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json({ message: "Patient updated successfully" });
  });
});

module.exports = router;
