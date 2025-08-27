# Patient Management System - Backend API

A robust and optimized Node.js backend API for managing patient information, habits, questions, insurance details, caretakers, and file uploads.

## 🚀 Features

- **Patient Management**: CRUD operations for patient information
- **Habits Tracking**: Update patient habits with validation
- **Questions Management**: Handle patient questionnaires
- **Insurance Details**: Manage insurance information and hospitals
- **Caretakers**: Track patient caretakers and relationships
- **File Management**: Upload and manage photos, policy files, and proof documents
- **Error Handling**: Comprehensive error handling to prevent server crashes
- **Input Validation**: Robust input validation and sanitization
- **Database Connection Pooling**: Optimized database connections
- **File Type Validation**: Secure file uploads with type checking

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=soukya_system
   DB_PORT=3306
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Secret
   SECRET=your_jwt_secret_key_here
   
   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=uploads
   ```

4. **Database Setup**
   
   Create the required database tables:
   ```sql
   -- Create database if not exists
   CREATE DATABASE IF NOT EXISTS soukya_system;
   USE soukya_system;
   
   -- Patients table
   CREATE TABLE patients (
     id INT PRIMARY KEY AUTO_INCREMENT,
     name VARCHAR(100) NOT NULL,
     lname VARCHAR(100) NOT NULL,
     sname VARCHAR(100),
     abb VARCHAR(10),
     abbname VARCHAR(100),
     gender ENUM('male', 'female', 'other'),
     dob DATE,
     age INT,
     ocupation VARCHAR(100),
     phone VARCHAR(20),
     email VARCHAR(100),
     rstatus VARCHAR(50),
     raddress TEXT,
     rcity VARCHAR(100),
     rstate VARCHAR(100),
     rzipcode VARCHAR(20),
     paddress TEXT,
     pcity VARCHAR(100),
     pstate VARCHAR(100),
     pzipcode VARCHAR(20),
     idnum VARCHAR(50),
     addressTextProof TEXT,
     photo VARCHAR(255),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   
   -- Habits table
   CREATE TABLE habits (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     habit_code VARCHAR(50) NOT NULL,
     answer ENUM('yes', 'no') NOT NULL,
     years INT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   
   -- Questions table
   CREATE TABLE questions (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     question_code VARCHAR(50) NOT NULL,
     answer ENUM('yes', 'no') NOT NULL,
     details TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   
   -- Insurance details table
   CREATE TABLE insurance_details (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     insuranceCompany VARCHAR(100),
     periodInsurance VARCHAR(100),
     sumInsured DECIMAL(15,2),
     policyFiles TEXT,
     declinedCoverage TEXT,
     similarInsurances TEXT,
     package VARCHAR(100),
     packageDetail TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   
   -- Insurance hospitals table
   CREATE TABLE insurance_hospitals (
     id INT PRIMARY KEY AUTO_INCREMENT,
     insurance_id INT NOT NULL,
     hospitalName VARCHAR(100),
     hospitalAddress TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (insurance_id) REFERENCES insurance_details(id) ON DELETE CASCADE
   );
   
   -- Caretakers table
   CREATE TABLE caretakers (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     name VARCHAR(100) NOT NULL,
     relation VARCHAR(100) NOT NULL,
     phone VARCHAR(20),
     email VARCHAR(100),
     address TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   
   -- Policy files table
   CREATE TABLE policy_files (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     file_path VARCHAR(500) NOT NULL,
     file_name VARCHAR(255) NOT NULL,
     uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   
   -- Proof files table
   CREATE TABLE proof_files (
     id INT PRIMARY KEY AUTO_INCREMENT,
     patient_id INT NOT NULL,
     file_path VARCHAR(500) NOT NULL,
     file_name VARCHAR(255) NOT NULL,
     uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
   );
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | soukya_system |
| `DB_PORT` | MySQL port | 3306 |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `SECRET` | JWT secret key | (required) |
| `MAX_FILE_SIZE` | Max file size in bytes | 10485760 (10MB) |
| `UPLOAD_PATH` | Upload directory | uploads |

### File Upload Configuration

- **Photos**: `uploads/images/{patient_name}/`
- **Policy Files**: `uploads/insurance/{patient_name}/`
- **Proof Files**: `uploads/files/{patient_name}/`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/patient-update
```

### Available Endpoints

#### 1. Update Habits
- **PUT** `/habits/{id}`
- **Body**: `[{ habit_code: 'tobacco', answer: 'yes', years: 5 }]`

#### 2. Update Questions
- **PUT** `/questions/{id}`
- **Body**: `{ q1: { answer: 'yes', details: 'text' } }`

#### 3. Update Insurance
- **PUT** `/insurance/{id}`
- **Body**: `{ insuranceCompany, periodInsurance, sumInsured, ... }`

#### 4. Update Caretakers
- **PUT** `/caretakers/{id}`
- **Body**: `{ caretakers: [{ name, relation, phone, email, address }] }`

#### 5. Update Photo
- **PUT** `/photo/{id}`
- **Body**: FormData with `photo` file

#### 6. File Management
- **POST** `/policy-file/{id}` - Upload policy file
- **DELETE** `/policy-file/{fileId}` - Delete policy file
- **POST** `/proof-file/{id}` - Upload proof file
- **DELETE** `/proof-file/{fileId}` - Delete proof file
- **GET** `/files/{id}` - Get all files

#### 7. Update Patient
- **PUT** `/patient/{id}`
- **Body**: Patient information fields

## 🛡️ Security Features

- **Input Validation**: All inputs are validated and sanitized
- **File Type Validation**: Only allowed file types can be uploaded
- **File Size Limits**: Configurable file size restrictions
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: No sensitive information leaked in errors

## 🔍 Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors
- **Graceful Degradation**: Server continues running even with errors
- **Detailed Logging**: All errors are logged for debugging

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js          # Database configuration
├── routes/
│   └── patient_update.js  # Patient update routes
├── uploads/            # File upload directory
├── .env               # Environment variables
├── package.json       # Dependencies
└── README.md          # This file
```

## 🚀 Performance Optimizations

- **Connection Pooling**: Efficient database connections
- **Async/Await**: Modern JavaScript for better performance
- **Concurrent Operations**: Parallel database queries where possible
- **File System Checks**: Efficient file operations
- **Memory Management**: Proper cleanup of resources

## 🧪 Testing

Test the API endpoints using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

## 📝 Logs

The application logs:
- Database connection status
- API requests and responses
- File upload operations
- Error details
- Performance metrics

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **File Upload Errors**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure valid file types

3. **Server Won't Start**
   - Check port availability
   - Verify all dependencies installed
   - Check `.env` file configuration

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=*
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Note**: Make sure to create the `.env` file with your actual database credentials before starting the server.

