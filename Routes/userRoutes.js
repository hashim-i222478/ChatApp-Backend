const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { signup, login, getuser, GetUserId, fetchUsername, getUserById, uploadProfilePic, deleteUser, getAllUsers } = require('../Controllers/ManageUsers');
const verifyToken = require('../Middlewares/authMiddleware');

// Set up storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Public routes
router.post('/register', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getuser);
router.get('/userId', verifyToken, GetUserId);
router.get('/username/:userId',verifyToken, fetchUsername);
router.get('/getUserById/:userId', verifyToken, getUserById);
router.get('/all', verifyToken, getAllUsers);
router.delete('/delete-account', verifyToken, deleteUser);

// Profile picture upload route
router.post('/upload-profile-pic', upload.single('profilePic'), uploadProfilePic);

module.exports = router;
