
const pool = require('../db');
const bcrypt = require('bcrypt');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.UpdateUserProfile = async (req, res) => {
    try {
      console.log('Update profile request received');
      console.log('Request body:', req.body);
      console.log('File upload:', req.file);
      
      const updates = {};
      const allowedUpdates = ['username', 'pin', 'profile_pic'];
      
      // Handle text-based updates
      allowedUpdates.forEach(field => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });
      
      // Handle profile picture file upload
      if (req.file) {
        console.log('Processing uploaded file:', req.file.filename);
        
        // Get current user to find the previous profile picture
        const [currentUserResult] = await pool.execute(
          `SELECT * FROM users WHERE id = ?`,
          [req.user.id]
        );
        const currentUser = currentUserResult[0];
        
        if (currentUser && currentUser.profile_pic) {
          // Extract filename from path
          const prevPicPath = currentUser.profile_pic;
          if (prevPicPath && prevPicPath.startsWith('/uploads/')) {
            const filename = prevPicPath.split('/').pop();
            const fullPath = path.join(__dirname, '..', 'uploads', filename);
            
            // Delete the previous profile picture
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
        
        updates.profile_pic = `/uploads/${req.file.filename}`;
      } else {
        console.log('No file was uploaded');
      }
  
      // If pin is being updated, hash it
      if (updates.pin) {
        updates.pin = await bcrypt.hash(updates.pin, 10);
      }

      // Update user using raw SQL
      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(req.user.id);
        
        await pool.execute(
          `UPDATE users SET ${setClause} WHERE id = ?`,
          values
        );
      }

      // Get the updated user data
      const [updatedUserResult] = await pool.execute(
        `SELECT * FROM users WHERE id = ?`,
        [req.user.id]
      );
      const updatedUser = updatedUserResult[0];
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Notify main server to broadcast profile update
      try {
        await axios.post('http://localhost:8080/api/internal/broadcastProfileUpdate', {
          userId: updatedUser.user_id,
          username: updatedUser.username,
          oldUsername: req.user.username
        });
      } catch (broadcastErr) {
        console.error('Failed to broadcast profile update:', broadcastErr.message);
      }

      // Update friend information in friends table
      try {
        await axios.put('http://localhost:8080/api/friends/update-profile', {
          userId: updatedUser.user_id,
          username: updatedUser.username,
          profilePic: updatedUser.profile_pic
        }, {
          headers: {
            'Authorization': req.headers.authorization
          }
        });
      } catch (friendUpdateErr) {
        console.error('Failed to update friend profiles:', friendUpdateErr.message);
      }
  
      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          userId: updatedUser.user_id,
          username: updatedUser.username,
          profilePic: updatedUser.profile_pic
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// In your controller (e.g., ManageUsers.js or profile.js)
exports.getProfilePic = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [req.params.userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ profilePic: user.profile_pic || '' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};