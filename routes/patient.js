const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Enhanced multer storage with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      let patientName = "unknown";
      
      if (req.body.patient) {
        try {
          const patient = JSON.parse(req.body.patient);
          patientName = patient.name ? patient.name.replace(/\s+/g, "_") : "unknown";
        } catch (err) {
          console.error("Patient parse error:", err.message);
          patientName = "unknown";
        }
      }

      let folder = "uploads/others";
      if (file.fieldname === "photo") {
        folder = `uploads/images/${patientName}`;
      } else if (file.fieldname === "proofFile") {
        folder = `uploads/files/${patientName}`;
      } else if (file.fieldname === "policyFiles") {
        folder = `uploads/insurance/${patientName}`;
      }

      // Create folder if not exist
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      cb(null, folder);
    } catch (error) {
      console.error("Multer destination error:", error.message);
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
      if (req.body.patient) {
        try {
          const patient = JSON.parse(req.body.patient);
          patientName = patient.name ? patient.name.replace(/\s+/g, "_") : "unknown";
        } catch (err) {
          console.error("Patient parse error:", err.message);
          patientName = "unknown";
        }
      }
      const ext = path.extname(file.originalname);
      cb(null, `${patientName}_${Date.now()}${ext}`);
    } catch (error) {
      console.error("Multer filename error:", error.message);
      const ext = path.extname(file.originalname);
      cb(null, `unknown_${Date.now()}${ext}`);
    }
  }
});

// Simplified multer configuration - more permissive for policy files
const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Allow up to 10 files
  },
  fileFilter: (req, file, cb) => {
    console.log(`File upload attempt - Field: ${file.fieldname}, MimeType: ${file.mimetype}, OriginalName: ${file.originalname}`);
    
    // Validate file types
    const allowedTypes = {
      photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      proofFile: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      policyFiles: [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream', // Accept unknown types for policy files
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/rtf'
      ]
    };
    
    const fieldType = file.fieldname;
    
    // Check if the field type is allowed
    if (!allowedTypes[fieldType]) {
      console.log(`Field type '${fieldType}' not found in allowed types:`, Object.keys(allowedTypes));
      return cb(new Error(`Field type '${fieldType}' is not allowed. Allowed fields: ${Object.keys(allowedTypes).join(', ')}`));
    }
    
    // For policy files, be more permissive
    if (fieldType === 'policyFiles') {
      // Accept any file for policy files
      console.log(`Policy file accepted - Field: ${fieldType}, Type: ${file.mimetype}`);
      cb(null, true);
      return;
    }
    
    // For photo and proofFile, check file extension if mimetype is application/octet-stream
    if (file.mimetype === 'application/octet-stream' && (fieldType === 'photo' || fieldType === 'proofFile')) {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (allowedExtensions.includes(ext)) {
        console.log(`File accepted by extension - Field: ${fieldType}, Extension: ${ext}, Type: ${file.mimetype}`);
        cb(null, true);
        return;
      }
    }
    
    // Check if the file type is allowed for this field
    if (allowedTypes[fieldType].includes(file.mimetype)) {
      console.log(`File accepted - Field: ${fieldType}, Type: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.log(`File rejected - Field: ${fieldType}, Type: ${file.mimetype}, Allowed:`, allowedTypes[fieldType]);
      cb(new Error(`Invalid file type for ${fieldType}. Allowed types: ${allowedTypes[fieldType].join(', ')}`));
    }
  }
});

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
const validatePatientId = (id) => {
  const patientId = parseInt(id);
  if (isNaN(patientId) || patientId <= 0) {
    throw new Error("Invalid patient ID");
  }
  return patientId;
};

// -------------------- Routes --------------------

// ✅ Health Check
router.get("/health", (req, res) => {
  try {
    // Test database connection
    safeQuery("SELECT 1 as test", [], (err, result) => {
      if (err) {
        console.error("Health check failed:", err.message);
        return res.status(500).json({ 
          status: "unhealthy", 
          error: "Database connection failed",
          details: err.message
        });
      }
      res.json({ 
        status: "healthy", 
        database: "connected",
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error("Health check error:", error.message);
    res.status(500).json({ 
      status: "unhealthy", 
      error: "Health check failed",
      details: error.message
    });
  }
});

// ✅ Get All Patients
router.get("/", (req, res) => {
  try {
    const sql = "SELECT id,name,lname,phone,email,photo FROM patients";
    safeQuery(sql, [], (err, results) => {
      if (err) {
        console.error("Get patients error:", err.message);
        return res.status(500).json({ error: "Failed to fetch patients" });
      }
      res.json(results || []);
    });
  } catch (error) {
    console.error("Get patients route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get Single Patient (with joins)
router.get("/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    // First, get the basic patient information
    const patientSql = `SELECT 
      id AS patient_id, 
      name, lname, sname, abb, abbname, gender,
      dob, age, ocupation, phone, email, photo,
      rstatus, raddress, rcity, rstate, rzipcode,
      paddress, pcity, pstate, pzipcode,
      idnum, addressTextProof, proofFile,
      created_at, updated_at
    FROM patients WHERE id = ?`;
    
    safeQuery(patientSql, [id], (err, patientResult) => {
      if (err) {
        console.error("Get patient basic info error:", err.message);
        return res.status(500).json({ 
          error: "Failed to fetch patient basic information",
          details: err.message
        });
      }
      
      if (patientResult.length === 0) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const patient = patientResult[0];
      
      // Now get related data separately to avoid complex JOIN issues
      let completed = 0;
      let hasError = false;
      const result = { ...patient };
      
      const checkCompletion = () => {
        completed++;
        if (completed === 4) { // 4 related data queries
          if (hasError) {
            console.warn("Some related data failed to load for patient:", id);
          }
          res.json(result);
        }
      };
      
      // Initialize with empty arrays/null values
      result.caretakers = [];
      result.insurance = null;
      result.questions = [];
      result.habits = [];
      
      // Get caretakers
      safeQuery("SELECT name, relation, phone, email, address FROM caretakers WHERE patient_id = ?", [id], (err, caretakers) => {
        if (err) {
          console.error("Get caretakers error:", err.message);
          hasError = true;
          result.caretakers = [];
        } else {
          result.caretakers = caretakers || [];
        }
        checkCompletion();
      });
      
      // Get insurance details
      safeQuery("SELECT * FROM insurance_details WHERE patient_id = ?", [id], (err, insurance) => {
        if (err) {
          console.error("Get insurance error:", err.message);
          hasError = true;
          result.insurance = null;
        } else {
          result.insurance = insurance.length > 0 ? insurance[0] : null;
        }
        checkCompletion();
      });
      
      // Get questions
      safeQuery("SELECT * FROM questions WHERE patient_id = ?", [id], (err, questions) => {
        if (err) {
          console.error("Get questions error:", err.message);
          hasError = true;
          result.questions = [];
        } else {
          result.questions = questions || [];
        }
        checkCompletion();
      });
      
      // Get habits
      safeQuery("SELECT * FROM habits WHERE patient_id = ?", [id], (err, habits) => {
        if (err) {
          console.error("Get habits error:", err.message);
          hasError = true;
          result.habits = [];
        } else {
          result.habits = habits || [];
        }
        checkCompletion();
      });
    });
  } catch (error) {
    console.error("Get patient route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});
// GET /api/patients/:id/habits
router.get('/:id/habits', (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient ID' });

  const sql = 'SELECT habit_code, answer, years FROM habits WHERE patient_id = ?';
  safeQuery(sql, [patientId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch habits' });

    // Convert to object like { tobacco: 'yes', tobaccoYears: 8, ... }
    const habits = {};
    result.forEach(h => {
      habits[h.habit_code] = h.answer;
      habits[`${h.habit_code}Years`] = h.years;
    });

    res.json(habits);
  });
});


// GET /api/patients/:id/questions
router.get('/:id/questions', (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient ID' });

  const sql = 'SELECT question_code, answer, details FROM questions WHERE patient_id = ?';
  safeQuery(sql, [patientId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch questions' });

    const questions = {};
    result.forEach(q => {
      questions[q.question_code] = { answer: q.answer, details: q.details };
    });

    res.json(questions);
  });
});


// GET /api/patients/:id/insurance
router.get('/:id/insurance', (req, res) => {
  const patientId = Number(req.params.id);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient ID' });

  const sql = 'SELECT * FROM insurance_details WHERE patient_id = ?';
  safeQuery(sql, [patientId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch insurance' });

    const insurance = result[0] || null;
    if (!insurance) return res.json(null);

    // Fetch related hospitals
    const hospitalsSql = 'SELECT hospitalName, hospitalAddress FROM insurance_hospitals WHERE insurance_id = ?';
    safeQuery(hospitalsSql, [insurance.id], (err, hospitalsResult) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch hospitals' });

      insurance.hospitals = hospitalsResult || [];
      res.json(insurance);
    });
  });
});



// ✅ Create Genetic Care Patient (Main Route)
router.post("/genetic-care", upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "proofFile", maxCount: 5 },
  { name: "policyFiles", maxCount: 5 }
]), (req, res) => {
  console.log("=== GENETIC CARE PATIENT CREATION ===");
  console.log("Files received:", req.files);
  console.log("Body received:", req.body);
  
  try {
    // Validate required fields
    if (!req.body.patient) {
      return res.status(400).json({ error: "Patient data is required" });
    }

    // Parse safely
    let patient, caretakers, insurance, questions, habits, selectedDiseases;
    
    try {
      patient = JSON.parse(req.body.patient);
      // Fix: Handle both 'careTaker' and 'caretakers' field names
      caretakers = req.body.careTaker ? JSON.parse(req.body.careTaker) : 
                   req.body.caretakers ? JSON.parse(req.body.caretakers) : [];
      insurance = req.body.insurance ? JSON.parse(req.body.insurance) : null;
      questions = req.body.questions ? JSON.parse(req.body.questions) : {};
      habits = req.body.habits ? JSON.parse(req.body.habits) : {};
      selectedDiseases = req.body.selectedDiseases ? JSON.parse(req.body.selectedDiseases) : [];
      
      // Debug logging
      console.log("=== PARSED DATA ===");
      console.log("Patient:", patient);
      console.log("Caretakers (from careTaker):", caretakers);
      console.log("Insurance:", insurance);
      console.log("Questions:", questions);
      console.log("Habits:", habits);
      console.log("Selected Diseases:", selectedDiseases);
      console.log("Caretakers length:", caretakers.length);
      console.log("Selected Diseases length:", selectedDiseases.length);
      console.log("Raw body keys:", Object.keys(req.body));
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      return res.status(400).json({ error: "Invalid JSON format in request body" });
    }

    // Validate patient data
    if (!patient.name || !patient.lname) {
      return res.status(400).json({ error: "Patient name and last name are required" });
    }

    // Normalize to arrays
    if (!Array.isArray(caretakers)) caretakers = [];
    if (!Array.isArray(selectedDiseases)) selectedDiseases = [];
    
    // Convert questions object to array format
    let questionsArray = [];
    if (questions && typeof questions === 'object') {
      questionsArray = Object.keys(questions).map(key => ({
        question_code: key,
        answer: questions[key].answer,
        details: questions[key].details
      }));
    }
    
    // Convert habits object to array format
    let habitsArray = [];
    if (habits && typeof habits === 'object') {
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
        habitsArray.push({ habit_code: "drugs", answer: habits.drugs, years: habits.drugYears });
      }
    }

    // Handle file uploads
    let photoPath = null;
    let proofFilesPath = null;
    let policyFilesPath = null;

    if (req.files && req.files["photo"]) {
      photoPath = req.files["photo"][0].path;
    }
    if (req.files && req.files["proofFile"]) {
      proofFilesPath = req.files["proofFile"].map(f => f.path).join(",");
    }
    if (req.files && req.files["policyFiles"]) {
      policyFilesPath = req.files["policyFiles"].map(f => f.path).join(",");
    }

    // Insert Patient
    const sqlPatient = `
      INSERT INTO patients 
        (name, lname, sname, abb, abbname, gender, dob, age, ocupation, phone, email, photo,
         rstatus, raddress, rcity, rstate, rzipcode, paddress, pcity, pstate, pzipcode,
         idnum, addressTextProof, proofFile)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    safeQuery(sqlPatient, [
      patient.name, patient.lname, patient.sname, patient.abb, patient.abbname,
      patient.gender, patient.dob, patient.age, patient.ocupation, patient.phone,
      patient.email, photoPath, patient.rstatus, patient.raddress, patient.rcity,
      patient.rstate, patient.rzipcode, patient.paddress, patient.pcity, patient.pstate,
      patient.pzipcode, patient.idnum, patient.addressTextProof, proofFilesPath
    ], (err, patientResult) => {
      if (err) {
        console.error("Insert patient error:", err.message);
        return res.status(500).json({ error: "Failed to create patient" });
      }

      const patientId = patientResult.insertId;

      // Insert related data
      let completed = 0;
      let hasError = false;
      
      // Calculate total operations correctly
      let totalOperations = 0;
      if (caretakers.length > 0) totalOperations += caretakers.length;
      if (insurance) totalOperations += 1;
      if (questionsArray.length > 0) totalOperations += questionsArray.length;
      if (habitsArray.length > 0) totalOperations += habitsArray.length;
      if (selectedDiseases.length > 0) totalOperations += selectedDiseases.length;
      
      console.log(`Total operations to complete: ${totalOperations}`);

      if (totalOperations === 0) {
        return res.status(201).json({
          patient_id: patientId,
          message: "Patient created successfully",
        });
      }

      // Helper function to check completion
      const checkCompletion = () => {
        completed++;
        if (completed === totalOperations) {
          if (hasError) {
            return res.status(500).json({ error: "Patient created but some related data failed to save" });
          }
          res.status(201).json({
            patient_id: patientId,
            message: "Patient created successfully with all related data",
          });
        }
      };

      // Insert Caretakers
      console.log(`Inserting ${caretakers.length} caretakers for patient ${patientId}...`);
      if (caretakers.length === 0) {
        console.log("No caretakers to insert, skipping...");
        checkCompletion();
      } else {
        caretakers.forEach((c, index) => {
          console.log(`Inserting caretaker ${index + 1}:`, c);
          safeQuery(
            `INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
             VALUES (?,?,?,?,?,?)`,
            [patientId, c.name, c.relation, c.phone, c.email, c.address],
            (err) => {
              if (err) {
                console.error("Insert caretaker error:", err.message);
                hasError = true;
              } else {
                console.log(`Caretaker ${index + 1} inserted successfully`);
              }
              checkCompletion();
            }
          );
        });
      }

      // Insert Insurance
      if (insurance) {
        const sqlInsurance = `
          INSERT INTO insurance_details
            (patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles,
             declinedCoverage, similarInsurances, package, packageDetail)
          VALUES (?,?,?,?,?,?,?,?,?)
        `;
        
        safeQuery(sqlInsurance, [
          patientId, insurance.insuranceCompany, insurance.periodInsurance,
          insurance.sumInsured, policyFilesPath, insurance.declinedCoverage,
          insurance.similarInsurances, insurance.package, insurance.packageDetail
        ], (err, insResult) => {
          if (err) {
            console.error("Insert insurance error:", err.message);
            hasError = true;
            checkCompletion();
          } else {
            const insuranceId = insResult.insertId;

            // Insert Insurance Hospitals
            if (insurance.hospitals && insurance.hospitals.length > 0) {
              insurance.hospitals.forEach(h => {
                safeQuery(
                  `INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
                   VALUES (?,?,?)`,
                  [insuranceId, h.hospitalName, h.hospitalAddress],
                  (err) => {
                    if (err) {
                      console.error("Insert insurance hospital error:", err.message);
                      hasError = true;
                    }
                    checkCompletion();
                  }
                );
              });
            } else {
              checkCompletion();
            }
          }
        });
      } else {
        checkCompletion();
      }

      // Insert Questions
      questionsArray.forEach(q => {
        safeQuery(
          `INSERT INTO questions (patient_id, question_code, answer, details)
           VALUES (?,?,?,?)`,
          [patientId, q.question_code, q.answer, q.details],
          (err) => {
            if (err) {
              console.error("Insert question error:", err.message);
              hasError = true;
            }
            checkCompletion();
          }
        );
      });

      // Insert Habits
      habitsArray.forEach(h => {
        safeQuery(
          `INSERT INTO habits (patient_id, habit_code, answer, years)
           VALUES (?,?,?,?)`,
          [patientId, h.habit_code, h.answer, h.years],
          (err) => {
            if (err) {
              console.error("Insert habit error:", err.message);
              hasError = true;
            }
            checkCompletion();
          }
        );
      });

      // Insert Selected Diseases
      console.log(`Inserting ${selectedDiseases.length} selected diseases for patient ${patientId}...`);
      if (selectedDiseases.length === 0) {
        console.log("No selected diseases to insert, skipping...");
        checkCompletion();
      } else {
        selectedDiseases.forEach((disease, index) => {
          console.log(`Inserting disease ${index + 1}:`, disease);
          safeQuery(
            `INSERT INTO patient_diseases (patient_id, disease_id)
             VALUES (?,?)`,
            [patientId, disease.disease_id],
            (err) => {
              if (err) {
                console.error("Insert disease error:", err.message);
                hasError = true;
              } else {
                console.log(`Disease ${index + 1} inserted successfully`);
              }
              checkCompletion();
            }
          );
        });
      }
    });
  } catch (error) {
    console.error("Create genetic care patient route error:", error.message);
    res.status(500).json({ error: "Failed to create patient" });
  }
});
// ✅ Get Genetic Care Patient by ID
router.get("/genetic-care/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    // Get patient with all related data
    const patientSql = `SELECT 
      id AS patient_id, 
      name, lname, sname, abb, abbname, gender,
      dob, age, ocupation, phone, email, photo,
      rstatus, raddress, rcity, rstate, rzipcode,
      paddress, pcity, pstate, pzipcode,
      idnum, addressTextProof, proofFile,
      created_at, updated_at
    FROM patients WHERE id = ?`;
    
    safeQuery(patientSql, [id], (err, patientResult) => {
      if (err) {
        console.error("Get patient basic info error:", err.message);
        return res.status(500).json({ 
          error: "Failed to fetch patient basic information",
          details: err.message
        });
      }
      
      if (patientResult.length === 0) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const patient = patientResult[0];
      
      // Get all related data
      let completed = 0;
      let hasError = false;
      const result = { ...patient };
      
      const checkCompletion = () => {
        completed++;
        if (completed === 5) { // 5 related data queries (insurance hospitals is now nested)
          if (hasError) {
            console.warn("Some related data failed to load for patient:", id);
          }
          res.json(result);
        }
      };
      
      // Initialize with empty arrays/null values
      result.caretakers = [];
      result.insurance = null;
      result.questions = {};
      result.habits = {};
      result.selectedDiseases = [];
      
      // Get caretakers with debug logging
      console.log(`Fetching caretakers for patient ${id}...`);
      safeQuery("SELECT * FROM caretakers WHERE patient_id = ?", [id], (err, caretakers) => {
        if (err) {
          console.error("Get caretakers error:", err.message);
          hasError = true;
          result.caretakers = [];
        } else {
          console.log(`Found ${caretakers ? caretakers.length : 0} caretakers for patient ${id}:`, caretakers);
          result.caretakers = caretakers || [];
        }
        checkCompletion();
      });
      
      // Get insurance details
      console.log(`Fetching insurance details for patient ${id}...`);
      safeQuery("SELECT * FROM insurance_details WHERE patient_id = ?", [id], (err, insurance) => {
        if (err) {
          console.error("Get insurance error:", err.message);
          hasError = true;
          result.insurance = null;
          checkCompletion();
        } else {
          result.insurance = insurance.length > 0 ? insurance[0] : null;
          console.log(`Insurance details for patient ${id}:`, result.insurance);
          
          // If insurance exists, get hospitals for this insurance
          if (result.insurance) {
            console.log(`Fetching hospitals for insurance ID ${result.insurance.id}...`);
            safeQuery("SELECT hospitalName, hospitalAddress FROM insurance_hospitals WHERE insurance_id  = ?", [result.insurance.id], (err, hospitals) => {
              if (err) {
                console.error("Get hospitals error:", err.message);
                hasError = true;
                result.insurance.hospitals = [];
              } else {
                result.insurance.hospitals = hospitals || [];
                console.log(`Found ${hospitals ? hospitals.length : 0} hospitals for insurance ${result.insurance.id}:`, hospitals);
              }
              checkCompletion();
            });
          } else {
            // No insurance, so no hospitals
            console.log(`No insurance found for patient ${id}, skipping hospitals query`);
            checkCompletion();
          }
        }
      });
      
      // Get questions
      safeQuery("SELECT question_code, answer, details FROM questions WHERE patient_id = ?", [id], (err, questions) => {
        if (err) {
          console.error("Get questions error:", err.message);
          hasError = true;
          result.questions = {};
        } else {
          // Convert to object format
          result.questions = {};
          (questions || []).forEach(q => {
            result.questions[q.question_code] = {
              answer: q.answer,
              details: q.details
            };
          });
        }
        checkCompletion();
      });
      
      // Get habits
      safeQuery("SELECT habit_code, answer, years FROM habits WHERE patient_id = ?", [id], (err, habits) => {
        if (err) {
          console.error("Get habits error:", err.message);
          hasError = true;
          result.habits = {};
        } else {
          // Convert to object format
          result.habits = {};
          (habits || []).forEach(h => {
            if (h.habit_code === 'tobacco') {
              result.habits.tobacco = h.answer;
              result.habits.tobaccoYears = h.years;
            } else if (h.habit_code === 'smoking') {
              result.habits.smoking = h.answer;
              result.habits.smokingYears = h.years;
            } else if (h.habit_code === 'alcohol') {
              result.habits.alcohol = h.answer;
              result.habits.alcoholYears = h.years;
            } else if (h.habit_code === 'drugs') {
              result.habits.drugs = h.answer;
              result.habits.drugYears = h.years;
            }
          });
        }
        checkCompletion();
      });
      
      // Get selected diseases with debug logging
      console.log(`Fetching diseases for patient ${id}...`);
      safeQuery(`
        SELECT 
    pd.disease_id,
    d.code,
    d.name AS disease_name,
    c.category_id,
    c.name AS category_name,
    s.system_id,
    s.name AS system_name
FROM patient_diseases pd
JOIN diseases d ON pd.disease_id = d.disease_id
JOIN categories c ON d.category_id = c.category_id
JOIN systems s ON c.system_id = s.system_id
WHERE pd.patient_id = ?
      `, [id], (err, diseases) => {
        if (err) {
          console.error("Get diseases error:", err.message);
          hasError = true;
          result.selectedDiseases = [];
        } else {
          console.log(`Found ${diseases ? diseases.length : 0} diseases for patient ${id}:`, diseases);
          result.selectedDiseases = diseases || [];
        }
        checkCompletion();
      });
    });
  } catch (error) {
    console.error("Get genetic care patient route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ Debug route to check database tables and data
router.get("/debug/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    console.log(`=== DEBUG ROUTE FOR PATIENT ${id} ===`);
    
    // Check if tables exist
    const tables = ['patients', 'caretakers', 'insurance_details', 'insurance_hospitals', 'questions', 'habits', 'patient_diseases', 'diseases'];
    let completed = 0;
    let hasError = false;
    const debugInfo = {};
    
    const checkCompletion = () => {
      completed++;
      if (completed === tables.length) {
        if (hasError) {
          console.warn("Some debug queries failed");
        }
        res.json(debugInfo);
      }
    };
    
    tables.forEach(table => {
      // Check if table exists
      safeQuery(`SHOW TABLES LIKE '${table}'`, [], (err, result) => {
        if (err) {
          console.error(`Check table ${table} error:`, err.message);
          hasError = true;
          debugInfo[table] = { error: err.message, exists: false };
          checkCompletion();
        } else {
          const exists = result.length > 0;
          debugInfo[table] = { exists };
          
          if (exists) {
            // Get table structure
            safeQuery(`DESCRIBE ${table}`, [], (err, structure) => {
              if (err) {
                console.error(`Get structure for ${table} error:`, err.message);
                debugInfo[table].structure = { error: err.message };
              } else {
                debugInfo[table].structure = structure;
              }
              
              // Get sample data for this patient if applicable
              if (table === 'patients') {
                safeQuery(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, data) => {
                  if (err) {
                    debugInfo[table].data = { error: err.message };
                  } else {
                    debugInfo[table].data = data;
                  }
                  checkCompletion();
                });
              } else if (table === 'caretakers' || table === 'questions' || table === 'habits' || table === 'patient_diseases') {
                safeQuery(`SELECT * FROM ${table} WHERE patient_id = ?`, [id], (err, data) => {
                  if (err) {
                    debugInfo[table].data = { error: err.message };
                  } else {
                    debugInfo[table].data = data;
                  }
                  checkCompletion();
                });
              } else if (table === 'insurance_details') {
                safeQuery(`SELECT * FROM ${table} WHERE patient_id = ?`, [id], (err, data) => {
                  if (err) {
                    debugInfo[table].data = { error: err.message };
                  } else {
                    debugInfo[table].data = data;
                  }
                  checkCompletion();
                });
              } else if (table === 'insurance_hospitals') {
                safeQuery(`SELECT * FROM ${table} WHERE insurance_id IN (SELECT id FROM insurance_details WHERE patient_id = ?)`, [id], (err, data) => {
                  if (err) {
                    debugInfo[table].data = { error: err.message };
                  } else {
                    debugInfo[table].data = data;
                  }
                  checkCompletion();
                });
              } else if (table === 'diseases') {
                safeQuery(`SELECT * FROM ${table} LIMIT 5`, [], (err, data) => {
                  if (err) {
                    debugInfo[table].data = { error: err.message };
                  } else {
                    debugInfo[table].data = data;
                  }
                  checkCompletion();
                });
              } else {
                checkCompletion();
              }
            });
          } else {
            checkCompletion();
          }
        }
      });
    });
  } catch (error) {
    console.error("Debug route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ Get All Genetic Care Patients
router.get("/genetic-care", (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        p.id, p.name, p.lname, p.phone, p.email, p.photo, p.created_at,
        COUNT(DISTINCT c.id) as caretaker_count,
        COUNT(DISTINCT q.id) as question_count,
        COUNT(DISTINCT h.id) as habit_count,
        COUNT(DISTINCT pd.disease_id) as disease_count,
        CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END as has_insurance
      FROM patients p
      LEFT JOIN caretakers c ON p.id = c.patient_id
      LEFT JOIN questions q ON p.id = q.patient_id
      LEFT JOIN habits h ON p.id = h.patient_id
      LEFT JOIN patient_diseases pd ON p.id = pd.patient_id
      LEFT JOIN insurance_details i ON p.id = i.patient_id
    `;
    
    let countSql = "SELECT COUNT(DISTINCT p.id) as total FROM patients p";
    let params = [];
    let countParams = [];
    
    if (search) {
      const searchCondition = "WHERE p.name LIKE ? OR p.lname LIKE ? OR p.phone LIKE ? OR p.email LIKE ?";
      const searchParam = `%${search}%`;
      sql += ` ${searchCondition}`;
      countSql += ` ${searchCondition}`;
      params = [searchParam, searchParam, searchParam, searchParam];
      countParams = [searchParam, searchParam, searchParam, searchParam];
    }
    
    sql += " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    
    // Get total count first
    safeQuery(countSql, countParams, (err, countResult) => {
      if (err) {
        console.error("Get genetic care patients count error:", err.message);
        return res.status(500).json({ error: "Failed to fetch patients count" });
      }
      
      const total = countResult[0].total;
      
      // Get patients with pagination
      safeQuery(sql, params, (err, results) => {
        if (err) {
          console.error("Get genetic care patients error:", err.message);
          return res.status(500).json({ error: "Failed to fetch patients" });
        }
        
        res.json({
          patients: results || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        });
      });
    });
  } catch (error) {
    console.error("Get genetic care patients route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Delete Genetic Care Patient
router.delete("/genetic-care/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);

    // Step 1: Fetch all files related to this patient
    const fetchFilesSql = `
      SELECT photo, proofFile FROM patients WHERE id = ?;
      SELECT policyFiles FROM insurance_details WHERE patient_id = ?;
    `;

    safeQuery(fetchFilesSql, [id, id], (err, results) => {
      if (err) {
        console.error("Fetch files error:", err.message);
        return res.status(500).json({ error: "Failed to fetch patient files" });
      }

      const patientFiles = results[0] && results[0][0] ? results[0][0] : {};
      const insuranceFiles = results[1] || [];

      // Collect file paths
      let filesToDelete = [];
      if (patientFiles.photo) filesToDelete.push(patientFiles.photo);
      if (patientFiles.proofFile) {
        const files = patientFiles.proofFile.includes(",")
          ? patientFiles.proofFile.split(",")
          : [patientFiles.proofFile];
        filesToDelete.push(...files);
      }

      insuranceFiles.forEach((row) => {
        if (row.policyFiles) {
          const files = row.policyFiles.includes(",")
            ? row.policyFiles.split(",")
            : [row.policyFiles];
          filesToDelete.push(...files);
        }
      });

      // Step 2: Delete patient-related rows (order matters)
      const deleteQueries = [
        "DELETE FROM patient_diseases WHERE patient_id = ?",
        "DELETE FROM caretakers WHERE patient_id = ?",
        "DELETE FROM insurance_hospitals WHERE insurance_id IN (SELECT id FROM insurance_details WHERE patient_id = ?)",
        "DELETE FROM insurance_details WHERE patient_id = ?",
        "DELETE FROM questions WHERE patient_id = ?",
        "DELETE FROM habits WHERE patient_id = ?",
        "DELETE FROM patients WHERE id = ?",
      ];

      let i = 0;
      function runQuery() {
        if (i < deleteQueries.length) {
          safeQuery(deleteQueries[i], [id], (err) => {
            if (err) {
              console.error("Delete query error:", err.message);
              return res.status(500).json({ error: "Failed to delete patient data" });
            }
            i++;
            runQuery();
          });
        } else {
          // Step 3: Delete files from server
          filesToDelete.forEach((file) => {
            try {
              const filePath = path.join(__dirname, "..", file);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (fileError) {
              console.error("File delete error:", filePath, fileError.message);
            }
          });

          res.json({
            message: "Genetic care patient and all related data deleted successfully",
          });
        }
      }
      runQuery();
    });
  } catch (error) {
    console.error("Delete genetic care patient route error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Patient router error:", error.message);
  
  // Handle multer errors specifically
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: "File too large", 
      details: "File size exceeds the maximum limit of 10MB" 
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ 
      error: "Too many files", 
      details: "Maximum number of files exceeded" 
    });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ 
      error: "Invalid file type", 
      details: error.message 
    });
  }
  
  if (error.message && error.message.includes('Field type')) {
    return res.status(400).json({ 
      error: "Invalid field", 
      details: error.message 
    });
  }
  
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
