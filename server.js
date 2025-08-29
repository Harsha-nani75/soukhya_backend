const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const registerRoutes = require('./routes/register');
const enquiryRoutes = require('./routes/enquiry');
const packageRoutes = require('./routes/package');
const patientRoutes = require('./routes/patient');
const patientUpdateRoutes = require('./routes/patient_update');
const diseasesRoutes = require('./routes/diseases');
const app = express();
const path = require("path");

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Middleware
app.use(cors());
app.use(cors({origin: "http://localhost:4200"}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/package', packageRoutes);
app.use('/api/diseases', diseasesRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patient-update', patientUpdateRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 4865;

// Start server with database connection check
const startServer = async () => {
  try {
    // Test database connection
    await new Promise((resolve, reject) => {
      db.getConnection((err, connection) => {
        if (err) {
          console.error('❌ Database connection failed:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ Database connected successfully');
        console.log(`📊 Database: ${process.env.DB_NAME || 'soukya_system'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
        
        connection.release();
        resolve();
      });
    });

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running on port http://localhost:${port}`);
      console.log(`📁 File uploads available at http://localhost:${port}/uploads`);
      console.log(`🔍 Health check: http://localhost:${port}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();

