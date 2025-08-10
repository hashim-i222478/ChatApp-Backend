const express = require('express');
// const mongoose = require('mongoose'); // REMOVED
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { UpdateUserProfile, getProfilePic } = require('./Controllers/profile');
const verifyToken = require('./Middlewares/authMiddleware');
// MySQL connection using raw SQL (mysql2)
const pool = require('./db');

dotenv.config();

// Set up multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  console.log(`Creating uploads directory: ${uploadDir}`);
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Test MySQL connection using raw SQL
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('ProfileServer: Connected to MySQL database');
    connection.release();
  } catch (err) {
    console.error('ProfileServer: MySQL connection error:', err);
    process.exit(1);
  }
}

// Test connection on startup
testDatabaseConnection();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.put('/api/users/update', verifyToken, upload.single('profilePic'), UpdateUserProfile);
app.get('/api/users/profile-pic/:userId', verifyToken, getProfilePic);

// Debug endpoint to list files in uploads directory
app.get('/api/debug/uploads', (req, res) => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ 
        message: 'Error reading uploads directory', 
        error: err.message,
        path: uploadsDir
      });
    }
    
    res.json({ 
      files,
      uploadsPath: uploadsDir,
      count: files.length
    });
  });
});

const PORT = process.env.PROFILE_PORT || 5001;
app.listen(PORT, () => {
  console.log(`Profile update server running on port ${PORT}`);
}); 