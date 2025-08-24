# Patient Update API Documentation

This document describes the patient update endpoints that allow you to update specific parts of a patient's information.

## Base URL
```
http://localhost:4865/api/patient-update
```

## Endpoints

### 1. Update Patient Photo
**PUT** `/photo/:id`

Updates the photo for a specific patient.

**Parameters:**
- `id` (path parameter): Patient ID

**Request Body:**
- `photo` (file): Image file to upload

**Example Request:**
```javascript
const formData = new FormData();
formData.append('photo', fileInput.files[0]);

fetch('/api/patient-update/photo/1', {
  method: 'PUT',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "message": "Photo updated successfully",
  "photo": "uploads/images/John_1234567890.jpg"
}
```

### 2. Update Patient Habits
**PUT** `/habits/:id`

Updates the habits information for a specific patient.

**Parameters:**
- `id` (path parameter): Patient ID

**Request Body:**
```json
{
  "habits": {
    "tobacco": "yes",
    "tobaccoYears": 5,
    "smoking": "no",
    "alcohol": "yes",
    "alcoholYears": 3,
    "drugs": "no"
  }
}
```

**Alternative Array Format:**
```json
{
  "habits": [
    {
      "habit_code": "tobacco",
      "answer": "yes",
      "years": 5
    },
    {
      "habit_code": "alcohol",
      "answer": "yes",
      "years": 3
    }
  ]
}
```

**Example Request:**
```javascript
fetch('/api/patient-update/habits/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    habits: {
      tobacco: "yes",
      tobaccoYears: 5,
      smoking: "no",
      alcohol: "yes",
      alcoholYears: 3,
      drugs: "no"
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "message": "Habits updated successfully",
  "habits": [
    {
      "habit_code": "tobacco",
      "answer": "yes",
      "years": 5
    },
    {
      "habit_code": "alcohol",
      "answer": "yes",
      "years": 3
    }
  ]
}
```

### 3. Update Insurance Details
**PUT** `/insurance/:id`

Updates the insurance information for a specific patient.

**Parameters:**
- `id` (path parameter): Patient ID

**Request Body:**
```json
{
  "insurance": {
    "insuranceCompany": "ICICI Insurance",
    "periodInsurance": "2020-2025",
    "sumInsured": 500000.00,
    "policyFiles": "uploads/insurance/policy1.pdf",
    "declinedCoverage": "None",
    "similarInsurances": "LIC, HDFC",
    "package": "Prime",
    "packageDetail": "Covers hospitalization and critical illness",
    "hospitals": [
      {
        "hospitalName": "Apollo Hospital",
        "hospitalAddress": "Apollo Street, Delhi"
      },
      {
        "hospitalName": "Fortis Hospital",
        "hospitalAddress": "Fortis Road, Mumbai"
      }
    ]
  }
}
```

**Example Request:**
```javascript
fetch('/api/patient-update/insurance/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    insurance: {
      insuranceCompany: "ICICI Insurance",
      periodInsurance: "2020-2025",
      sumInsured: 500000.00,
      policyFiles: "uploads/insurance/policy1.pdf",
      declinedCoverage: "None",
      similarInsurances: "LIC, HDFC",
      package: "Prime",
      packageDetail: "Covers hospitalization and critical illness",
      hospitals: [
        {
          hospitalName: "Apollo Hospital",
          hospitalAddress: "Apollo Street, Delhi"
        }
      ]
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "message": "Insurance details updated successfully",
  "insurance": {
    "insuranceCompany": "ICICI Insurance",
    "periodInsurance": "2020-2025",
    "sumInsured": 500000.00,
    "policyFiles": "uploads/insurance/policy1.pdf",
    "declinedCoverage": "None",
    "similarInsurances": "LIC, HDFC",
    "package": "Prime",
    "packageDetail": "Covers hospitalization and critical illness",
    "hospitals": [
      {
        "hospitalName": "Apollo Hospital",
        "hospitalAddress": "Apollo Street, Delhi"
      }
    ]
  },
  "insuranceId": 1
}
```

### 4. Update Questions
**PUT** `/questions/:id`

Updates the questions information for a specific patient.

**Parameters:**
- `id` (path parameter): Patient ID

**Request Body:**
```json
{
  "questions": {
    "q1": {
      "answer": "yes",
      "details": "XYZ explanation for q1"
    },
    "q2": {
      "answer": "no"
    },
    "q3": {
      "answer": "yes",
      "details": "Some explanation for q3"
    }
  }
}
```

**Alternative Array Format:**
```json
{
  "questions": [
    {
      "question_code": "q1",
      "answer": "yes",
      "details": "XYZ explanation for q1"
    },
    {
      "question_code": "q2",
      "answer": "no",
      "details": ""
    }
  ]
}
```

**Example Request:**
```javascript
fetch('/api/patient-update/questions/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questions: {
      q1: {
        answer: "yes",
        details: "XYZ explanation for q1"
      },
      q2: {
        answer: "no"
      },
      q3: {
        answer: "yes",
        details: "Some explanation for q3"
      }
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "message": "Questions updated successfully",
  "questions": [
    {
      "question_code": "q1",
      "answer": "yes",
      "details": "XYZ explanation for q1"
    },
    {
      "question_code": "q2",
      "answer": "no",
      "details": ""
    },
    {
      "question_code": "q3",
      "answer": "yes",
      "details": "Some explanation for q3"
    }
  ]
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid data)
- `404` - Patient not found
- `500` - Server error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

## Notes

1. **Photo Upload**: Photos are stored in `uploads/images/{patient_name}/` directory
2. **Data Normalization**: The API accepts both object and array formats for habits and questions
3. **Cascading Updates**: Insurance updates also handle related hospital information
4. **File Paths**: All file paths are stored as relative paths in the database
5. **Validation**: Basic validation is performed on all inputs

## Frontend Integration

These endpoints are designed to work with the Angular service methods you provided:

```typescript
// Update photo for a patient
updatePhoto(id: number, formData: FormData): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/patient-update/photo/${id}`, formData);
}

// Update habits for a patient
updateHabits(id: number, habits: any): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/patient-update/habits/${id}`, { habits });
}

// Update insurance details for a patient
updateInsurance(id: number, insurance: any): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/patient-update/insurance/${id}`, { insurance });
}

// Update questions for a patient
updateQuestions(id: number, questions: any): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/patient-update/questions/${id}`, { questions });
}
```
