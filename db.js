const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration for Aiven MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'chatapp',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Add SSL configuration for Aiven
if (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com')) {
  console.log('Configuring SSL for Aiven MySQL...');
  dbConfig.ssl = {
    rejectUnauthorized: false, // Allow self-signed certificates
  };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;

