const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getAllChatMessages, getPrivateChatHistory, sendPrivateMessage, deletePrivateMessage, getRecentPrivateChats, uploadPrivateMediaFile } = require('../Controllers/Chats');
const verifyToken = require('../Middlewares/authMiddleware');

// Multer storage for private media
const privateMediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/private-media'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const uploadPrivateMedia = multer({ storage: privateMediaStorage });

// Private chat
router.get('/private-messages/:userId', verifyToken, getPrivateChatHistory);
router.post('/private-messages/send', verifyToken, sendPrivateMessage);
router.delete('/private-messages/:userId', verifyToken, deletePrivateMessage);
router.post('/private-messages/upload', verifyToken, uploadPrivateMedia.single('file'), uploadPrivateMediaFile);
router.get('/getAllChatMessages', verifyToken, getAllChatMessages);
router.get('/recent-private-chats', verifyToken, getRecentPrivateChats);

module.exports = router;