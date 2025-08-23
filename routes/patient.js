// routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    if (req.body.patient) {
      try {
        const patient = JSON.parse(req.body.patient);
        patientName = patient.name.replace(/\s+/g, "_");
      } catch (err) {
        console.error("Patient parse error:", err);
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

    // create folder if not exist
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    let patientName = "unknown";
    if (req.body.patient) {
      try {
        const patient = JSON.parse(req.body.patient);
        patientName = patient.name.replace(/\s+/g, "_");
      } catch (err) {
        console.error("Patient parse error:", err);
      }
    }
    const ext = path.extname(file.originalname);
    cb(null, `${patientName}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });


router.get('/', (req, res) => {
  const sql = 'SELECT id,name,lname,phone,email,photo FROM patients';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});


// Get patient by ID with all related data
router.get('/care/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM caretakers WHERE patient_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});
router.get('/habits/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM habits WHERE patient_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});
router.get('/questions/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM questions WHERE patient_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});
router.get('/insuranceHospitals/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM insurance_hospitals WHERE insurance_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});

router.get('/insuranceDetails/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM insurance_details WHERE patient_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'Package not found' });
    res.json(result[0]);
  });
});

// READ Single Package
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `SELECT 
    p.id AS patient_id, 
    p.name, p.lname, p.sname, p.abb, p.abbname, p.gender,
    p.dob, p.age, p.ocupation, p.phone, p.email, p.photo,
    p.rstatus, p.raddress, p.rcity, p.rstate, p.rzipcode,
    p.paddress, p.pcity, p.pstate, p.pzipcode,
    p.idnum, p.addressTextProof, p.proofFile,
    p.created_at, p.updated_at,

    ct.caretakers,
    i.insuranceCompany, i.periodInsurance, i.sumInsured,  
    i.policyFiles, i.declinedCoverage, i.similarInsurances, 
    i.package, i.packageDetail,
    ih.insurance_hospitals,
    qn.questions,
    hb.habits

FROM patients p

-- Caretakers subquery
LEFT JOIN (
    SELECT 
        patient_id, 
        GROUP_CONCAT(CONCAT(name, ' (', relation, ') - ', phone, ' - ', email) SEPARATOR ' || ') AS caretakers
    FROM caretakers
    GROUP BY patient_id
) ct ON p.id = ct.patient_id

-- Insurance details
LEFT JOIN insurance_details i ON p.id = i.patient_id

-- Insurance hospitals subquery
LEFT JOIN (
    SELECT 
        insurance_id,
        GROUP_CONCAT(CONCAT(hospitalName, ' - ', hospitalAddress) SEPARATOR ' || ') AS insurance_hospitals
    FROM insurance_hospitals
    GROUP BY insurance_id
) ih ON i.id = ih.insurance_id

-- Questions subquery
LEFT JOIN (
    SELECT 
        patient_id,
        GROUP_CONCAT(CONCAT(question_code, ': ', answer, IFNULL(CONCAT(' (', details, ')'), '')) SEPARATOR ' || ') AS questions
    FROM questions
    GROUP BY patient_id
) qn ON p.id = qn.patient_id

-- Habits subquery
LEFT JOIN (
    SELECT 
        patient_id,
        GROUP_CONCAT(CONCAT(habit_code, ': ', answer, IFNULL(CONCAT(' - ', years, ' years'), '')) SEPARATOR ' || ') AS habits
    FROM habits
    GROUP BY patient_id
) hb ON p.id = hb.patient_id

WHERE p.id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: 'patient not found' });
    res.json(result[0]);
  });
});


router.post(
  "/",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "proofFile", maxCount: 5 },
    { name: "policyFiles", maxCount: 5 }
  ]),
  (req, res) => {
    try {
      // 🔹 Parse safely
      const patient = req.body.patient ? JSON.parse(req.body.patient) : {};
      let caretakers = req.body.careTaker ? JSON.parse(req.body.careTaker) : [];
      let insurance = req.body.insurance ? JSON.parse(req.body.insurance) : null;
      let insuranceHospitals = req.body.insuranceHospitals
        ? JSON.parse(req.body.insuranceHospitals)
        : [];
      let questions = req.body.questions ? JSON.parse(req.body.questions) : [];
      let habits = req.body.habits ? JSON.parse(req.body.habits) : [];

      // 🔹 Normalize to arrays
      if (!Array.isArray(caretakers) && caretakers) caretakers = [caretakers];
      if (!Array.isArray(insuranceHospitals) && insuranceHospitals) insuranceHospitals = [insuranceHospitals];
      if (!Array.isArray(questions) && questions) {
        // questions came as object {q1:{...}, q2:{...}}
        questions = Object.keys(questions).map(key => ({
          question_code: key,
          answer: questions[key].answer,
          details: questions[key].details
        }));
      }
      if (!Array.isArray(habits) && habits) {
        // habits came as object {tobacco:..., tobaccoYears:...}
        const temp = [];
        if (habits.tobacco) {
          temp.push({ habit_code: "tobacco", answer: habits.tobacco, years: habits.tobaccoYears });
        }
        if (habits.smoking) {
          temp.push({ habit_code: "smoking", answer: habits.smoking, years: habits.smokingYears });
        }
        if (habits.alcohol) {
          temp.push({ habit_code: "alcohol", answer: habits.alcohol, years: habits.alcoholYears });
        }
        if (habits.drugs) {
          temp.push({ habit_code: "drugs", answer: habits.drugs, years: habits.drugsYears });
        }
        habits = temp;
      }

      // 🔹 Save uploaded file paths
      if (req.files["photo"]) {
        patient.photo = req.files["photo"][0].path;
      }
      if (req.files["proofFile"]) {
        patient.proofFile = req.files["proofFile"].map(f => f.path).join(",");
      }
      if (insurance && req.files["policyFiles"]) {
        insurance.policyFiles = req.files["policyFiles"].map(f => f.path).join(",");
      }

      // 1️⃣ Insert Patient
      const sqlPatient = `
        INSERT INTO patients 
          (name, lname, sname, abb, abbname, gender, dob, age, ocupation, phone, email, photo,
           rstatus, raddress, rcity, rstate, rzipcode, paddress, pcity, pstate, pzipcode,
           idnum, addressTextProof, proofFile)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      db.query(
        sqlPatient,
        [
          patient.name, patient.lname, patient.sname, patient.abb, patient.abbname,
          patient.gender, patient.dob, patient.age, patient.ocupation, patient.phone,
          patient.email, patient.photo, patient.rstatus, patient.raddress, patient.rcity,
          patient.rstate, patient.rzipcode, patient.paddress, patient.pcity, patient.pstate,
          patient.pzipcode, patient.idnum, patient.addressTextProof, patient.proofFile
        ],
        (err, patientResult) => {
          if (err) return res.status(500).json({ error: err });

          const patientId = patientResult.insertId;

          // 2️⃣ Caretakers
          caretakers.forEach(c => {
            db.query(
              `INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
               VALUES (?,?,?,?,?,?)`,
              [patientId, c.name, c.relation, c.phone, c.email, c.address]
            );
          });

          // 3️⃣ Insurance
          let insuranceId = null;
          if (insurance) {
            const sqlInsurance = `
              INSERT INTO insurance_details
                (patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles,
                 declinedCoverage, similarInsurances, package, packageDetail)
              VALUES (?,?,?,?,?,?,?,?,?)`;
            db.query(sqlInsurance, [
              patientId, insurance.insuranceCompany, insurance.periodInsurance,
              insurance.sumInsured, insurance.policyFiles, insurance.declinedCoverage,
              insurance.similarInsurances, insurance.package, insurance.packageDetail
            ], (err, insResult) => {
              if (!err) {
                insuranceId = insResult.insertId;

                // 4️⃣ Insurance Hospitals
                insuranceHospitals.forEach(h => {
                  db.query(
                    `INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
                     VALUES (?,?,?)`,
                    [insuranceId, h.hospitalName, h.hospitalAddress]
                  );
                });
              }
            });
          }

          // 5️⃣ Questions
          questions.forEach(q => {
            db.query(
              `INSERT INTO questions (patient_id, question_code, answer, details)
               VALUES (?,?,?,?)`,
              [patientId, q.question_code, q.answer, q.details]
            );
          });

          // 6️⃣ Habits
          habits.forEach(h => {
            db.query(
              `INSERT INTO habits (patient_id, habit_code, answer, years)
               VALUES (?,?,?,?)`,
              [patientId, h.habit_code, h.answer, h.years]
            );
          });

          res.status(201).json({
            patient_id: patientId,
            message: "Patient created successfully with files",
          });
        }
      );
    } catch (error) {
      console.error("Parse Error:", error);
      res.status(400).json({ error: "Invalid request format" });
    }
  }
);





// //update patient by ID with all related data
// // UPDATE Patient with caretakers, insurance, hospitals, questions, habits
// router.put("/:id", (req, res) => {
//   const patientId = req.params.id;
//   const {
//     patient,
//     caretakers,
//     insurance,
//     insuranceHospitals,
//     questions,
//     habits,
//   } = req.body;

//   // 1️⃣ Update Patient
//   const sqlUpdatePatient = `
//     UPDATE patients SET
//       name=?, lname=?, sname=?, abb=?, abbname=?, gender=?, dob=?, age=?, ocupation=?, phone=?, email=?, photo=?,
//       rstatus=?, raddress=?, rcity=?, rstate=?, rzipcode=?, paddress=?, pcity=?, pstate=?, pzipcode=?,
//       idnum=?, addressTextProof=?, proofFile=?
//     WHERE id=?`;

//   db.query(sqlUpdatePatient, [
//     patient.name, patient.lname, patient.sname, patient.abb, patient.abbname,
//     patient.gender, patient.dob, patient.age, patient.ocupation, patient.phone,
//     patient.email, patient.photo, patient.rstatus, patient.raddress, patient.rcity,
//     patient.rstate, patient.rzipcode, patient.paddress, patient.pcity, patient.pstate,
//     patient.pzipcode, patient.idnum, patient.addressTextProof, patient.proofFile,
//     patientId
//   ], (err) => {
//     if (err) return res.status(500).json({ error: err });

//     // 2️⃣ Delete old caretakers & re-insert
//     db.query(`DELETE FROM caretakers WHERE patient_id=?`, [patientId]);
//     if (caretakers && caretakers.length > 0) {
//       caretakers.forEach(c => {
//         db.query(
//           `INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
//            VALUES (?,?,?,?,?,?)`,
//           [patientId, c.name, c.relation, c.phone, c.email, c.address]
//         );
//       });
//     }

//     // 3️⃣ Delete old insurance & re-insert
//     db.query(`DELETE FROM insurance_details WHERE patient_id=?`, [patientId], (err) => {
//       if (!err && insurance) {
//         const sqlInsurance = `
//           INSERT INTO insurance_details
//             (patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles,
//              declinedCoverage, similarInsurances, package, packageDetail)
//           VALUES (?,?,?,?,?,?,?,?,?)`;
//         db.query(sqlInsurance, [
//           patientId, insurance.insuranceCompany, insurance.periodInsurance,
//           insurance.sumInsured, insurance.policyFiles, insurance.declinedCoverage,
//           insurance.similarInsurances, insurance.package, insurance.packageDetail
//         ], (err, insResult) => {
//           if (!err) {
//             const insuranceId = insResult.insertId;

//             // 4️⃣ Insert Insurance Hospitals
//             db.query(`DELETE FROM insurance_hospitals WHERE insurance_id=?`, [insuranceId]);
//             if (insuranceHospitals && insuranceHospitals.length > 0) {
//               insuranceHospitals.forEach(h => {
//                 db.query(
//                   `INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
//                    VALUES (?,?,?)`,
//                   [insuranceId, h.hospitalName, h.hospitalAddress]
//                 );
//               });
//             }
//           }
//         });
//       }
//     });

//     // 5️⃣ Delete old questions & re-insert
//     db.query(`DELETE FROM questions WHERE patient_id=?`, [patientId]);
//     if (questions && questions.length > 0) {
//       questions.forEach(q => {
//         db.query(
//           `INSERT INTO questions (patient_id, question_code, answer, details)
//            VALUES (?,?,?,?)`,
//           [patientId, q.question_code, q.answer, q.details]
//         );
//       });
//     }

//     // 6️⃣ Delete old habits & re-insert
//     db.query(`DELETE FROM habits WHERE patient_id=?`, [patientId]);
//     if (habits && habits.length > 0) {
//       habits.forEach(h => {
//         db.query(
//           `INSERT INTO habits (patient_id, habit_code, answer, years)
//            VALUES (?,?,?,?)`,
//           [patientId, h.habit_code, h.answer, h.years]
//         );
//       });
//     }

//     res.json({
//       patient_id: patientId,
//       message: "Patient updated successfully",
//     });
//   });
// });

//delete
// DELETE Patient and related data
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // delete queries (order matters: child tables first, then patients)
  const deleteQueries = [
    'DELETE FROM caretakers WHERE patient_id = ?',
    'DELETE FROM insurance_hospitals WHERE insurance_id IN (SELECT id FROM insurance_details WHERE patient_id = ?)',
    'DELETE FROM insurance_details WHERE patient_id = ?',
    'DELETE FROM questions WHERE patient_id = ?',
    'DELETE FROM habits WHERE patient_id = ?',
    'DELETE FROM patients WHERE id = ?'
  ];

  let i = 0;

  function runQuery() {
    if (i < deleteQueries.length) {
      db.query(deleteQueries[i], [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        i++;
        runQuery();
      });
    } else {
      res.json({ message: 'Patient and related data deleted successfully' });
    }
  }

  runQuery();
});



module.exports = router;
