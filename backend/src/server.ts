import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClientToServerEvents, ServerToClientEvents } from './types/websocket-events.js';

// Get directory paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Initialize Socket.IO with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
});

// Import event handlers
import {
  handleCreateSession,
  handleEndSession,
  handleStartQuestion,
  handleMoveToScoring,
  handleSkipQuestion,
  handleAssignPoints
} from './event-handlers/gm-handlers.js';
import {
  handlePlayerJoin,
  handlePlayerRejoin,
  handlePlayerDisconnect,
  handlePressBuzzer,
  handleChangeBuzzerSound
} from './event-handlers/player-handlers.js';

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // GM event handlers
  socket.on('gm:createSession', (data, callback) => {
    handleCreateSession(socket, data, callback);
  });

  socket.on('gm:endSession', (data, callback) => {
    handleEndSession(socket, data, callback);
  });

  socket.on('gm:startQuestion', (data, callback) => {
    handleStartQuestion(socket, data, callback);
  });

  socket.on('gm:moveToScoring', (data, callback) => {
    handleMoveToScoring(socket, data, callback);
  });

  socket.on('gm:skipQuestion', (data, callback) => {
    handleSkipQuestion(socket, data, callback);
  });

  socket.on('gm:assignPoints', (data, callback) => {
    handleAssignPoints(socket, data, callback);
  });

  // Player event handlers
  socket.on('player:join', (data, callback) => {
    handlePlayerJoin(socket, data, callback);
  });

  socket.on('player:rejoin', (data, callback) => {
    handlePlayerRejoin(socket, data, callback);
  });

  socket.on('player:pressBuzzer', (data, callback) => {
    handlePressBuzzer(socket, data, callback);
  });

  socket.on('player:changeBuzzerSound', (data, callback) => {
    handleChangeBuzzerSound(socket, data, callback);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    handlePlayerDisconnect(socket);
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3001');

httpServer.listen(PORT, () => {
  console.log(`[Server] Backend server running on port ${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
  console.log(`[Server] WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, closing HTTP server...');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
  });
});

// Export for use in event handlers
export { io, httpServer };
