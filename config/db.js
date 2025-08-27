const mysql = require('mysql2');
require('dotenv').config();

// Database configuration with environment variables and fallbacks
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'soukya_system',
  port: process.env.DB_PORT || 3306,
  // Connection pool settings for better performance
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Export both callback and promise versions for compatibility
const db = pool; // Callback version
const dbPromise = pool.promise(); // Promise version

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please check your database configuration in .env file');
    console.error('Make sure MySQL server is running and credentials are correct');
    return;
  }
  
  console.log('✅ Database connected successfully');
  console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
  
  connection.release();
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed. Reconnecting...');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Closing database connections...');
  pool.end((err) => {
    if (err) {
      console.error('Error closing database connections:', err.message);
    } else {
      console.log('✅ Database connections closed successfully');
    }
    process.exit(0);
  });
});

// Export both versions
module.exports = db;
module.exports.promise = dbPromise;