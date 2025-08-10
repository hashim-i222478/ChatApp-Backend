CREATE TABLE private_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant1 VARCHAR(50) NOT NULL,
  participant2 VARCHAR(50) NOT NULL
);

CREATE TABLE private_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  receiver_id VARCHAR(50) NOT NULL,
  message TEXT,
  time DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_url VARCHAR(255),
  file_type VARCHAR(50),
  filename VARCHAR(255),
  FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE
);
