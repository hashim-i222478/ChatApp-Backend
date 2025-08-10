const pool = require('../db');

// Add a friend to user's friends list
exports.addFriend = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const { friendUserId, alias } = req.body;

        if (!friendUserId) {
            return res.status(400).json({ message: 'Friend user ID is required' });
        }

        // Prevent adding yourself as a friend
        if (myUserId === friendUserId) {
            return res.status(400).json({ message: 'You cannot add yourself as a friend' });
        }

        // Check if the friend user exists and get their username
        const [friendUser] = await pool.execute(
            `SELECT user_id, username FROM users WHERE user_id = ?`,
            [friendUserId]
        );

        if (friendUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const friendUsername = friendUser[0].username;

        // Check if friendship already exists
        const [existingFriend] = await pool.execute(
            `SELECT * FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [friendUserId, myUserId]
        );

        if (existingFriend.length > 0) {
            return res.status(409).json({ message: 'User is already in your friends list' });
        }

        // Add friend to the list
        const [result] = await pool.execute(
            `INSERT INTO friends (idofuser, username, alias, freind_of) VALUES (?, ?, ?, ?)`,
            [friendUserId, friendUsername, alias || null, myUserId]
        );

        const newFriend = {
            id: result.insertId,
            idofuser: friendUserId,
            username: friendUsername,
            alias: alias || null,
            freind_of: myUserId
        };

        res.status(201).json({
            message: 'Friend added successfully',
            friend: newFriend
        });

        console.log(`User ${myUserId} added ${friendUsername} (${friendUserId}) as friend`);
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all friends of a user
exports.getFriends = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware

        const [friends] = await pool.execute(
            `SELECT f.id, f.idofuser, f.username, f.alias, f.created_at, u.profile_pic
             FROM friends f
             LEFT JOIN users u ON f.idofuser = u.user_id
             WHERE f.freind_of = ?
             ORDER BY f.username ASC`,
            [myUserId]
        );

        res.status(200).json(friends);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Remove a friend from user's friends list
exports.removeFriend = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const friendUserId = req.params.friendUserId;

        if (!friendUserId) {
            return res.status(400).json({ message: 'Friend user ID is required' });
        }

        // Check if friendship exists
        const [existingFriend] = await pool.execute(
            `SELECT * FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [friendUserId, myUserId]
        );

        if (existingFriend.length === 0) {
            return res.status(404).json({ message: 'Friend not found in your friends list' });
        }

        // Remove friend
        await pool.execute(
            `DELETE FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [friendUserId, myUserId]
        );

        res.status(200).json({ message: 'Friend removed successfully' });

        console.log(`User ${myUserId} removed friend ${friendUserId}`);
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update friend's alias
exports.updateFriendAlias = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const friendUserId = req.params.friendUserId;
        const { alias } = req.body;

        if (!friendUserId) {
            return res.status(400).json({ message: 'Friend user ID is required' });
        }

        // Check if friendship exists
        const [existingFriend] = await pool.execute(
            `SELECT * FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [friendUserId, myUserId]
        );

        if (existingFriend.length === 0) {
            return res.status(404).json({ message: 'Friend not found in your friends list' });
        }

        // Update alias
        await pool.execute(
            `UPDATE friends SET alias = ? WHERE idofuser = ? AND freind_of = ?`,
            [alias || null, friendUserId, myUserId]
        );

        res.status(200).json({ message: 'Friend alias updated successfully' });

        console.log(`User ${myUserId} updated alias for friend ${friendUserId} to "${alias}"`);
    } catch (error) {
        console.error('Error updating friend alias:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add friend from private conversation
exports.addFriendFromConversation = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const { participantUserId, alias } = req.body;

        if (!participantUserId) {
            return res.status(400).json({ message: 'Participant user ID is required' });
        }

        // Prevent adding yourself as a friend
        if (myUserId === participantUserId) {
            return res.status(400).json({ message: 'You cannot add yourself as a friend' });
        }

        // Check if there's an existing private conversation between users
        const [conversation] = await pool.execute(
            `SELECT * FROM private_conversations 
             WHERE (participant1 = ? AND participant2 = ?) 
                OR (participant1 = ? AND participant2 = ?)`,
            [myUserId, participantUserId, participantUserId, myUserId]
        );

        if (conversation.length === 0) {
            return res.status(400).json({ message: 'No conversation exists with this user' });
        }

        // Get participant's username
        const [participantUser] = await pool.execute(
            `SELECT user_id, username FROM users WHERE user_id = ?`,
            [participantUserId]
        );

        if (participantUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const participantUsername = participantUser[0].username;

        // Check if friendship already exists
        const [existingFriend] = await pool.execute(
            `SELECT * FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [participantUserId, myUserId]
        );

        if (existingFriend.length > 0) {
            return res.status(409).json({ message: 'User is already in your friends list' });
        }

        // Add friend to the list
        const [result] = await pool.execute(
            `INSERT INTO friends (idofuser, username, alias, freind_of) VALUES (?, ?, ?, ?)`,
            [participantUserId, participantUsername, alias || null, myUserId]
        );

        const newFriend = {
            id: result.insertId,
            idofuser: participantUserId,
            username: participantUsername,
            alias: alias || null,
            freind_of: myUserId
        };

        res.status(201).json({
            message: 'Friend added from conversation successfully',
            friend: newFriend
        });

        console.log(`User ${myUserId} added ${participantUsername} (${participantUserId}) as friend from conversation`);
    } catch (error) {
        console.error('Error adding friend from conversation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Search for users to add as friends (excluding current friends and self)
exports.searchUsers = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        // Search for users by username, excluding self and current friends
        const [users] = await pool.execute(
            `SELECT u.user_id, u.username, u.profile_pic 
             FROM users u
             WHERE u.username LIKE ? 
             AND u.user_id != ?
             AND u.user_id NOT IN (
                 SELECT f.idofuser FROM friends f WHERE f.freind_of = ?
             )
             LIMIT 10`,
            [`%${query}%`, myUserId, myUserId]
        );

        res.status(200).json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Check if a user is in friends list
exports.checkFriendship = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const { userId } = req.params;

        const [friendship] = await pool.execute(
            `SELECT * FROM friends WHERE idofuser = ? AND freind_of = ?`,
            [userId, myUserId]
        );

        res.status(200).json({
            isFriend: friendship.length > 0,
            friendship: friendship.length > 0 ? friendship[0] : null
        });
    } catch (error) {
        console.error('Error checking friendship:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update friend information when user profile changes
exports.updateFriendProfile = async (req, res) => {
    try {
        const { userId, username, profilePic } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Update username in friends table for all users who have this user as friend
        await pool.execute(
            `UPDATE friends SET username = ? WHERE idofuser = ?`,
            [username, userId]
        );

        console.log(`Updated friend profile for user ${userId} with username ${username}`);
        res.status(200).json({ message: 'Friend profiles updated successfully' });
    } catch (error) {
        console.error('Error updating friend profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

