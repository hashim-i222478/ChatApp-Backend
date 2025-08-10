const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Import WebSocket server if available
let wss = null;
try {
  wss = require('../wsServer');
} catch (err) {
  console.log('WebSocket server not available for broadcasting');
}

// Helper to generate a random 9-digit userId
function generateUserId() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

// Signup controller
exports.signup = async (req, res) => {
  try {
    const { username, pin } = req.body; // profilePic removed
    if (!username || !pin || !/^[0-9]{4}$/.test(pin)) {
      return res.status(400).json({ message: 'Username and 4-digit PIN are required.' });
    }
    
    // Check if username already exists
    const [existingUser] = await pool.execute(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Generate unique userId
    let userId;
    let userIdExists = true;
    while (userIdExists) {
      userId = generateUserId();
      const [userCheck] = await pool.execute(
        `SELECT * FROM users WHERE user_id = ?`,
        [userId]
      );
      userIdExists = userCheck.length > 0;
    }
    
    // Hash pin
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Create user using raw SQL
    await pool.execute(
      `INSERT INTO users (user_id, username, pin) VALUES (?, ?, ?)`,
      [userId, username, hashedPin]
    );
    
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Profile picture upload controller
exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = req.body.userId; // or get from auth if protected
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Find user to get previous profile picture
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );
    const user = userResult[0];
    
    if (user && user.profile_pic) {
      // Delete previous profile picture
      const prevPicPath = user.profile_pic;
      if (prevPicPath && prevPicPath.startsWith('/uploads/')) {
        const filename = prevPicPath.split('/').pop();
        const fullPath = path.join(__dirname, '..', 'uploads', filename);
        
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Deleted previous profile picture: ${fullPath}`);
          }
        } catch (deleteErr) {
          console.error('Error deleting previous profile picture:', deleteErr);
          // Continue even if delete fails
        }
      }
    }
    
    const profilePicUrl = `/uploads/${req.file.filename}`;
    await pool.execute(
      `UPDATE users SET profile_pic = ? WHERE user_id = ?`,
      [profilePicUrl, userId]
    );
    res.status(200).json({ message: 'Profile picture uploaded', profilePic: profilePicUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

 
// Login controller
exports.login = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ message: 'userId and PIN are required.' });
    }
    
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    
    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    
    // Create and assign token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, id: user.id },
      process.env.SECRET,
      { expiresIn: '3h' }
    );
    
    res.status(200).json({ 
      message: 'Login Success!', 
      token, 
      username: user.username, 
      userId: user.user_id 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//get User
exports.getuser = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [req.user.id]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    } else {
      res.status(200).json({
        userId: user.user_id,
        username: user.username
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.GetUserId = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [req.user.id]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.user_id
    });
  } catch(err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//fetch username from userId from url
exports.fetchUsername = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [req.params.userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//get a user by its userId
exports.getUserById = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [req.params.userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.user_id,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete user account
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated token
    
    // Get user details first to clean up profile picture
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Starting deletion process for user ID: ${user.user_id}`);

    // Delete profile picture file if exists
    if (user.profile_pic && user.profile_pic.startsWith('/uploads/')) {
      const filename = user.profile_pic.split('/').pop();
      const fullPath = path.join(__dirname, '..', 'uploads', filename);
      
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted profile picture: ${fullPath}`);
        }
      } catch (deleteErr) {
        console.error('Error deleting profile picture:', deleteErr);
        // Continue with user deletion even if file deletion fails
      }
    }

    // Delete from private messages (using correct table and column names)
    await pool.execute(
      `DELETE FROM private_messages WHERE sender_id = ? OR receiver_id = ?`,
      [user.user_id, user.user_id]
    );

    // Delete from private conversations where user is a participant
    await pool.execute(
      `DELETE FROM private_conversations WHERE participant1 = ? OR participant2 = ?`,
      [user.user_id, user.user_id]
    );

    // Get all users who have this user as a friend (for localStorage cleanup)
    const [affectedFriends] = await pool.execute(
      `SELECT DISTINCT freind_of as user_id FROM friends WHERE idofuser = ?`,
      [user.user_id]
    );

    // Delete from friends table (correct column names: idofuser and freind_of)
    await pool.execute(
      `DELETE FROM friends WHERE idofuser = ? OR freind_of = ?`,
      [user.user_id, user.user_id]
    );

    // Delete from pending deletes (correct table name)
    await pool.execute(
      `DELETE FROM pending_deletes WHERE user_id = ?`,
      [user.user_id]
    );

    // Finally delete the user
    await pool.execute(
      `DELETE FROM users WHERE id = ?`,
      [userId]
    );

    console.log(`User ${user.user_id} and all associated data deleted successfully`);

    // Broadcast account deletion to all connected WebSocket clients
    if (wss && wss.clients) {
      const deletionMessage = JSON.stringify({
        type: 'account-deleted',
        deletedUserId: user.user_id,
        message: `User ${user.user_id} has deleted their account`
      });

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(deletionMessage);
        }
      });
      console.log(`Broadcasted account deletion for ${user.user_id} to all connected clients`);
    }

    // Return success response with affected users for localStorage cleanup
    res.status(200).json({ 
      message: 'User account deleted successfully. All associated data has been removed.',
      deletedUserId: user.user_id,
      affectedUsers: affectedFriends.map(friend => friend.user_id) // Users who need localStorage cleanup
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all users for browsing
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, user_id, username, profile_pic FROM users ORDER BY username ASC`
    );
    
    res.status(200).json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};