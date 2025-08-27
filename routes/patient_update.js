const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Enhanced multer storage config with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      let patientName = "unknown";
      const patientId = req.params.id;
      
      // Get patient name from database for folder creation
      db.query("SELECT name FROM patients WHERE id = ?", [patientId], (err, result) => {
        if (!err && result && result.length > 0) {
          patientName = result[0].name.replace(/\s+/g, "_");
        }
        
        let folder = "uploads/others";
        
        // Determine folder based on file type
        if (file.fieldname === "photo") {
          folder = `uploads/images/${patientName}`;
        } else if (file.fieldname === "policyFile") {
          folder = `uploads/insurance/${patientName}`;
        } else if (file.fieldname === "proofFile") {
          folder = `uploads/files/${patientName}`;
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
        
        cb(null, folder);
      });
    } catch (error) {
      console.error("Error in multer destination:", error.message);
      // Fallback to default folder
      const fallbackFolder = "uploads/others";
      if (!fs.existsSync(fallbackFolder)) {
        fs.mkdirSync(fallbackFolder, { recursive: true });
      }
      cb(null, fallbackFolder);
    }
  },
  filename: (req, file, cb) => {
    try {
      let patientName = "unknown";
      const patientId = req.params.id;
      
      db.query("SELECT name FROM patients WHERE id = ?", [patientId], (err, result) => {
        if (!err && result && result.length > 0) {
          patientName = result[0].name.replace(/\s+/g, "_");
        }
        const ext = path.extname(file.originalname);
        const filename = `${patientName}_${Date.now()}${ext}`;
        cb(null, filename);
      });
    } catch (error) {
      console.error("Error in multer filename:", error.message);
      // Fallback filename
      const ext = path.extname(file.originalname);
      const fallbackFilename = `unknown_${Date.now()}${ext}`;
      cb(null, fallbackFilename);
    }
  }
});

// Enhanced multer configuration with error handling
const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedTypes = {
      photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      policyFile: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      proofFile: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    };
    
    const fieldType = file.fieldname;
    if (allowedTypes[fieldType] && allowedTypes[fieldType].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${fieldType}. Allowed types: ${allowedTypes[fieldType].join(', ')}`));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: "Too many files. Only one file allowed." });
    }
    return res.status(400).json({ error: `File upload error: ${error.message}` });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error("Multer error:", error.message);
  return res.status(500).json({ error: "File upload failed" });
};

// Helper function for safe database operations (callback style)
const safeQuery = (query, params = [], callback) => {
  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Database query error:", err.message);
      callback(new Error(`Database operation failed: ${err.message}`));
    } else {
      callback(null, result);
    }
  });
};

// Helper function for input validation
const validatePatientId = (id) => {
  const patientId = parseInt(id);
  if (isNaN(patientId) || patientId <= 0) {
    throw new Error("Invalid patient ID");
  }
  return patientId;
};

// ✅ Update habits for a patient
router.put("/habits/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const habits = req.body;

    if (!Array.isArray(habits)) {
      return res.status(400).json({ error: "Habits must be an array" });
    }

    // Validate habits data
    for (const habit of habits) {
      if (!habit.habit_code || !habit.answer) {
        return res.status(400).json({ error: "Each habit must have habit_code and answer" });
      }
    }

    // Delete existing habits
    safeQuery("DELETE FROM habits WHERE patient_id = ?", [id], (err) => {
      if (err) {
        console.error("Delete habits error:", err.message);
        return res.status(500).json({ error: "Failed to delete existing habits" });
      }

      // If no new habits to add, return success
      if (habits.length === 0) {
        return res.json({ message: "Habits updated successfully" });
      }

      // Insert new habits
      let completed = 0;
      let hasError = false;

      habits.forEach(habit => {
        safeQuery(
          "INSERT INTO habits (patient_id, habit_code, answer, years) VALUES (?, ?, ?, ?)",
          [id, habit.habit_code, habit.answer, habit.years || null],
          (err) => {
            if (err) {
              console.error("Insert habit error:", err.message);
              hasError = true;
            }
            
            completed++;
            
            if (completed === habits.length) {
              if (hasError) {
                return res.status(500).json({ error: "Failed to insert some habits" });
              }
              
              res.json({ 
                message: "Habits updated successfully",
                habits: habits
              });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error("Update habits error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update habits" });
  }
});

// ✅ Update questions for a patient
router.put("/questions/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const questions = req.body;

    if (!questions || typeof questions !== 'object') {
      return res.status(400).json({ error: "Questions data is required and must be an object" });
    }

    // Validate questions data
    for (const [key, question] of Object.entries(questions)) {
      if (!question.answer) {
        return res.status(400).json({ error: `Question ${key} must have an answer` });
      }
    }

    // Convert object format to array format
    const questionsArray = Object.keys(questions).map(key => ({
      question_code: key,
      answer: questions[key].answer,
      details: questions[key].details || ''
    }));

    // Delete existing questions
    safeQuery("DELETE FROM questions WHERE patient_id = ?", [id], (err) => {
      if (err) {
        console.error("Delete questions error:", err.message);
        return res.status(500).json({ error: "Failed to delete existing questions" });
      }

      // If no new questions to add, return success
      if (questionsArray.length === 0) {
        return res.json({ message: "Questions updated successfully" });
      }

      // Insert new questions
      let completed = 0;
      let hasError = false;

      questionsArray.forEach(question => {
        safeQuery(
          "INSERT INTO questions (patient_id, question_code, answer, details) VALUES (?, ?, ?, ?)",
          [id, question.question_code, question.answer, question.details],
          (err) => {
            if (err) {
              console.error("Insert question error:", err.message);
              hasError = true;
            }
            
            completed++;
            
            if (completed === questionsArray.length) {
              if (hasError) {
                return res.status(500).json({ error: "Failed to insert some questions" });
              }
              
              res.json({ 
                message: "Questions updated successfully",
                questions: questions
              });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error("Update questions error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update questions" });
  }
});

// ✅ Update insurance details for a patient
router.put("/insurance/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const insuranceData = req.body;

    if (!insuranceData || typeof insuranceData !== 'object') {
      return res.status(400).json({ error: "Insurance data is required" });
    }

    // Delete existing insurance details
    safeQuery("DELETE FROM insurance_details WHERE patient_id = ?", [id], (err) => {
      if (err) {
        console.error("Delete insurance error:", err.message);
        return res.status(500).json({ error: "Failed to delete existing insurance" });
      }

      // Insert new insurance details
      safeQuery(
        `INSERT INTO insurance_details
          (patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles,
           declinedCoverage, similarInsurances, package, packageDetail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          insuranceData.insuranceCompany || '',
          insuranceData.periodInsurance || '',
          insuranceData.sumInsured || null,
          insuranceData.policyFiles || '',
          insuranceData.declinedCoverage || '',
          insuranceData.similarInsurances || '',
          insuranceData.package || '',
          insuranceData.packageDetail || ''
        ],
        (err, result) => {
          if (err) {
            console.error("Insert insurance error:", err.message);
            return res.status(500).json({ error: "Failed to insert insurance details" });
          }

          const insuranceId = result.insertId;

          // Handle insurance hospitals if provided
          if (insuranceData.hospitals && Array.isArray(insuranceData.hospitals) && insuranceData.hospitals.length > 0) {
            let hospitalCompleted = 0;
            let hospitalError = false;

            insuranceData.hospitals.forEach(hospital => {
              safeQuery(
                "INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress) VALUES (?, ?, ?)",
                [insuranceId, hospital.hospitalName || '', hospital.hospitalAddress || ''],
                (err) => {
                  if (err) {
                    console.error("Insert hospital error:", err.message);
                    hospitalError = true;
                  }
                  
                  hospitalCompleted++;
                  
                  if (hospitalCompleted === insuranceData.hospitals.length) {
                    if (hospitalError) {
                      return res.status(500).json({ error: "Failed to insert some hospitals" });
                    }
                    
                    res.json({ 
                      message: "Insurance details updated successfully",
                      insurance: insuranceData,
                      insuranceId: insuranceId
                    });
                  }
                }
              );
            });
          } else {
            res.json({ 
              message: "Insurance details updated successfully",
              insurance: insuranceData,
              insuranceId: insuranceId
            });
          }
        }
      );
    });
  } catch (error) {
    console.error("Update insurance error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update insurance details" });
  }
});

// ✅ Update caretakers for a patient
router.put("/caretakers/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const { caretakers } = req.body;

    if (!Array.isArray(caretakers)) {
      return res.status(400).json({ error: "Caretakers must be an array" });
    }

    // Validate caretakers data
    for (const caretaker of caretakers) {
      if (!caretaker.name || !caretaker.relation) {
        return res.status(400).json({ error: "Each caretaker must have name and relation" });
      }
    }

    // Delete existing caretakers
    safeQuery("DELETE FROM caretakers WHERE patient_id = ?", [id], (err) => {
      if (err) {
        console.error("Delete caretakers error:", err.message);
        return res.status(500).json({ error: "Failed to delete existing caretakers" });
      }

      // If no new caretakers to add, return success
      if (caretakers.length === 0) {
        return res.json({ message: "Caretakers updated successfully" });
      }

      // Insert new caretakers
      let completed = 0;
      let hasError = false;

      caretakers.forEach(caretaker => {
        safeQuery(
          "INSERT INTO caretakers (patient_id, name, relation, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)",
          [
            id,
            caretaker.name,
            caretaker.relation,
            caretaker.phone || '',
            caretaker.email || '',
            caretaker.address || ''
          ],
          (err) => {
            if (err) {
              console.error("Insert caretaker error:", err.message);
              hasError = true;
            }
            
            completed++;
            
            if (completed === caretakers.length) {
              if (hasError) {
                return res.status(500).json({ error: "Failed to insert some caretakers" });
              }
              
              res.json({ 
                message: "Caretakers updated successfully",
                caretakers: caretakers
              });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error("Update caretakers error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update caretakers" });
  }
});

// ✅ Update photo for a patient
router.put("/photo/:id", upload.single('photo'), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ error: "No photo file uploaded" });
    }

    const photoPath = req.file.path;

    // Update patient photo in database
    safeQuery("UPDATE patients SET photo = ? WHERE id = ?", [photoPath, id], (err, result) => {
      if (err) {
        console.error("Update photo error:", err.message);
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
  } catch (error) {
    console.error("Update photo error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update photo" });
  }
});

// ✅ File Management APIs for policy and proof files

// Upload policy file
router.post("/policy-file/:id", upload.single('policyFile'), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ error: "No policy file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Store file information in database
    safeQuery(
      "INSERT INTO policy_files (patient_id, file_path, file_name, uploaded_at) VALUES (?, ?, ?, NOW())",
      [id, filePath, fileName],
      (err, result) => {
        if (err) {
          console.error("Upload policy file error:", err.message);
          return res.status(500).json({ error: "Failed to upload policy file" });
        }
        
        res.json({ 
          message: "Policy file uploaded successfully",
          file: {
            id: result.insertId,
            path: filePath,
            name: fileName
          }
        });
      }
    );
  } catch (error) {
    console.error("Upload policy file error:", error.message);
    res.status(500).json({ error: error.message || "Failed to upload policy file" });
  }
});

// Delete policy file
router.delete("/policy-file/:fileId", (req, res) => {
  try {
    const fileId = validatePatientId(req.params.fileId);

    // Get file path before deletion
    safeQuery("SELECT file_path FROM policy_files WHERE id = ?", [fileId], (err, result) => {
      if (err) {
        console.error("Get policy file error:", err.message);
        return res.status(500).json({ error: "Failed to get policy file information" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Policy file not found" });
      }

      const filePath = result[0].file_path;

      // Delete from database
      safeQuery("DELETE FROM policy_files WHERE id = ?", [fileId], (err) => {
        if (err) {
          console.error("Delete policy file error:", err.message);
          return res.status(500).json({ error: "Failed to delete policy file" });
        }

        // Delete physical file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error("Error deleting physical file:", fileError.message);
          // Continue even if physical file deletion fails
        }

        res.json({ message: "Policy file deleted successfully" });
      });
    });
  } catch (error) {
    console.error("Delete policy file error:", error.message);
    res.status(500).json({ error: error.message || "Failed to delete policy file" });
  }
});

// Upload proof file
router.post("/proof-file/:id", upload.single('proofFile'), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ error: "No proof file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Store file information in database
    safeQuery(
      "INSERT INTO proof_files (patient_id, file_path, file_name, uploaded_at) VALUES (?, ?, ?, NOW())",
      [id, filePath, fileName],
      (err, result) => {
        if (err) {
          console.error("Upload proof file error:", err.message);
          return res.status(500).json({ error: "Failed to upload proof file" });
        }
        
        res.json({ 
          message: "Proof file uploaded successfully",
          file: {
            id: result.insertId,
            path: filePath,
            name: fileName
          }
        });
      }
    );
  } catch (error) {
    console.error("Upload proof file error:", error.message);
    res.status(500).json({ error: error.message || "Failed to upload proof file" });
  }
});

// Delete proof file
router.delete("/proof-file/:fileId", (req, res) => {
  try {
    const fileId = validatePatientId(req.params.fileId);

    // Get file path before deletion
    safeQuery("SELECT file_path FROM proof_files WHERE id = ?", [fileId], (err, result) => {
      if (err) {
        console.error("Get proof file error:", err.message);
        return res.status(500).json({ error: "Failed to get proof file information" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Proof file not found" });
      }

      const filePath = result[0].file_path;

      // Delete from database
      safeQuery("DELETE FROM proof_files WHERE id = ?", [fileId], (err) => {
        if (err) {
          console.error("Delete proof file error:", err.message);
          return res.status(500).json({ error: "Failed to delete proof file" });
        }

        // Delete physical file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error("Error deleting physical file:", fileError.message);
          // Continue even if physical file deletion fails
        }

        res.json({ message: "Proof file deleted successfully" });
      });
    });
  } catch (error) {
    console.error("Delete proof file error:", error.message);
    res.status(500).json({ error: error.message || "Failed to delete proof file" });
  }
});

// Get all files for a patient
router.get("/files/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);

    // Get policy files and proof files
    safeQuery("SELECT * FROM policy_files WHERE patient_id = ?", [id], (err, policyFiles) => {
      if (err) {
        console.error("Get policy files error:", err.message);
        return res.status(500).json({ error: "Failed to get policy files" });
      }

      safeQuery("SELECT * FROM proof_files WHERE patient_id = ?", [id], (err, proofFiles) => {
        if (err) {
          console.error("Get proof files error:", err.message);
          return res.status(500).json({ error: "Failed to get proof files" });
        }

        res.json({
          policyFiles: policyFiles,
          proofFiles: proofFiles
        });
      });
    });
  } catch (error) {
    console.error("Get files error:", error.message);
    res.status(500).json({ error: error.message || "Failed to get files" });
  }
});

// ✅ Update patient by ID
router.put("/patient/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);

    // Extract and validate patient data
    const {
      name, lname, sname, abb, abbname, gender, dob, age, ocupation,
      phone, email, rstatus, raddress, rcity, rstate, rzipcode,
      paddress, pcity, pstate, pzipcode, idnum, addressTextProof
    } = req.body;

    // Basic validation
    if (!name || !lname) {
      return res.status(400).json({ error: "Name and last name are required" });
    }

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

    safeQuery(sql, values, (err, result) => {
      if (err) {
        console.error("Update patient error:", err.message);
        return res.status(500).json({ error: "Failed to update patient" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json({ message: "Patient updated successfully" });
    });
  } catch (error) {
    console.error("Update patient error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update patient" });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
