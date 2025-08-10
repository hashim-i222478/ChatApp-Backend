CREATE TABLE friends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idofuser VARCHAR(255) NOT NULL,        -- friend's user ID (matches users.user_id)
  username VARCHAR(50) NOT NULL,         -- friend's username
  alias VARCHAR(50),                     -- optional nickname
  freind_of VARCHAR(255) NOT NULL,       -- the user who owns this friend list (matches users.user_id)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (idofuser) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (freind_of) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_friendship (idofuser, freind_of) -- Prevent duplicate friendships
);
