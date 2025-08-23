----- MySQL Table -----
 CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phnum VARCHAR(15) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Add role column to users table
ALTER TABLE users
ADD COLUMN role ENUM('customer', 'patient', 'admin', 'superAdmin', 'nurse', 'marketingExecutive', 'doctor') 
DEFAULT 'customer' AFTER password;

-- for enquiries
CREATE TABLE enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phoneNo VARCHAR(15) NOT NULL,
    address TEXT,
    message TEXT,
    serviceType ENUM('elder care', 'medical tourism') NOT NULL,
    treatmentIssue TEXT NULL, -- only used if serviceType = 'medical tourism'
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolvedDate TIMESTAMP NULL,
    
    -- Optional: enforce treatmentIssue only when serviceType = 'medical tourism'
    CONSTRAINT chk_treatmentIssue CHECK (
        (serviceType = 'medical tourism' AND treatmentIssue IS NOT NULL) 
        OR (serviceType = 'elder care' AND treatmentIssue IS NULL)
    )
);


--dummy data for enquiries
INSERT INTO enquiries 
(name, email, phoneNo, address, message, serviceType, treatmentIssue, resolved) 
VALUES
('Alice Johnson', 'alice@example.com', '9876543210', NULL, 'Interested in medical tourism packages for cardiac treatment.', 'medical tourism', 'Cardiac treatment', FALSE),

('Bob Smith', 'bob.smith@example.com', '8765432190', NULL, 'Need details about elder care services for my parents.', 'elder care', NULL, FALSE),

('Charlie Davis', 'charlie.d@example.com', '7654321980', NULL, 'Looking for affordable knee replacement packages abroad.', 'medical tourism', 'Knee replacement', FALSE),

('Diana Prince', 'diana.prince@example.com', '6543219870', NULL, 'What countries are covered in the elder care program?', 'elder care', NULL, FALSE),

('Edward Green', 'edward.g@example.com', '5432198760', NULL, 'Enquiring about post-surgery rehabilitation under medical tourism.', 'medical tourism', 'Post-surgery rehabilitation', FALSE),

('Fiona West', 'fiona.w@example.com', '4321987650', NULL, 'Are there any home visits under elder care services?', 'elder care', NULL, FALSE),

('George Baker', 'george.b@example.com', '3219876540', NULL, 'Need assistance with visa for medical travel to India.', 'medical tourism', 'Medical travel assistance (Visa)', FALSE),

('Hannah Lee', 'hannah.l@example.com', '2198765430', NULL, 'What is included in your elderly health monitoring program?', 'elder care', NULL, FALSE),

('Ian Clark', 'ian.clark@example.com', '1987654320', NULL, 'Need complete brochure on cosmetic surgery tourism options.', 'medical tourism', 'Cosmetic surgery', FALSE),

('Julia Roberts', 'julia.r@example.com', '9876501234', NULL, 'Can you help with Alzheimer’s home care assistance?', 'elder care', NULL, FALSE),

('Kevin Adams', 'kevin.adams@example.com', '9867502233', NULL, 'Is dental treatment covered in your tourism packages?', 'medical tourism', 'Dental treatment', FALSE),

('Linda Grey', 'linda.grey@example.com', '9856503333', NULL, 'How do I book a consultation for elder care needs?', 'elder care', NULL, FALSE),

('Mark Taylor', 'mark.taylor@example.com', '9845504433', NULL, 'Looking for orthopedic surgery packages in Thailand.', 'medical tourism', 'Orthopedic surgery', FALSE),

('Nina Patel', 'nina.patel@example.com', '9834505533', NULL, 'Please send me elder care monthly subscription plans.', 'elder care', NULL, FALSE),

('Oliver White', 'oliver.white@example.com', '9823506633', NULL, 'Can I get a quotation for liver transplant in Singapore?', 'medical tourism', 'Liver transplant', FALSE),

('Priya Kumar', 'priya.kumar@example.com', '9812507733', NULL, 'Want to understand the benefits of your senior citizen care program.', 'elder care', NULL, FALSE),

('Quentin Brown', 'quentin.brown@example.com', '9801508833', NULL, 'Do you offer ICU-on-wheels services for elder transport?', 'elder care', NULL, FALSE),

('Rita Sen', 'rita.sen@example.com', '9790509933', NULL, 'Interested in international physiotherapy options.', 'medical tourism', 'Physiotherapy', FALSE),

('Steve Black', 'steve.black@example.com', '9780510033', NULL, 'Need guidance for kidney transplant under medical travel.', 'medical tourism', 'Kidney transplant', FALSE),

('Tina Roy', 'tina.roy@example.com', '9770521133', NULL, 'How soon can elder care service be initiated post-discharge?', 'elder care', NULL, FALSE),

('Umesh Reddy', 'umesh.reddy@example.com', '9760532233', NULL, 'What is the cost for assisted living programs for elders?', 'elder care', NULL, FALSE);


--packages table
CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service ENUM('Couples', 'Individuals') NOT NULL,   -- Restrict values
    name VARCHAR(100) NOT NULL,                        -- Package name
    priceMonthly DECIMAL(10,2) NOT NULL,               -- Monthly price
    priceYearly DECIMAL(10,2) NOT NULL,                -- Yearly price
    aboutPackage TEXT,                                 -- Description
    termsAndConditions TEXT,                           -- Terms & Conditions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Auto timestamp
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


--patient table

-- ============================
-- Patients Table (Main + Address)
-- ============================
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    lname VARCHAR(100),
    sname VARCHAR(100),
    abb VARCHAR(20),           -- e.g. s/o, d/o, w/o
    abbname VARCHAR(100),      -- e.g. Father's name
    gender ENUM('male', 'female', 'other') DEFAULT 'male',
    dob DATE,
    age INT,
    ocupation VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(150),
    photo VARCHAR(255),

    -- Address Info
    rstatus VARCHAR(50),       -- India Resident / NRI etc.
    raddress TEXT,
    rcity VARCHAR(100),
    rstate VARCHAR(100),
    rzipcode VARCHAR(20),
    paddress TEXT,
    pcity VARCHAR(100),
    pstate VARCHAR(100),
    pzipcode VARCHAR(20),
    idnum VARCHAR(100),
    addressTextProof VARCHAR(255),
    proofFile VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================
-- Caretakers (Many caretakers per patient)
-- ============================
CREATE TABLE caretakers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    name VARCHAR(100),
    relation VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================
-- Insurance Details
-- ============================
CREATE TABLE insurance_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    insuranceCompany VARCHAR(150),
    periodInsurance VARCHAR(100),
    sumInsured DECIMAL(12,2),
    policyFiles TEXT,               -- could store JSON or CSV file paths
    declinedCoverage TEXT,
    similarInsurances TEXT,
    package VARCHAR(50),            -- e.g. integral, prime, elite
    packageDetail TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ============================
-- Insurance Hospitals (List inside insurance)
-- ============================
CREATE TABLE insurance_hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insurance_id INT,
    hospitalName VARCHAR(150),
    hospitalAddress TEXT,
    FOREIGN KEY (insurance_id) REFERENCES insurance_details(id) ON DELETE CASCADE
);



-- QUESTIONS TABLE
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    question_code VARCHAR(10) NOT NULL,  -- q1, q2, q3
    answer ENUM('yes','no') DEFAULT 'no',
    details TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- HABITS TABLE (normalized like QUESTIONS)
CREATE TABLE habits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    habit_code VARCHAR(20) NOT NULL,   -- e.g., 'tobacco', 'smoking', 'alcohol', 'drugs'
    answer ENUM('yes','no') DEFAULT 'no',
    years INT DEFAULT NULL,           -- store tobaccoYears, smokingYears, etc.
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);


--dummy data for patients
-- ============================
-- Patients
-- ============================
INSERT INTO patients 
(name, lname, sname, abb, abbname, gender, dob, age, ocupation, phone, email, photo,
 rstatus, raddress, rcity, rstate, rzipcode, 
 paddress, pcity, pstate, pzipcode,
 idnum, addressTextProof, proofFile)
VALUES
('John', 'Doe', 'Smith', 's/o', 'Robert Doe', 'male', '1985-05-12', 39, 'Engineer', '9876543210',
 'john.doe@example.com', '/uploads/photos/john_doe.jpg',
 'Resident', '123 Residency Lane', 'Delhi', 'Delhi', '110001',
 '456 Permanent Lane', 'Mumbai', 'Maharashtra', '400001',
 'ID123456', 'Aadhar Card', '/uploads/proofs/john_doe_aadhar.pdf');

-- ============================
-- Caretakers (2 for same patient)
-- ============================
INSERT INTO caretakers (patient_id, name, relation, phone, email, address)
VALUES
(1, 'Jane Doe', 'Wife', '9876543211', 'jane.doe@example.com', '123 Residency Lane, Delhi'),
(1, 'Mike Doe', 'Brother', '9876543212', 'mike.doe@example.com', '456 Residency Lane, Delhi');

-- ============================
-- Insurance Details
-- ============================
INSERT INTO insurance_details 
(patient_id, insuranceCompany, periodInsurance, sumInsured, policyFiles, declinedCoverage, similarInsurances, package, packageDetail)
VALUES
(1, 'ICICI Insurance', '2020-2025', 500000.00, '/uploads/policies/policy1.pdf', 'None', 'LIC, HDFC', 'Prime', 'Covers hospitalization and critical illness');

-- ============================
-- Insurance Hospitals
-- ============================
INSERT INTO insurance_hospitals (insurance_id, hospitalName, hospitalAddress)
VALUES
(1, 'Apollo Hospital', 'Apollo Street, Delhi'),
(1, 'Fortis Hospital', 'Fortis Road, Mumbai');

-- ============================
-- Questions (q1, q2, q3)
-- ============================
INSERT INTO questions (patient_id, question_code, answer, details)
VALUES
(1, 'q1', 'yes', 'XYZ explanation for q1'),
(1, 'q2', 'no', NULL),
(1, 'q3', 'yes', 'Some explanation for q3');

-- ============================
-- Habits (alcohol, smoking)
-- ============================
INSERT INTO habits (patient_id, habit_code, answer, years)
VALUES
(1, 'alcohol', 'yes', 3),
(1, 'smoking', 'yes', 5);


