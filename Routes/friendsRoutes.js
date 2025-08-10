const express = require('express');
const router = express.Router();
const friendsController = require('../Controllers/friends');
const verifyToken = require('../Middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all friends of authenticated user
router.get('/', friendsController.getFriends);

// Add a friend
router.post('/add', friendsController.addFriend);

// Add friend from private conversation
router.post('/add-from-conversation', friendsController.addFriendFromConversation);

// Remove a friend
router.delete('/remove/:friendUserId', friendsController.removeFriend);

// Update friend's alias
router.put('/alias/:friendUserId', friendsController.updateFriendAlias);

// Search for users to add as friends
router.get('/search', friendsController.searchUsers);

// Check if a user is a friend
router.get('/check/:userId', friendsController.checkFriendship);

// Update friend profile information (internal route for profile updates)
router.put('/update-profile', friendsController.updateFriendProfile);

module.exports = router;
