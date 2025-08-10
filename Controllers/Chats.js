const pool = require('../db');

//get all chat messages
exports.getAllChatMessages = async (req, res) => {
    try {
        // Get all chat messages using raw SQL with JOIN
        const [chatMessages] = await pool.execute(
            `SELECT cm.id, cm.user_id, cm.username, cm.created_at,
                    cme.id as entry_id, cme.message, cme.time
             FROM chat_messages cm
             LEFT JOIN chat_message_entries cme ON cm.id = cme.chat_message_id
             ORDER BY cm.id DESC, cme.time DESC`
        );
        
        // Group messages by chat_message_id
        const groupedMessages = chatMessages.reduce((acc, row) => {
            const chatMessageId = row.id;
            if (!acc[chatMessageId]) {
                acc[chatMessageId] = {
                    id: row.id,
                    user_id: row.user_id,
                    username: row.username,
                    created_at: row.created_at,
                    entries: []
                };
            }
            if (row.entry_id) {
                acc[chatMessageId].entries.push({
                    id: row.entry_id,
                    message: row.message,
                    time: row.time
                });
            }
            return acc;
        }, {});
        
        const result = Object.values(groupedMessages);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get private chat history between two users
exports.getPrivateChatHistory = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const otherUserId = req.params.userId;

        // Use JOIN to get messages directly without separate conversation query
        const [messages] = await pool.execute(
            `SELECT pm.*, pc.participant1, pc.participant2
             FROM private_messages pm
             JOIN private_conversations pc ON pm.conversation_id = pc.id
             WHERE ((pc.participant1 = ? AND pc.participant2 = ?) 
                    OR (pc.participant1 = ? AND pc.participant2 = ?))
             ORDER BY pm.time ASC`,
            [myUserId, otherUserId, otherUserId, myUserId]
        );

        // Transform to match expected format
        const formattedMessages = messages.map(msg => {
            let timeISO;
            if (msg.time instanceof Date) {
                timeISO = msg.time.toISOString();
            } else if (typeof msg.time === 'string') {
                // Handle MySQL datetime string format stored as UTC
                // Add 'Z' to indicate UTC and parse correctly
                timeISO = new Date(msg.time + 'Z').toISOString();
            } else {
                timeISO = new Date().toISOString();
            }
            
            return {
                from: msg.sender_id,
                to: msg.receiver_id,
                message: msg.message,
                time: timeISO,
                fileUrl: msg.file_url,
                fileType: msg.file_type,
                filename: msg.filename
            };
        });

        res.status(200).json(formattedMessages);
        console.log("Get private chat history Controller");
        console.log(formattedMessages);
    } catch (error) {
        console.error('Error fetching private chat history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Send/save a new private message
exports.sendPrivateMessage = async (req, res) => {
    try {
        const from = req.user.userId; // from auth middleware
        const { to, message, fileUrl, fileType, filename } = req.body;

        if (!to || (!message && !fileUrl)) {
            return res.status(400).json({ message: 'Recipient and message or file are required.' });
        }

        // Find or create conversation using raw SQL
        let [existingConv] = await pool.execute(
            `SELECT * FROM private_conversations 
             WHERE (participant1 = ? AND participant2 = ?) 
                OR (participant1 = ? AND participant2 = ?)`,
            [from, to, to, from]
        );

        let conversation;
        if (existingConv.length > 0) {
            conversation = existingConv[0];
        } else {
            // Create new conversation
            const [result] = await pool.execute(
                `INSERT INTO private_conversations (participant1, participant2) VALUES (?, ?)`,
                [from, to]
            );
            conversation = { id: result.insertId };
        }

        // Create the new message
        const currentTime = new Date();
        // Store UTC time in database for consistency
        const mysqlTime = currentTime.toISOString().slice(0, 19).replace('T', ' ');
        
        const [messageResult] = await pool.execute(
            `INSERT INTO private_messages (conversation_id, sender_id, receiver_id, message, time, file_url, file_type, filename) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [conversation.id, from, to, message || null, mysqlTime, fileUrl || null, fileType || null, filename || null]
        );

        // Return formatted message with ISO timestamp
        const formattedMessage = {
            from: from,
            to: to,
            message: message,
            time: currentTime.toISOString(),
            fileUrl: fileUrl,
            fileType: fileType,
            filename: filename
        };

        res.status(201).json(formattedMessage);
        console.log("Send private message Controller");
        console.log(conversation);
        console.log(formattedMessage);
    } catch (error) {
        console.error('Error sending private message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete a private message //only take userId 
//delete all messages of that userId
exports.deletePrivateMessage = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const otherUserId = req.params.userId;

        // Delete messages using JOIN to find the correct conversation
        const [result] = await pool.execute(
            `DELETE pm FROM private_messages pm
             JOIN private_conversations pc ON pm.conversation_id = pc.id
             WHERE ((pc.participant1 = ? AND pc.participant2 = ?) 
                    OR (pc.participant1 = ? AND pc.participant2 = ?))
             AND pm.sender_id = ?`,
            [myUserId, otherUserId, otherUserId, myUserId, otherUserId]
        );

        console.log("Delete private message Controller");
        res.status(200).json({ message: 'Messages deleted successfully.' });
    } catch (error) {
        console.error('Error deleting private message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all recent private chats for a user
exports.getRecentPrivateChats = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware

        // Use a complex JOIN query to get recent chats with last message in one query
        const [recentChats] = await pool.execute(
            `SELECT DISTINCT
                pc.id as conversation_id,
                CASE 
                    WHEN pc.participant1 = ? THEN pc.participant2 
                    ELSE pc.participant1 
                END as other_user_id,
                u.username,
                pm_last.message as last_message,
                pm_last.time as last_message_time
             FROM private_conversations pc
             LEFT JOIN users u ON u.user_id = CASE 
                    WHEN pc.participant1 = ? THEN pc.participant2 
                    ELSE pc.participant1 
                END
             LEFT JOIN private_messages pm_last ON pm_last.conversation_id = pc.id
                AND pm_last.time = (
                    SELECT MAX(time) FROM private_messages pm2 
                    WHERE pm2.conversation_id = pc.id
                )
             WHERE pc.participant1 = ? OR pc.participant2 = ?
             ORDER BY pm_last.time DESC`,
            [myUserId, myUserId, myUserId, myUserId]
        );

        // Format the results
        const formattedChats = recentChats.map(chat => ({
            userId: chat.other_user_id,
            username: chat.username || 'Unknown',
            lastMessage: chat.last_message || '',
            lastMessageTime: chat.last_message_time
        }));

        res.status(200).json(formattedChats);
    } catch (error) {
        console.error('Error fetching recent private chats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Upload private media file
exports.uploadPrivateMediaFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        // Return the file URL/path
        const fileUrl = `/uploads/private-media/${req.file.filename}`;
        res.status(201).json({ url: fileUrl, filename: req.file.originalname, fileType: req.file.mimetype });
    } catch (error) {
        console.error('Error uploading private media file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

