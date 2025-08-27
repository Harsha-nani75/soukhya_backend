# Complete API Documentation

## Base URL
`http://localhost:4865/api`

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [User Management APIs](#user-management-apis)
3. [Patient Management APIs](#patient-management-apis)
4. [Patient Update APIs](#patient-update-apis)
5. [Enquiry Management APIs](#enquiry-management-apis)
6. [Package Management APIs](#package-management-apis)

---

## Authentication APIs
**Base Path:** `/auth`

### 1. User Login
**POST** `/login`

**Description:** Authenticates user and returns JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

---

## User Management APIs
**Base Path:** `/user`

**Authentication Required:** All endpoints require JWT token in Authorization header: `Bearer <token>`

### 1. Get Admin Data
**GET** `/admin-data`

**Description:** Retrieves data accessible only to admin users

**Required Role:** `admin`

**Response:**
```json
{
  "message": "Admin data retrieved successfully",
  "data": { ... }
}
```

### 2. Get Supervisor Data
**GET** `/supervisor-data`

**Description:** Retrieves data accessible only to supervisor users

**Required Role:** `supervisor`

**Response:**
```json
{
  "message": "Supervisor data retrieved successfully",
  "data": { ... }
}
```

### 3. Get User Data
**GET** `/user-data`

**Description:** Retrieves data accessible to regular users and customers

**Required Role:** `user` or `customer`

**Response:**
```json
{
  "message": "User data retrieved successfully",
  "data": { ... }
}
```

### 4. Get User Profile
**GET** `/profile`

**Description:** Retrieves authenticated user's profile information

**Required Role:** Any authenticated user

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

---

## Patient Management APIs
**Base Path:** `/patients`

### 1. Health Check
**GET** `/health`

**Description:** Checks database connectivity and server health

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Database Schema Check
**GET** `/schema`

**Description:** Retrieves database table structures for debugging

**Response:**
```json
{
  "patients": [...],
  "caretakers": [...],
  "insurance_details": [...],
  "insurance_hospitals": [...],
  "questions": [...],
  "habits": [...]
}
```

### 3. Test Habits Table
**GET** `/test-habits/:id`

**Description:** Tests habits table connectivity and structure for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
{
  "message": "Habits table check completed",
  "tableExists": true,
  "structure": [...],
  "sampleData": [...],
  "patientId": 12
}
```

### 4. Get All Patients
**GET** `/`

**Description:** Retrieves list of all patients with basic information

**Response:**
```json
[
  {
    "id": 1,
    "name": "John",
    "lname": "Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "photo": "/uploads/photos/john_doe.jpg"
  }
]
```

### 5. Get Patient Caretakers
**GET** `/care/:id`

**Description:** Retrieves all caretakers for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
[
  {
    "id": 1,
    "patient_id": 1,
    "name": "Jane Doe",
    "relation": "Wife",
    "phone": "9876543211",
    "email": "jane.doe@example.com",
    "address": "123 Residency Lane, Delhi"
  }
]
```

### 6. Get Patient Habits
**GET** `/habits/:id`

**Description:** Retrieves all habits for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
[
  {
    "habit_code": "alcohol",
    "answer": "yes",
    "years": 3
  },
  {
    "habit_code": "smoking",
    "answer": "yes",
    "years": 5
  }
]
```

### 7. Get Patient Questions
**GET** `/questions/:id`

**Description:** Retrieves all questions for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
[
  {
    "question_code": "q1",
    "answer": "yes",
    "details": "XYZ explanation for q1"
  },
  {
    "question_code": "q2",
    "answer": "no",
    "details": null
  }
]
```

### 8. Get Insurance Hospitals
**GET** `/insuranceHospitals/:id`

**Description:** Retrieves insurance hospitals for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
[
  {
    "id": 1,
    "insurance_id": 1,
    "hospitalName": "Apollo Hospital",
    "hospitalAddress": "Apollo Street, Delhi"
  }
]
```

### 9. Get Insurance Details
**GET** `/insuranceDetails/:id`

**Description:** Retrieves insurance details for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
{
  "id": 1,
  "patient_id": 1,
  "insuranceCompany": "ICICI Insurance",
  "periodInsurance": "2020-2025",
  "sumInsured": 500000.00,
  "policyFiles": "/uploads/policies/policy1.pdf",
  "declinedCoverage": "None",
  "similarInsurances": "LIC, HDFC",
  "package": "Prime",
  "packageDetail": "Covers hospitalization and critical illness"
}
```

### 10. Get Single Patient
**GET** `/:id`

**Description:** Retrieves complete patient information including all related data

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
{
  "patient_id": 1,
  "name": "John",
  "lname": "Doe",
  "sname": "Smith",
  "abb": "s/o",
  "abbname": "Robert Doe",
  "gender": "male",
  "dob": "1985-05-12",
  "age": 39,
  "ocupation": "Engineer",
  "phone": "9876543210",
  "email": "john.doe@example.com",
  "photo": "/uploads/photos/john_doe.jpg",
  "rstatus": "Resident",
  "raddress": "123 Residency Lane",
  "rcity": "Delhi",
  "rstate": "Delhi",
  "rzipcode": "110001",
  "paddress": "456 Permanent Lane",
  "pcity": "Mumbai",
  "pstate": "Maharashtra",
  "pzipcode": "400001",
  "idnum": "ID123456",
  "addressTextProof": "Aadhar Card",
  "proofFile": "/uploads/proofs/john_doe_aadhar.pdf",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "caretakers": [...],
  "insurance": {...},
  "questions": [...],
  "habits": [...]
}
```

### 11. Create Patient
**POST** `/`

**Description:** Creates a new patient with all related data

**Request Body:** FormData with the following fields:
- `patient`: JSON string with patient basic information
- `careTaker`: JSON string with caretaker information (optional)
- `insurance`: JSON string with insurance information (optional)
- `insuranceHospitals`: JSON string with hospital information (optional)
- `questions`: JSON string with questions information (optional)
- `habits`: JSON string with habits information (optional)
- `photo`: Image file (optional)
- `proofFile`: Proof files (optional)
- `policyFiles`: Policy files (optional)

**Response:**
```json
{
  "patient_id": 1,
  "message": "Patient created successfully with all related data"
}
```

### 12. Delete Patient
**DELETE** `/:id`

**Description:** Deletes a patient and all related data including files

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
{
  "message": "Patient, related data, and files deleted successfully"
}
```

---

## Patient Update APIs
**Base Path:** `/patient-update`

### 1. Update Habits
**PUT** `/habits/:id`

**Description:** Updates habits for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:**
```json
[
  {
    "habit_code": "tobacco",
    "answer": "yes",
    "years": 5
  },
  {
    "habit_code": "smoking",
    "answer": "no",
    "years": null
  }
]
```

**Response:**
```json
{
  "message": "Habits updated successfully",
  "habits": [...]
}
```

### 2. Update Questions
**PUT** `/questions/:id`

**Description:** Updates questions for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:**
```json
{
  "q1": {
    "answer": "yes",
    "details": "text"
  },
  "q2": {
    "answer": "no",
    "details": ""
  },
  "q3": {
    "answer": "yes",
    "details": "additional information"
  }
}
```

**Response:**
```json
{
  "message": "Questions updated successfully",
  "questions": {...}
}
```

### 3. Update Insurance
**PUT** `/insurance/:id`

**Description:** Updates insurance details for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:**
```json
{
  "insuranceCompany": "ABC Insurance",
  "periodInsurance": "2024-2025",
  "sumInsured": 500000,
  "policyFiles": "file_paths",
  "declinedCoverage": "none",
  "similarInsurances": "previous policies",
  "package": "premium",
  "packageDetail": "comprehensive coverage",
  "hospitals": [
    {
      "hospitalName": "City Hospital",
      "hospitalAddress": "123 Main St"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Insurance details updated successfully",
  "insurance": {...},
  "insuranceId": 123
}
```

### 4. Update Caretakers
**PUT** `/caretakers/:id`

**Description:** Updates caretakers for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:**
```json
{
  "caretakers": [
    {
      "name": "John Doe",
      "relation": "spouse",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St, City, State"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Caretakers updated successfully",
  "caretakers": [...]
}
```

### 5. Update Photo
**PUT** `/photo/:id`

**Description:** Updates photo for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:** FormData with `photo` file field

**Response:**
```json
{
  "message": "Photo updated successfully",
  "photo": "file_path"
}
```

### 6. Upload Policy File
**POST** `/policy-file/:id`

**Description:** Uploads a policy file for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:** FormData with `policyFile` file field

**Response:**
```json
{
  "message": "Policy file uploaded successfully",
  "file": {
    "id": 123,
    "path": "file_path",
    "name": "original_filename.pdf"
  }
}
```

### 7. Delete Policy File
**DELETE** `/policy-file/:fileId`

**Description:** Deletes a specific policy file

**Parameters:**
- `fileId` (path): File ID

**Response:**
```json
{
  "message": "Policy file deleted successfully"
}
```

### 8. Upload Proof File
**POST** `/proof-file/:id`

**Description:** Uploads a proof file for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Request Body:** FormData with `proofFile` file field

**Response:**
```json
{
  "message": "Proof file uploaded successfully",
  "file": {
    "id": 456,
    "path": "file_path",
    "name": "original_filename.pdf"
  }
}
```

### 9. Delete Proof File
**DELETE** `/proof-file/:fileId`

**Description:** Deletes a specific proof file

**Parameters:**
- `fileId` (path): File ID

**Response:**
```json
{
  "message": "Proof file deleted successfully"
}
```

### 10. Get All Files
**GET** `/files/:id`

**Description:** Retrieves all files (policy and proof) for a specific patient

**Parameters:**
- `id` (path): Patient ID

**Response:**
```json
{
  "policyFiles": [
    {
      "id": 123,
      "patient_id": 1,
      "file_path": "file_path",
      "file_name": "filename.pdf",
      "uploaded_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "proofFiles": [
    {
      "id": 456,
      "patient_id": 1,
      "file_path": "file_path",
      "file_name": "filename.pdf",
      "uploaded_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 11. Update Patient Details
**PUT** `/patient/:id`

**Description:** Updates basic patient information (excluding photo and proof files)

**Parameters:**
- `id` (path): Patient ID

**Request Body:**
```json
{
  "name": "John",
  "lname": "Doe",
  "sname": "Smith",
  "abb": "JDS",
  "abbname": "John Doe Smith",
  "gender": "male",
  "dob": "1990-01-01",
  "age": 34,
  "ocupation": "Engineer",
  "phone": "+1234567890",
  "email": "john@example.com",
  "rstatus": "married",
  "raddress": "123 Main St",
  "rcity": "City",
  "rstate": "State",
  "rzipcode": "12345",
  "paddress": "123 Main St",
  "pcity": "City",
  "pstate": "State",
  "pzipcode": "12345",
  "idnum": "ID123456",
  "addressTextProof": "proof text"
}
```

**Response:**
```json
{
  "message": "Patient updated successfully"
}
```

---

## Enquiry Management APIs
**Base Path:** `/enquiry`

### 1. Get All Enquiries
**GET** `/`

**Description:** Retrieves all enquiries with optional filtering

**Query Parameters:**
- `resolved` (optional): Filter by resolved status (true/false)
- `serviceType` (optional): Filter by service type (elder care/medical tourism)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phoneNo": "9876543210",
    "address": null,
    "message": "Interested in medical tourism packages for cardiac treatment.",
    "serviceType": "medical tourism",
    "treatmentIssue": "Cardiac treatment",
    "createdDate": "2024-01-01T00:00:00.000Z",
    "resolved": false,
    "resolvedDate": null
  }
]
```

### 2. Create Enquiry
**POST** `/enquiries`

**Description:** Creates a new enquiry

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNo": "9876543210",
  "address": "123 Main St, City",
  "message": "Interested in your services",
  "serviceType": "elder care",
  "treatmentIssue": null
}
```

**Response:**
```json
{
  "message": "Enquiry created successfully",
  "enquiryId": 1
}
```

### 3. Send Contact Email
**POST** `/send-contact-email`

**Description:** Sends a contact form email

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "message": "I would like to know more about your services"
}
```

**Response:**
```json
{
  "message": "Contact email sent successfully"
}
```

---

## Package Management APIs
**Base Path:** `/package`

### 1. Create Package
**POST** `/`

**Description:** Creates a new package

**Request Body:**
```json
{
  "service": "Couples",
  "name": "Premium Care Package",
  "priceMonthly": 299.99,
  "priceYearly": 2999.99,
  "aboutPackage": "Comprehensive care package for couples",
  "termsAndConditions": "Standard terms apply"
}
```

**Response:**
```json
{
  "message": "Package created successfully",
  "packageId": 1
}
```

### 2. Get All Packages
**GET** `/`

**Description:** Retrieves all packages

**Response:**
```json
[
  {
    "id": 1,
    "service": "Couples",
    "name": "Premium Care Package",
    "priceMonthly": 299.99,
    "priceYearly": 2999.99,
    "aboutPackage": "Comprehensive care package for couples",
    "termsAndConditions": "Standard terms apply",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### 3. Get Package by ID
**GET** `/:id`

**Description:** Retrieves a specific package by ID

**Parameters:**
- `id` (path): Package ID

**Response:**
```json
{
  "id": 1,
  "service": "Couples",
  "name": "Premium Care Package",
  "priceMonthly": 299.99,
  "priceYearly": 2999.99,
  "aboutPackage": "Comprehensive care package for couples",
  "termsAndConditions": "Standard terms apply",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Update Package
**PUT** `/:id`

**Description:** Updates an existing package

**Parameters:**
- `id` (path): Package ID

**Request Body:**
```json
{
  "service": "Individuals",
  "name": "Updated Package Name",
  "priceMonthly": 199.99,
  "priceYearly": 1999.99,
  "aboutPackage": "Updated package description",
  "termsAndConditions": "Updated terms"
}
```

**Response:**
```json
{
  "message": "Package updated successfully"
}
```

### 5. Delete Package
**DELETE** `/:id`

**Description:** Deletes a package

**Parameters:**
- `id` (path): Package ID

**Response:**
```json
{
  "message": "Package deleted successfully"
}
```

---

## User Registration APIs
**Base Path:** `/register`

### 1. User Registration
**POST** `/register`

**Description:** Registers a new user and sends OTP

**Request Body:**
```json
{
  "name": "John Doe",
  "phnum": "9876543210",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email for OTP verification."
}
```

### 2. Verify OTP
**POST** `/verify-otp`

**Description:** Verifies OTP and activates user account

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully. Account activated."
}
```

### 3. Resend OTP
**POST** `/resend-otp`

**Description:** Resends OTP to user's email

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "OTP resent successfully"
}
```

### 4. Forgot Password
**POST** `/forgot-password`

**Description:** Initiates password reset process

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset OTP sent to your email"
}
```

### 5. Verify Forgot Password OTP
**POST** `/verify-forgot-otp`

**Description:** Verifies password reset OTP

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully. You can now reset your password."
}
```

### 6. Reset Password
**POST** `/reset-password`

**Description:** Resets user password after OTP verification

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

### 7. Resend Forgot Password OTP
**POST** `/resend-forgot-otp`

**Description:** Resends password reset OTP

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset OTP resent successfully"
}
```

---

## File Storage Structure

Files are organized in the following directory structure:
- **Photos:** `uploads/images/{patient_name}/`
- **Policy Files:** `uploads/insurance/{patient_name}/`
- **Proof Files:** `uploads/files/{patient_name}/`

## Error Handling

All APIs return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include an `error` field with a descriptive message.

## Database Tables

The following database tables are required:

### Core Tables
- `users` - User accounts and authentication
- `patients` - Basic patient information
- `caretakers` - Patient caretakers
- `insurance_details` - Insurance information
- `insurance_hospitals` - Insurance hospital details
- `questions` - Patient questions
- `habits` - Patient habits

### File Management Tables
- `policy_files` - Policy file metadata
- `proof_files` - Proof file metadata

### Business Tables
- `enquiries` - Customer enquiries
- `packages` - Service packages

## Authentication & Authorization

- **JWT Tokens:** Required for protected endpoints
- **Role-Based Access:** Different endpoints require different user roles
- **Token Format:** `Bearer <jwt_token>` in Authorization header

## Rate Limiting

- **OTP Requests:** Maximum 3 attempts per 2 minutes per email
- **File Uploads:** Maximum 10MB per file
- **General Requests:** No specific rate limiting applied

## File Upload Limits

- **Photo Files:** JPEG, JPG, PNG, GIF (max 10MB)
- **Policy Files:** PDF, DOC, DOCX (max 10MB)
- **Proof Files:** PDF, JPEG, JPG, PNG (max 10MB)
- **Maximum Files:** 10 files per request
