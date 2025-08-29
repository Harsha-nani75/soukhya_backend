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
      policyFile: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      proofFile: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    };

    // ✅ FIX: define fieldType here
    const fieldType = file.fieldname;

    if (!allowedTypes[fieldType]) {
      return cb(new Error(`Unknown field: ${fieldType}`), false);
    }

    if (allowedTypes[fieldType].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type for ${fieldType}. Allowed types: ${allowedTypes[fieldType].join(', ')}`
        ),
        false
      );
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

// // ✅ Check current database state for debugging
// router.get("/debug/insurance/:id", (req, res) => {
//   try {
//     const id = validatePatientId(req.params.id);
//     console.log(`🔍 Debugging insurance for patient ID: ${id}`);

//     // Check patient
//     safeQuery("SELECT id, name, email FROM patients WHERE id = ?", [id], (err, patientResult) => {
//       if (err) {
//         return res.status(500).json({ error: "Failed to check patient", details: err.message });
//       }

//       if (!patientResult || patientResult.length === 0) {
//         return res.status(404).json({ error: "Patient not found" });
//       }

//       const patient = patientResult[0];

//       // Check insurance details
//       safeQuery("SELECT * FROM insurance_details WHERE patient_id = ?", [id], (err, insuranceResult) => {
//         if (err) {
//           return res.status(500).json({ error: "Failed to check insurance", details: err.message });
//         }

//         // Check insurance hospitals
//         safeQuery("SELECT * FROM insurance_hospitals WHERE insurance_id IN (SELECT id FROM insurance_details WHERE patient_id = ?)", [id], (err, hospitalsResult) => {
//           if (err) {
//             return res.status(500).json({ error: "Failed to check hospitals", details: err.message });
//           }

//           res.json({
//             patient: patient,
//             insurance: insuranceResult,
//             hospitals: hospitalsResult,
//             counts: {
//               insurance: insuranceResult.length,
//               hospitals: hospitalsResult.length
//             },
//             timestamp: new Date().toISOString()
//           });
//         });
//       });
//     });
//   } catch (error) {
//     console.error("Debug endpoint error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // ✅ Test endpoint specifically for insurance data structure
// router.post("/test-insurance-structure", (req, res) => {
//   console.log('🧪 Testing insurance data structure');
//   console.log('📝 Method:', req.method);
//   console.log('📝 Content-Type:', req.headers['content-type']);
//   console.log('📝 Body type:', typeof req.body);
//   console.log('📝 Body keys:', Object.keys(req.body || {}));
//   console.log('📝 Raw body:', req.body);
  
//   // Check for nested insurance object
//   let hasNestedInsurance = false;
//   let nestedKeys = [];
//   let extractedData = null;
  
//   if (req.body.insurance && typeof req.body.insurance === 'object') {
//     hasNestedInsurance = true;
//     nestedKeys = Object.keys(req.body.insurance);
//     extractedData = req.body.insurance;
//   }
  
//   res.json({
//     message: "Insurance structure test",
//     bodyReceived: req.body,
//     bodyType: typeof req.body,
//     bodyKeys: Object.keys(req.body || {}),
//     hasNestedInsurance: hasNestedInsurance,
//     nestedInsuranceKeys: nestedKeys,
//     extractedData: extractedData,
//     timestamp: new Date().toISOString()
//   });
// });

// // ✅ Test endpoint to verify request body parsing
// router.post("/test-body", (req, res) => {
//   console.log('🧪 Testing request body parsing');
//   console.log('📝 Method:', req.method);
//   console.log('📝 Headers:', req.headers);
//   console.log('📝 Body type:', typeof req.body);
//   console.log('📝 Body keys:', Object.keys(req.body || {}));
//   console.log('📝 Raw body:', req.body);
  
//   res.json({
//     message: "Request body test",
//     bodyReceived: req.body,
//     bodyType: typeof req.body,
//     bodyKeys: Object.keys(req.body || {}),
//     timestamp: new Date().toISOString()
//   });
// });

// // ✅ Debug endpoint to check raw patient_diseases data
// router.get("/debug/patient-diseases/:id", (req, res) => {
//   try {
//     const id = validatePatientId(req.params.id);
//     console.log(`🔍 Debug: Checking raw patient_diseases for patient ID: ${id}`);

//     // Check patient exists
//     safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
//       if (err) {
//         return res.status(500).json({ error: "Failed to check patient", details: err.message });
//       }

//       if (!patientResult || patientResult.length === 0) {
//         return res.status(404).json({ error: "Patient not found" });
//       }

//       const patient = patientResult[0];

//       // Get raw patient_diseases records
//       safeQuery("SELECT * FROM patient_diseases WHERE patient_id = ?", [id], (err, pdResult) => {
//         if (err) {
//           return res.status(500).json({ error: "Failed to fetch patient_diseases", details: err.message });
//         }

//         // Get diseases table info for each disease_id
//         if (pdResult && pdResult.length > 0) {
//           const diseaseIds = pdResult.map(pd => pd.disease_id);
//           console.log(`🔍 Found disease IDs: ${diseaseIds.join(', ')}`);

//           safeQuery("SELECT * FROM diseases WHERE id IN (?)", [diseaseIds], (err, diseasesResult) => {
//             if (err) {
//               console.error("❌ Get diseases info error:", err.message);
//             }

//             res.json({
//               patient: patient,
//               patientDiseases: pdResult,
//               diseasesInfo: diseasesResult || [],
//               counts: {
//                 patientDiseases: pdResult.length,
//                 diseasesFound: diseasesResult ? diseasesResult.length : 0
//               },
//               timestamp: new Date().toISOString()
//             });
//           });
//         } else {
//           res.json({
//             patient: patient,
//             patientDiseases: [],
//             diseasesInfo: [],
//             counts: {
//               patientDiseases: 0,
//               diseasesFound: 0
//             },
//             timestamp: new Date().toISOString()
//           });
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Debug patient diseases error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// ✅ Get selected diseases for a patient
router.get("/selectedDiseases/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    console.log(`🔍 Getting selected diseases for patient ID: ${id}`);

    // First, check if patient exists
    safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      const patient = patientResult[0];
      console.log(`✅ Patient ${id} verified: ${patient.name}`);

      // Get selected diseases with disease details
      const diseasesSql = `
        SELECT 
          pd.id,
          pd.patient_id,
          pd.disease_id,
          pd.patient_data,
          COALESCE(d.code, 'N/A') as code,
          COALESCE(d.disease_name, 'Unknown Disease') as disease_name,
          COALESCE(d.category, 'Unknown Category') as category,
          COALESCE(d.description, '') as description,
          COALESCE(d.system_name, 'Unknown System') as system_name
        FROM patient_diseases pd
        LEFT JOIN diseases d ON pd.disease_id = d.id
        WHERE pd.patient_id = ?
        ORDER BY pd.disease_id
      `;

      console.log('🔍 Executing SQL query:', diseasesSql);
      console.log('🔍 Query parameters:', [id]);

      safeQuery(diseasesSql, [id], (err, diseasesResult) => {
        if (err) {
          console.error("❌ Get diseases error:", err.message);
          return res.status(500).json({ error: "Failed to fetch diseases" });
        }

        console.log(`✅ Found ${diseasesResult.length} diseases for patient ${id}`);
        console.log('📋 Raw diseases result:', JSON.stringify(diseasesResult, null, 2));

        // Also get just the patient_diseases records to verify they exist
        safeQuery("SELECT * FROM patient_diseases WHERE patient_id = ?", [id], (err, pdResult) => {
          if (err) {
            console.error("❌ Get patient_diseases error:", err.message);
          } else {
            console.log(`🔍 Patient diseases records found: ${pdResult.length}`);
            console.log('📋 Patient diseases records:', JSON.stringify(pdResult, null, 2));
          }

          res.json({
            patient: {
              id: patient.id,
              name: patient.name
            },
            diseases: diseasesResult,
            count: diseasesResult.length,
            patientDiseasesCount: pdResult ? pdResult.length : 0,
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  } catch (error) {
    console.error("❌ Get selected diseases error:", error.message);
    res.status(500).json({ error: error.message || "Failed to get selected diseases" });
  }
});

// ✅ Update selected diseases for a patient
router.put("/selectedDiseases/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const selectedDiseases = req.body;

    console.log(`🔄 Updating selected diseases for patient ID: ${id}`);
    console.log('📋 Selected diseases data received:', JSON.stringify(selectedDiseases, null, 2));

    if (!Array.isArray(selectedDiseases)) {
      console.error('❌ Selected diseases must be an array:', selectedDiseases);
      return res.status(400).json({ 
        error: "Selected diseases must be an array",
        received: selectedDiseases
      });
    }

    // Validate each disease object
    for (const disease of selectedDiseases) {
      if (!disease.disease_id) {
        console.error('❌ Each disease must have disease_id:', disease);
        return res.status(400).json({ 
          error: "Each disease must have disease_id",
          invalidDisease: disease
        });
      }

      // Validate disease_id is a reasonable number (not too large)
      const diseaseId = parseInt(disease.disease_id);
      if (isNaN(diseaseId) || diseaseId <= 0) {
        console.error('❌ Invalid disease_id (must be positive number):', disease.disease_id);
        return res.status(400).json({ 
          error: "disease_id must be a positive number",
          invalidDisease: disease
        });
      }

      // Check if disease_id is unreasonably large (likely a timestamp or error)
      if (diseaseId > 999999) {
        console.error('❌ disease_id too large (likely invalid):', diseaseId);
        return res.status(400).json({ 
          error: "disease_id is unreasonably large. Please check if this is a valid disease ID.",
          invalidDisease: disease,
          suggestion: "Valid disease IDs should typically be small numbers (1-999999)"
        });
      }
    }

    // First, check if patient exists
    safeQuery("SELECT id FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      console.log(`✅ Patient ${id} verified, proceeding with diseases update`);

      // Delete existing selected diseases
      safeQuery("DELETE FROM patient_diseases WHERE patient_id = ?", [id], (err) => {
        if (err) {
          console.error("❌ Delete diseases error:", err.message);
          return res.status(500).json({ error: "Failed to delete existing diseases" });
        }

        console.log(`✅ Existing diseases deleted for patient ${id}`);

        // If no new diseases to add, return success
        if (selectedDiseases.length === 0) {
          console.log("✅ No diseases to insert");
          return res.json({ 
            message: "Selected diseases updated successfully",
            diseases: [],
            count: 0
          });
        }

        // Insert new selected diseases
        let completed = 0;
        let hasError = false;

        console.log(`📝 Inserting ${selectedDiseases.length} diseases...`);

        selectedDiseases.forEach((disease, index) => {
          // Extract patient_data if provided, otherwise use null
          const patientData = disease.patient_data || null;
          
          const insertSql = "INSERT INTO patient_diseases (patient_id, disease_id, patient_data) VALUES (?, ?, ?)";
          const insertParams = [id, parseInt(disease.disease_id), patientData];

          console.log(`📝 Inserting disease ${index + 1}:`, {
            disease_id: parseInt(disease.disease_id),
            disease_name: disease.disease_name || disease.disease || 'Unknown',
            code: disease.code || 'N/A',
            patient_data: patientData
          });

          safeQuery(insertSql, insertParams, (err) => {
            if (err) {
              console.error(`❌ Insert disease ${index + 1} error:`, err.message);
              hasError = true;
            } else {
              console.log(`✅ Disease ${index + 1} inserted successfully with patient_data:`, patientData);
            }
            
            completed++;
            
            if (completed === selectedDiseases.length) {
              if (hasError) {
                console.error("❌ Some diseases failed to insert");
                return res.status(500).json({ error: "Failed to insert some diseases" });
              }
              
              console.log("✅ All diseases inserted successfully");
              res.json({ 
                message: "Selected diseases updated successfully",
                diseases: selectedDiseases,
                count: selectedDiseases.length
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error("❌ Update selected diseases error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update selected diseases" });
  }
});

// ✅ Update insurance details for a patient
router.put("/insurance/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    console.log(`🔄 Updating insurance for patient ID: ${id}`);
    console.log('📋 Request body:', req.body);
    console.log('📋 Request body type:', typeof req.body);
    console.log('📋 Request body keys:', Object.keys(req.body || {}));
    
    const insuranceData = req.body;
    
    if (!insuranceData || typeof insuranceData !== 'object') {
      console.error('❌ Invalid insurance data received');
      return res.status(400).json({ error: "Insurance data is required" });
    }

    // Handle both nested and direct insurance data structures
    let actualInsuranceData = insuranceData;
    if (insuranceData.insurance && typeof insuranceData.insurance === 'object') {
      console.log('🔄 Detected nested insurance object, extracting data...');
      actualInsuranceData = insuranceData.insurance;
    } else if (insuranceData.insuranceCompany && insuranceData.periodInsurance) {
      console.log('📦 Direct insurance data detected, using as is...');
      actualInsuranceData = insuranceData;
    } else {
      console.log('❌ Invalid insurance data structure');
      return res.status(400).json({ 
        error: "Invalid insurance data structure. Expected either direct fields or nested 'insurance' object",
        received: insuranceData,
        expectedFormat: {
          "direct": {
            "insuranceCompany": "LIC Insurance",
            "periodInsurance": "2020-27",
            "sumInsured": "55000",
            "declinedCoverage": "no",
            "similarInsurances": "LIC, HDFC",
            "package": "integral",
            "packageDetail": "Basic Cover",
            "hospitals": []
          },
          "nested": {
            "insurance": {
              "insuranceCompany": "LIC Insurance",
              "periodInsurance": "2020-27",
              "sumInsured": "55000",
              "declinedCoverage": "no",
              "similarInsurances": "LIC, HDFC",
              "package": "integral",
              "packageDetail": "Basic Cover",
              "hospitals": []
            }
          }
        }
      });
    }

    console.log('📋 Extracted insurance data:', actualInsuranceData);
    console.log('🔑 Key fields check:');
    console.log('  - insuranceCompany:', actualInsuranceData.insuranceCompany);
    console.log('  - periodInsurance:', actualInsuranceData.periodInsurance);
    console.log('  - sumInsured:', actualInsuranceData.sumInsured);
    console.log('  - hospitals count:', actualInsuranceData.hospitals ? actualInsuranceData.hospitals.length : 'undefined');

    // Validate required fields
    if (!actualInsuranceData.insuranceCompany || !actualInsuranceData.periodInsurance) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: "insuranceCompany and periodInsurance are required",
        received: insuranceData,
        extracted: actualInsuranceData,
        missingFields: {
          insuranceCompany: !actualInsuranceData.insuranceCompany ? 'Missing' : 'Present',
          periodInsurance: !actualInsuranceData.periodInsurance ? 'Missing' : 'Present'
        }
      });
    }

    // Check if patient exists
    safeQuery("SELECT id FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      console.log(`✅ Patient ${id} verified, proceeding with insurance update`);

      // Delete existing insurance details
      safeQuery("DELETE FROM insurance_details WHERE patient_id = ?", [id], (err) => {
        if (err) {
          console.error("❌ Delete insurance error:", err.message);
          return res.status(500).json({ error: "Failed to delete existing insurance" });
        }

        console.log(`✅ Existing insurance deleted for patient ${id}`);

        // Insert new insurance details
        const insertSql = `
          INSERT INTO insurance_details
            (patient_id, insuranceCompany, periodInsurance, sumInsured,
             declinedCoverage, similarInsurances, package, packageDetail)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Handle sumInsured properly - convert to number or null
        let sumInsured = null;
        if (actualInsuranceData.sumInsured !== undefined && actualInsuranceData.sumInsured !== null && actualInsuranceData.sumInsured !== '') {
          sumInsured = parseFloat(actualInsuranceData.sumInsured);
          if (isNaN(sumInsured)) {
            sumInsured = null;
          }
        }

        const insertParams = [
          id,
          actualInsuranceData.insuranceCompany || '',
          actualInsuranceData.periodInsurance || '',
          sumInsured,
          actualInsuranceData.declinedCoverage || '',
          actualInsuranceData.similarInsurances || '',
          actualInsuranceData.package || '',
          actualInsuranceData.packageDetail || ''
        ];

        console.log('📝 Inserting insurance with params:', insertParams);

        safeQuery(insertSql, insertParams, (err, result) => {
          if (err) {
            console.error("❌ Insert insurance error:", err.message);
            return res.status(500).json({ error: "Failed to insert insurance details" });
          }

          const insuranceId = result.insertId;
          console.log(`✅ Insurance inserted successfully with ID: ${insuranceId}`);

          // Handle insurance hospitals if provided
          if (actualInsuranceData.hospitals && Array.isArray(actualInsuranceData.hospitals) && actualInsuranceData.hospitals.length > 0) {
            console.log(`🏥 Processing ${actualInsuranceData.hospitals.length} hospitals`);
            
            let hospitalCompleted = 0;
            let hospitalError = false;

            actualInsuranceData.hospitals.forEach((hospital, index) => {
              const hospitalSql = "INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress) VALUES (?, ?, ?)";
              const hospitalParams = [
                insuranceId, 
                hospital.hospitalName || '', 
                hospital.hospitalAddress || ''
              ];

              console.log(`🏥 Inserting hospital ${index + 1}:`, hospitalParams);

              safeQuery(hospitalSql, hospitalParams, (err) => {
                if (err) {
                  console.error(`❌ Insert hospital ${index + 1} error:`, err.message);
                  hospitalError = true;
                } else {
                  console.log(`✅ Hospital ${index + 1} inserted successfully`);
                }
                
                hospitalCompleted++;
                
                if (hospitalCompleted === actualInsuranceData.hospitals.length) {
                  if (hospitalError) {
                    console.error("❌ Some hospitals failed to insert");
                    return res.status(500).json({ error: "Failed to insert some hospitals" });
                  }
                  
                  console.log("✅ All hospitals inserted successfully");
                  res.json({ 
                    message: "Insurance details updated successfully",
                    insurance: actualInsuranceData,
                    insuranceId: insuranceId,
                    hospitalsCount: actualInsuranceData.hospitals.length
                  });
                }
              });
            });
          } else {
            console.log("✅ No hospitals to process");
            res.json({ 
              message: "Insurance details updated successfully",
              insurance: actualInsuranceData,
              insuranceId: insuranceId,
              hospitalsCount: 0
            });
          }
        });
      });
    });
  } catch (error) {
    console.error("❌ Update insurance error:", error.message);
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
    
    console.log(`📸 Updating photo for patient ID: ${id}`);
    
    if (!req.file) {
      console.error("❌ No photo file uploaded");
      return res.status(400).json({ error: "No photo file uploaded" });
    }

    const photoPath = req.file.path;
    console.log(`📁 Photo file received: ${req.file.originalname}`);
    console.log(`📁 File path: ${photoPath}`);
    console.log(`📏 File size: ${req.file.size} bytes`);
    console.log(`🔍 MIME type: ${req.file.mimetype}`);

    // Check if patient exists to get name for folder info
    safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      const patient = patientResult[0];
      const patientName = patient.name.replace(/\s+/g, "_");
      console.log(`✅ Patient verified: ${patient.name} (ID: ${patient.id})`);

      // First, delete existing photo from patient_files table
      safeQuery("DELETE FROM patient_files WHERE patient_id = ? AND file_type = 'photo'", [id], (err) => {
        if (err) {
          console.error("❌ Delete existing photo error:", err.message);
          return res.status(500).json({ error: "Failed to delete existing photo" });
        }

        console.log("🗑️ Existing photo deleted successfully");

        // Insert new photo into patient_files table
        safeQuery("INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'photo', ?)", [id, photoPath], (err, result) => {
          if (err) {
            console.error("❌ Insert photo error:", err.message);
            return res.status(500).json({ error: "Failed to insert photo" });
          }
          
          console.log(`✅ Photo updated successfully with ID: ${result.insertId}`);
          
          res.json({ 
            message: "Photo updated successfully",
            photo: {
              id: result.insertId,
              patient_id: id,
              file_type: 'photo',
              file_path: photoPath,
              original_name: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
              folder: `uploads/images/${patientName}`
            },
            patient: {
              id: patient.id,
              name: patient.name
            },
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  } catch (error) {
    console.error("❌ Update photo error:", error.message);
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

    // Store file information in patient_files table
    safeQuery(
      "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'policy', ?)",
      [id, filePath],
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
    safeQuery("SELECT file_path FROM patient_files WHERE id = ? AND file_type = 'policy'", [fileId], (err, result) => {
      if (err) {
        console.error("Get policy file error:", err.message);
        return res.status(500).json({ error: "Failed to get policy file information" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Policy file not found" });
      }

      const filePath = result[0].file_path;

      // Delete from database
      safeQuery("DELETE FROM patient_files WHERE id = ?", [fileId], (err) => {
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
// Update proof files for a patient

router.put(
  "/proof-files/:id",
  upload.array("proofFiles", 10),
  async (req, res) => {
    try {
      const id = req.params.id;

      console.log(`📁 Updating proof files for patient ID: ${id}`);
      console.log("📋 Files received:", req.files ? req.files.length : 0);

      if (!req.files || req.files.length === 0) {
        console.error("❌ No proof files uploaded");
        return res.status(400).json({ error: "No proof files uploaded" });
      }

      // 🔹 Check patient exists
      safeQuery(
        "SELECT id, name FROM patients WHERE id = ?",
        [id],
        (err, patientResult) => {
          if (err) {
            console.error("❌ Patient check error:", err.message);
            return res.status(500).json({ error: "Failed to verify patient" });
          }

          if (!patientResult || patientResult.length === 0) {
            console.error(`❌ Patient with ID ${id} not found`);
            return res.status(404).json({ error: "Patient not found" });
          }

          const patient = patientResult[0];
          const patientName = patient.name.replace(/\s+/g, "_");
          console.log(`✅ Patient verified: ${patient.name} (ID: ${patient.id})`);
          console.log(`🗂️ Processing ${req.files.length} proof files for patient: ${patientName}`);

          // First, delete existing proof files from patient_files table
          safeQuery("DELETE FROM patient_files WHERE patient_id = ? AND file_type = 'proof'", [id], (err) => {
            if (err) {
              console.error("❌ Delete existing proof files error:", err.message);
              return res.status(500).json({ error: "Failed to delete existing proof files" });
            }

            console.log("🗑️ Existing proof files deleted successfully");

            let completed = 0;
            let hasError = false;
            const uploadedFiles = [];

            req.files.forEach((file, index) => {
              console.log(`📤 Processing file ${index + 1}: ${file.originalname}`);
              console.log(`📁 File path: ${file.path}`);
              console.log(`📏 File size: ${file.size} bytes`);
              console.log(`🔍 MIME type: ${file.mimetype}`);

              safeQuery(
                "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'proof', ?)",
                [id, file.path],
                (err, result) => {
                  if (err) {
                    console.error(`❌ Error storing file ${index + 1}:`, err.message);
                    hasError = true;
                  } else {
                    console.log(`✅ Proof file ${index + 1} stored successfully with ID: ${result.insertId}`);
                    uploadedFiles.push({
                      id: result.insertId,
                      patient_id: id,
                      file_type: 'proof',
                      file_path: file.path,
                      original_name: file.originalname,
                      size: file.size,
                      mimetype: file.mimetype,
                      folder: `uploads/files/${patientName}`
                    });
                  }

                  completed++;

                  if (completed === req.files.length) {
                    if (hasError) {
                      console.error("❌ Some files failed to process");
                      return res.status(500).json({
                        error: "Some files failed to process",
                        uploadedFiles: uploadedFiles,
                        totalFiles: req.files.length,
                        successfulFiles: uploadedFiles.length,
                        failedFiles: req.files.length - uploadedFiles.length
                      });
                    }

                    console.log(`✅ All ${uploadedFiles.length} proof files processed successfully`);

                    res.json({
                      message: "Proof files updated successfully",
                      patient: {
                        id: patient.id,
                        name: patient.name
                      },
                      files: uploadedFiles,
                      count: uploadedFiles.length,
                      folder: `uploads/files/${patientName}`,
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              );
            });
          });
        }
      );
    } catch (error) {
      console.error("❌ Update proof files error:", error.message);
      res.status(500).json({ error: error.message || "Failed to update proof files" });
    }
  }
);

// Get all files for a patient
router.get("/files/:id", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);

    safeQuery("SELECT * FROM patient_files WHERE patient_id = ?", [id], (err, allFiles) => {
      if (err) {
        console.error("Get files error:", err.message);
        return res.status(500).json({ error: "Failed to get files" });
      }

      // Separate files by type
      const photoFiles = allFiles.filter(f => f.file_type === 'photo');
      const proofFiles = allFiles.filter(f => f.file_type === 'proof');
      const policyFiles = allFiles.filter(f => f.file_type === 'policy');

      res.json({
        photo: photoFiles.length > 0 ? photoFiles[0] : null, // Only one photo
        proof: proofFiles,
        policy: policyFiles,
        counts: {
          photo: photoFiles.length,
          proof: proofFiles.length,
          policy: policyFiles.length,
          total: allFiles.length
        }
      });
    });
  } catch (error) {
    console.error("Get files error:", error.message);
    res.status(500).json({ error: error.message || "Failed to get files" });
  }
});

// Update policy files for a patient
router.put("/policy-files/:id", upload.array('policyFiles', 10), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    console.log(`📁 Updating policy files for patient ID: ${id}`);
    console.log('📋 Policy files received:', req.files ? req.files.length : 0);

    // Check if patient exists
    safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      const patient = patientResult[0];
      const patientName = patient.name.replace(/\s+/g, "_");
      console.log(`✅ Patient verified: ${patient.name} (ID: ${patient.id})`);

      if (!req.files || req.files.length === 0) {
        console.error("❌ No policy files uploaded");
        return res.status(400).json({ error: "No policy files uploaded" });
      }

      console.log(`🗂️ Processing ${req.files.length} policy files for patient: ${patientName}`);

      // First, delete existing policy files from patient_files table
      safeQuery("DELETE FROM patient_files WHERE patient_id = ? AND file_type = 'policy'", [id], (err) => {
        if (err) {
          console.error("❌ Delete existing policy files error:", err.message);
          return res.status(500).json({ error: "Failed to delete existing policy files" });
        }

        console.log("🗑️ Existing policy files deleted successfully");

        let completed = 0;
        let hasError = false;
        const uploadedFiles = [];

        req.files.forEach((file, index) => {
          console.log(`📤 Processing file ${index + 1}: ${file.originalname}`);
          console.log(`📁 File path: ${file.path}`);
          console.log(`📏 File size: ${file.size} bytes`);
          console.log(`🔍 MIME type: ${file.mimetype}`);

          // Insert file record into patient_files table
          safeQuery(
            "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'policy', ?)",
            [id, file.path],
            (err, result) => {
              if (err) {
                console.error(`❌ Error storing policy file ${index + 1}:`, err.message);
                hasError = true;
              } else {
                console.log(`✅ Policy file ${index + 1} stored successfully with ID: ${result.insertId}`);
                uploadedFiles.push({
                  id: result.insertId,
                  patient_id: id,
                  file_type: 'policy',
                  file_path: file.path,
                  original_name: file.originalname,
                  size: file.size,
                  mimetype: file.mimetype,
                  folder: `uploads/insurance/${patientName}`
                });
              }
              
              completed++;
              
              if (completed === req.files.length) {
                if (hasError) {
                  console.error("❌ Some policy files failed to process");
                  return res.status(500).json({ 
                    error: "Some policy files failed to process",
                    uploadedFiles: uploadedFiles,
                    totalFiles: req.files.length,
                    successfulFiles: uploadedFiles.length,
                    failedFiles: req.files.length - uploadedFiles.length
                  });
                }
                
                console.log(`✅ All ${uploadedFiles.length} policy files processed successfully`);
                
                res.json({ 
                  message: "Policy files updated successfully",
                  patient: {
                    id: patient.id,
                    name: patient.name
                  },
                  files: uploadedFiles,
                  count: uploadedFiles.length,
                  folder: `uploads/insurance/${patientName}`,
                  timestamp: new Date().toISOString()
                });
              }
            }
          );
        });
      });
    });
  } catch (error) {
    console.error("❌ Update policy files error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update policy files" });
  }
});

// ✅ Upload proof file
router.post("/proof-file/:id", upload.single('proofFile'), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ error: "No proof file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Store file information in patient_files table
    safeQuery(
      "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'proof', ?)",
      [id, filePath],
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
    safeQuery("SELECT file_path FROM patient_files WHERE id = ? AND file_type = 'proof'", [fileId], (err, result) => {
      if (err) {
        console.error("Get proof file error:", err.message);
        return res.status(500).json({ error: "Failed to get proof file information" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Proof file not found" });
      }

      const filePath = result[0].file_path;

      // Delete from database
      safeQuery("DELETE FROM patient_files WHERE id = ?", [fileId], (err) => {
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

// ✅ Update multiple file types for a patient (comprehensive update)
router.put("/files/:id", upload.fields([
  { name: "proofFiles", maxCount: 10 },
  { name: "policyFiles", maxCount: 10 }
]), handleMulterError, (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    
    console.log(`🔄 Updating files for patient ID: ${id}`);
    console.log('📁 Files received:', req.files);

    // First, check if patient exists and get patient name
    safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
      if (err) {
        console.error("❌ Patient check error:", err.message);
        return res.status(500).json({ error: "Failed to verify patient" });
      }

      if (!patientResult || patientResult.length === 0) {
        console.error(`❌ Patient with ID ${id} not found`);
        return res.status(404).json({ error: "Patient not found" });
      }

      const patient = patientResult[0];
      const patientName = patient.name.replace(/\s+/g, "_");
      console.log(`✅ Patient ${id} verified: ${patient.name}`);

      // Check if any files were uploaded
      const hasFiles = req.files && (req.files.proofFiles || req.files.policyFiles);
      if (!hasFiles) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      let totalFiles = 0;
      let processedFiles = 0;
      let hasError = false;
      const uploadedFiles = { proofFiles: [], policyFiles: [] };

      // Process proof files
      if (req.files.proofFiles && req.files.proofFiles.length > 0) {
        totalFiles += req.files.proofFiles.length;
        console.log(`📁 Processing ${req.files.proofFiles.length} proof files...`);

        // First, delete existing proof files
        safeQuery("DELETE FROM patient_files WHERE patient_id = ? AND file_type = 'proof'", [id], (err) => {
          if (err) {
            console.error("❌ Delete existing proof files error:", err.message);
            hasError = true;
            processedFiles += req.files.proofFiles.length;
            checkCompletion();
          } else {
            // Insert new proof files
            req.files.proofFiles.forEach((file, index) => {
              console.log(`📁 Processing proof file ${index + 1}: ${file.originalname}`);

              safeQuery(
                "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'proof', ?)",
                [id, file.path],
                (err, result) => {
                  if (err) {
                    console.error(`❌ Error storing proof file ${index + 1}:`, err.message);
                    hasError = true;
                  } else {
                    console.log(`✅ Proof file ${index + 1} stored with ID: ${result.insertId}`);
                    uploadedFiles.proofFiles.push({
                      id: result.insertId,
                      path: file.path,
                      name: file.originalname,
                      size: file.size,
                      mimetype: file.mimetype
                    });
                  }
                  
                  processedFiles++;
                  checkCompletion();
                }
              );
            });
          }
        });
      }

      // Process policy files
      if (req.files.policyFiles && req.files.policyFiles.length > 0) {
        totalFiles += req.files.policyFiles.length;
        console.log(`📁 Processing ${req.files.policyFiles.length} policy files...`);

        // First, delete existing policy files
        safeQuery("DELETE FROM patient_files WHERE patient_id = ? AND file_type = 'policy'", [id], (err) => {
          if (err) {
            console.error("❌ Delete existing policy files error:", err.message);
            hasError = true;
            processedFiles += req.files.policyFiles.length;
            checkCompletion();
          } else {
            // Insert new policy files
            req.files.policyFiles.forEach((file, index) => {
              console.log(`📁 Processing policy file ${index + 1}: ${file.originalname}`);

              safeQuery(
                "INSERT INTO patient_files (patient_id, file_type, file_path) VALUES (?, 'policy', ?)",
                [id, file.path],
                (err, result) => {
                  if (err) {
                    console.error(`❌ Error storing policy file ${index + 1}:`, err.message);
                    hasError = true;
                  } else {
                    console.log(`✅ Policy file ${index + 1} stored with ID: ${result.insertId}`);
                    uploadedFiles.policyFiles.push({
                      id: result.insertId,
                      path: file.path,
                      name: file.originalname,
                      size: file.size,
                      mimetype: file.mimetype
                    });
                  }
                  
                  processedFiles++;
                  checkCompletion();
                }
              );
            });
          }
        });
      }

      // Check if all files have been processed
      function checkCompletion() {
        if (processedFiles === totalFiles) {
          if (hasError) {
            console.error("❌ Some files failed to process");
            return res.status(500).json({ 
              error: "Some files failed to process",
              uploadedFiles: uploadedFiles
            });
          }
          
          console.log("✅ All files processed successfully");
          res.json({ 
            message: "Files updated successfully",
            patient: {
              id: patient.id,
              name: patient.name
            },
            files: uploadedFiles,
            counts: {
              proofFiles: uploadedFiles.proofFiles.length,
              policyFiles: uploadedFiles.policyFiles.length,
              total: uploadedFiles.proofFiles.length + uploadedFiles.policyFiles.length
            },
            folders: {
              proofFiles: `uploads/files/${patientName}`,
              policyFiles: `uploads/insurance/${patientName}`
            }
          });
        }
      }

      // If no files to process, return success immediately
      if (totalFiles === 0) {
        return res.json({ 
          message: "No files to process",
          patient: {
            id: patient.id,
            name: patient.name
          },
          files: uploadedFiles,
          counts: { proofFiles: 0, policyFiles: 0, total: 0 }
        });
      }
    });
  } catch (error) {
    console.error("❌ Update files error:", error.message);
    res.status(500).json({ error: error.message || "Failed to update files" });
  }
});

// // ✅ Test endpoint to verify patient_data functionality
// router.post("/test-patient-data/:id", (req, res) => {
//   try {
//     const id = validatePatientId(req.params.id);
//     const { diseases } = req.body;

//     console.log('🧪 Testing patient_data functionality for patient ID:', id);
//     console.log('📋 Diseases data received:', JSON.stringify(diseases, null, 2));

//     if (!Array.isArray(diseases)) {
//       return res.status(400).json({ 
//         error: "Diseases must be an array",
//         received: diseases
//       });
//     }

//     // Validate each disease object
//     for (const disease of diseases) {
//       if (!disease.disease_id) {
//         return res.status(400).json({ 
//           error: "Each disease must have disease_id",
//           invalidDisease: disease
//         });
//       }

//       // Check if patient_data is provided (optional)
//       if (disease.patient_data !== undefined) {
//         console.log(`📝 Disease ${disease.disease_id} has patient_data:`, disease.patient_data);
//       } else {
//         console.log(`📝 Disease ${disease.disease_id} has no patient_data`);
//       }
//     }

//     // Check if patient exists
//     safeQuery("SELECT id, name FROM patients WHERE id = ?", [id], (err, patientResult) => {
//       if (err) {
//         console.error("❌ Patient check error:", err.message);
//         return res.status(500).json({ error: "Failed to verify patient" });
//       }

//       if (!patientResult || patientResult.length === 0) {
//         console.error(`❌ Patient with ID ${id} not found`);
//         return res.status(404).json({ error: "Patient not found" });
//       }

//       const patient = patientResult[0];
//       console.log(`✅ Patient ${id} verified: ${patient.name}`);

//       // Test inserting diseases with patient_data
//       let completed = 0;
//       let hasError = false;
//       const insertedDiseases = [];

//       diseases.forEach((disease, index) => {
//         const patientData = disease.patient_data || null;
        
//         safeQuery(
//           "INSERT INTO patient_diseases (patient_id, disease_id, patient_data) VALUES (?, ?, ?)",
//           [id, parseInt(disease.disease_id), patientData],
//           (err, result) => {
//             if (err) {
//               console.error(`❌ Insert disease ${index + 1} error:`, err.message);
//               hasError = true;
//             } else {
//               console.log(`✅ Disease ${index + 1} inserted successfully with ID: ${result.insertId}`);
//               insertedDiseases.push({
//                 id: result.insertId,
//                 disease_id: parseInt(disease.disease_id),
//                 patient_data: patientData
//               });
//             }
            
//             completed++;
            
//             if (completed === diseases.length) {
//               if (hasError) {
//                 return res.status(500).json({ 
//                   error: "Some diseases failed to insert",
//                   insertedDiseases: insertedDiseases
//                 });
//               }
              
//               console.log("✅ All diseases inserted successfully");
              
//               // Now test retrieving the inserted data
//               safeQuery(
//                 "SELECT * FROM patient_diseases WHERE patient_id = ? ORDER BY id DESC LIMIT ?",
//                 [id, diseases.length],
//                 (err, retrievedDiseases) => {
//                   if (err) {
//                     console.error("❌ Retrieve diseases error:", err.message);
//                     return res.status(500).json({ 
//                       error: "Failed to retrieve inserted diseases",
//                       insertedDiseases: insertedDiseases
//                     });
//                   }
                  
//                   console.log("📋 Retrieved diseases:", JSON.stringify(retrievedDiseases, null, 2));
                  
//                   res.json({ 
//                     message: "Patient data functionality test completed successfully",
//                     patient: {
//                       id: patient.id,
//                       name: patient.name
//                     },
//                     insertedDiseases: insertedDiseases,
//                     retrievedDiseases: retrievedDiseases,
//                     count: insertedDiseases.length,
//                     timestamp: new Date().toISOString()
//                   });
//                 }
//               );
//             }
//           }
//         );
//       });
//     });
//   } catch (error) {
//     console.error("❌ Test patient data error:", error.message);
//     res.status(500).json({ error: error.message || "Failed to test patient data functionality" });
//   }
// });

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

// Delete individual file by ID
router.delete("/file/:fileId", (req, res) => {
  try {
    const fileId = validatePatientId(req.params.fileId);

    // Get file path and type before deletion
    safeQuery("SELECT file_path, file_type FROM patient_files WHERE id = ?", [fileId], (err, result) => {
      if (err) {
        console.error("Get file error:", err.message);
        return res.status(500).json({ error: "Failed to get file information" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = result[0].file_path;
      const fileType = result[0].file_type;

      // Delete from database
      safeQuery("DELETE FROM patient_files WHERE id = ?", [fileId], (err) => {
        if (err) {
          console.error("Delete file error:", err.message);
          return res.status(500).json({ error: "Failed to delete file" });
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

        res.json({ 
          message: `${fileType} file deleted successfully`,
          deletedFile: {
            id: fileId,
            type: fileType,
            path: filePath
          }
        });
      });
    });
  } catch (error) {
    console.error("Delete file error:", error.message);
    res.status(500).json({ error: error.message || "Failed to delete file" });
  }
});

// Get files by type for a patient
router.get("/files/:id/:type", (req, res) => {
  try {
    const id = validatePatientId(req.params.id);
    const fileType = req.params.type;

    // Validate file type
    if (!['photo', 'proof', 'policy'].includes(fileType)) {
      return res.status(400).json({ error: "Invalid file type. Must be 'photo', 'proof', or 'policy'" });
    }

    safeQuery("SELECT * FROM patient_files WHERE patient_id = ? AND file_type = ?", [id, fileType], (err, files) => {
      if (err) {
        console.error("Get files by type error:", err.message);
        return res.status(500).json({ error: "Failed to get files" });
      }

      // For photo, return single file; for others, return array
      if (fileType === 'photo') {
        res.json({
          type: fileType,
          file: files.length > 0 ? files[0] : null,
          count: files.length
        });
      } else {
        res.json({
          type: fileType,
          files: files,
          count: files.length
        });
      }
    });
  } catch (error) {
    console.error("Get files by type error:", error.message);
    res.status(500).json({ error: error.message || "Failed to get files" });
  }
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error("Router error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
