
const WebSocket = require('ws');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const wss = new WebSocket.Server({ 
  port: parseInt(process.env.WS_PORT) || 8081 
});

console.log(`WebSocket server running on port ${process.env.WS_PORT || 8081}`);

module.exports = wss; 