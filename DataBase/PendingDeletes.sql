CREATE TABLE pending_deletes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  chat_key VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pending_delete_timestamps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pending_delete_id INT NOT NULL,
  message_timestamp VARCHAR(100) NOT NULL,
  FOREIGN KEY (pending_delete_id) REFERENCES pending_deletes(id) ON DELETE CASCADE
);
