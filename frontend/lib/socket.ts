import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from './websocket-events';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

/**
 * Create Socket.IO client instance
 * This is a singleton that will be reused across the app
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(WS_URL, {
  autoConnect: false, // We'll connect manually when needed
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

/**
 * Connect to the server
 */
export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Disconnect from the server
 */
export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket.connected;
}
