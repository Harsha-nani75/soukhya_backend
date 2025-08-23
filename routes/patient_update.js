const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require("multer");
const fs = require("fs");
const path = require("path");


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const patientName = req.body.patient?.name?.replace(/\s+/g, "_");
    let folder = "uploads/others";

    if (file.fieldname === "photo") {
      folder = `uploads/images/${patientName}`;
    } else if (file.fieldname === "proofFile") {
      folder = `uploads/files/${patientName}`;
    } else if (file.fieldname === "policyFiles") {
      folder = `uploads/insurance/${patientName}`;
    }

    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const patientName = req.body.patient?.name?.replace(/\s+/g, "_");
    cb(null, `${patientName}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// UPDATE Patient
router.put("/:id", upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "proofFile", maxCount: 5 },
  { name: "policyFiles", maxCount: 5 }
]), (req, res) => {
  const patientId = req.params.id;
  let {
    patient,
    caretakers,
    insurance,
    insuranceHospitals,
    questions,
    habits,
  } = req.body;

  // ensure JSON objects if coming as strings
  if (typeof patient === "string") patient = JSON.parse(patient);
  if (typeof caretakers === "string") caretakers = JSON.parse(caretakers);
  if (typeof insurance === "string") insurance = JSON.parse(insurance);
  if (typeof insuranceHospitals === "string") insuranceHospitals = JSON.parse(insuranceHospitals);
  if (typeof questions === "string") questions = JSON.parse(questions);
  if (typeof habits === "string") habits = JSON.parse(habits);

  // Handle uploaded files
  if (req.files["photo"]) {
    patient.photo = req.files["photo"][0].path;
  }
  if (req.files["proofFile"]) {
    patient.proofFile = req.files["proofFile"].map(f => f.path).join(",");
  }
  if (insurance && req.files["policyFiles"]) {
    insurance.policyFiles = req.files["policyFiles"].map(f => f.path).join(",");
  }

  // 1️⃣ Update Patient
  const sqlUpdatePatient = `
    UPDATE patients SET
      name=?, lname=?, sname=?, abb=?, abbname=?, gender=?, dob=?, age=?, ocupation=?, phone=?, email=?, photo=?,
      rstatus=?, raddress=?, rcity=?, rstate=?, rzipcode=?, paddress=?, pcity=?, pstate=?, pzipcode=?,
      idnum=?, addressTextProof=?, proofFile=?
    WHERE id=?`;

  db.query(sqlUpdatePatient, [
    patient.name, patient.lname, patient.sname, patient.abb, patient.abbname,
    patient.gender, patient.dob, patient.age, patient.ocupation, patient.phone,
    patient.email, patient.photo, patient.rstatus, patient.raddress, patient.rcity,
    patient.rstate, patient.rzipcode, patient.paddress, patient.pcity, patient.pstate,
    patient.pzipcode, patient.idnum, patient.addressTextProof, patient.proofFile,
    patientId
  ], (err) => {
    if (err) return res.status(500).json({ error: err });

    // 2️⃣ Update Caretakers
    db.query(`DELETE FROM caretakers WHERE patient_id=?`, [patientId]);
    if (caretakers?.length) {
      caretakers.forEach(c => {
        db.query(
          `INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
           VALUES (?,?,?,?,?,?)`,
          [patientId, c.name, c.relation, c.phone, c.email, c.address]
        );
      });
    }

    // 3️⃣ Update Insurance
    db.query(`DELETE FROM insurance_details WHERE patient_id=?`, [patientId], (err) => {
      if (!err && insurance) {
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
            const insuranceId = insResult.insertId;

            // 4️⃣ Update Insurance Hospitals
            db.query(`DELETE FROM insurance_hospitals WHERE insurance_id=?`, [insuranceId]);
            if (insuranceHospitals?.length) {
              insuranceHospitals.forEach(h => {
                db.query(
                  `INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
                   VALUES (?,?,?)`,
                  [insuranceId, h.hospitalName, h.hospitalAddress]
                );
              });
            }
          }
        });
      }
    });

    // 5️⃣ Update Questions
    db.query(`DELETE FROM questions WHERE patient_id=?`, [patientId]);
    if (questions?.length) {
      questions.forEach(q => {
        db.query(
          `INSERT INTO questions (patient_id, question_code, answer, details)
           VALUES (?,?,?,?)`,
          [patientId, q.question_code, q.answer, q.details]
        );
      });
    }

    // 6️⃣ Update Habits
    db.query(`DELETE FROM habits WHERE patient_id=?`, [patientId]);
    if (habits?.length) {
      habits.forEach(h => {
        db.query(
          `INSERT INTO habits (patient_id, habit_code, answer, years)
           VALUES (?,?,?,?)`,
          [patientId, h.habit_code, h.answer, h.years]
        );
      });
    }

    res.json({
      patient_id: patientId,
      message: "Patient updated successfully with files",
    });
  });
});


module.exports = router;
