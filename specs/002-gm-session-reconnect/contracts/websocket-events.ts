/**
 * WebSocket Event Contracts: GM Session Reconnection Feature
 *
 * This file defines NEW and MODIFIED events for the GM session reconnection feature.
 * These will be merged into the main websocket-events.ts file.
 *
 * Feature: 002-gm-session-reconnect
 * Date: 2026-01-14
 */

// ============================================================================
// TYPES & INTERFACES (NEW)
// ============================================================================

/**
 * SessionMetadata - NEW
 * Lightweight structure for displaying session list to GM
 */
export interface SessionMetadata {
  joinCode: string;              // Session identifier (e.g., "ABC123")
  playerCount: number;           // Total players (including disconnected)
  connectedPlayerCount: number;  // Currently connected players
  createdAt: number;             // Unix timestamp (ms)
  lastActivity: number;          // Unix timestamp of last activity (ms)
  gameState: GameState;          // Current game state
  questionNumber: number;        // Current question number
}

/**
 * GMSessionListResponse - NEW
 * Response structure for gm:getActiveSessions event
 */
export interface GMSessionListResponse {
  sessions: SessionMetadata[];  // Array of sessions for this GM password
  totalCount: number;           // Number of sessions found
}

/**
 * GameSession - MODIFIED
 * Add gmPasswordHash field
 */
export interface GameSession {
  joinCode: string;
  players: Player[];
  gameState: GameState;
  currentQuestionNumber: number;
  createdAt: number;
  isActive: boolean;
  gmPasswordHash: string;        // NEW: bcrypt hash of GM password
  lastActivity: number;          // NEW (if not present): Unix timestamp of last action
}

// ============================================================================
// CLIENT → SERVER EVENTS (NEW/MODIFIED)
// ============================================================================

export interface ClientToServerEvents {
  // ... (existing events omitted for brevity)

  // ----------------------
  // NEW Game Master Events
  // ----------------------

  /**
   * GM requests list of all active sessions for their password
   * @param gmPassword - GM password (plaintext, hashed on server)
   * @param callback - Returns list of sessions or empty array
   */
  'gm:getActiveSessions': (
    data: { gmPassword: string },
    callback: (response: {
      success: boolean;
      sessions?: SessionMetadata[];
      totalCount?: number;
      error?: string;
    }) => void
  ) => void;

  /**
   * GM reconnects to an existing session by join code
   * @param joinCode - Session identifier
   * @param gmPassword - GM password for verification
   * @param callback - Returns full session data or error
   */
  'gm:reconnectToSession': (
    data: { joinCode: string; gmPassword: string },
    callback: (response: {
      success: boolean;
      session?: GameSession;
      error?: string;
    }) => void
  ) => void;

  // ----------------------
  // MODIFIED: gm:createSession
  // ----------------------

  /**
   * GM creates a new game session
   * MODIFIED: Also return full session data (not just joinCode)
   * @param gmPassword - Game master password
   * @param callback - Returns joinCode + session on success, or error
   */
  'gm:createSession': (
    data: { gmPassword: string },
    callback: (response: {
      success: boolean;
      joinCode?: string;
      session?: GameSession;  // NEW: Also return full session data
      error?: string;
    }) => void
  ) => void;
}

// ============================================================================
// SERVER → CLIENT EVENTS (NEW)
// ============================================================================

export interface ServerToClientEvents {
  // ... (existing events omitted for brevity)

  // ----------------------
  // NEW Session Events
  // ----------------------

  /**
   * GM reconnected to existing session
   * Sent to: All clients in session (optional notification)
   */
  'session:gmReconnected': (data: {
    joinCode: string;
    timestamp: number;
  }) => void;
}

// ============================================================================
// ERROR CODES (MODIFIED)
// ============================================================================

export enum ErrorCode {
  // ... (existing error codes)

  // NEW: Session reconnection errors
  SESSION_PASSWORD_MISMATCH = 'SESSION_PASSWORD_MISMATCH',
  NO_SESSIONS_FOUND = 'NO_SESSIONS_FOUND', // Informational, not strictly an error
}

// ============================================================================
// ERROR MESSAGES (MODIFIED)
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ... (existing error messages)

  [ErrorCode.SESSION_PASSWORD_MISMATCH]: 'Incorrect GM password for this session.',
  [ErrorCode.NO_SESSIONS_FOUND]: 'No active sessions found for this password.',
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: GM enters password and gets list of active sessions
 */
// socket.emit('gm:getActiveSessions', { gmPassword: 'secret123' }, (response) => {
//   if (response.success) {
//     console.log(`Found ${response.totalCount} sessions:`, response.sessions);
//     // Display session list UI for GM to select
//   }
// });

/**
 * Example 2: GM selects session from list and reconnects
 */
// socket.emit('gm:reconnectToSession', {
//   joinCode: 'ABC123',
//   gmPassword: 'secret123'
// }, (response) => {
//   if (response.success) {
//     console.log('Reconnected to session:', response.session);
//     // Display GM interface with full session state
//   } else {
//     console.error('Reconnection failed:', response.error);
//   }
// });

/**
 * Example 3: GM creates new session (modified to return session data)
 */
// socket.emit('gm:createSession', { gmPassword: 'secret123' }, (response) => {
//   if (response.success) {
//     console.log('Session created:', response.joinCode);
//     console.log('Session data:', response.session); // NEW: Full session object
//     // Directly transition to GM interface (no need for second call)
//   }
// });

/**
 * Example 4: Players receive notification when GM reconnects (optional)
 */
// socket.on('session:gmReconnected', ({ joinCode, timestamp }) => {
//   console.log('Game Master reconnected to session', joinCode);
//   // Optional: Show toast notification "Game Master is back!"
// });

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * Backend Implementation Checklist:
 *
 * 1. Password Hashing (utils/password-utils.ts):
 *    - hashPassword(password: string): Promise<string>
 *    - comparePassword(password: string, hash: string): Promise<boolean>
 *
 * 2. Session Manager (session-manager.ts):
 *    - Add gmPasswordHash field to GameSession
 *    - Add lastActivity field to GameSession
 *    - Implement getSessionsByPassword(password: string): Promise<SessionMetadata[]>
 *    - Update lastActivity on every session interaction
 *
 * 3. Event Handlers (event-handlers/gm-handlers.ts):
 *    - Handle gm:getActiveSessions
 *      - Hash password
 *      - Query sessions by password hash
 *      - Convert to SessionMetadata (exclude sensitive data)
 *      - Sort by lastActivity desc
 *      - Return list
 *    - Handle gm:reconnectToSession
 *      - Validate session exists
 *      - Verify password hash
 *      - Join socket to room
 *      - Update lastActivity
 *      - Broadcast gmReconnected (optional)
 *      - Return session data
 *    - Modify gm:createSession
 *      - Hash password
 *      - Create session with gmPasswordHash
 *      - Return joinCode + session data (not just joinCode)
 *
 * 4. Frontend Implementation:
 *    - Modify gamemaster/page.tsx:
 *      - After password entry, call gm:getActiveSessions
 *      - If sessions exist, show SessionSelector component
 *      - If no sessions, show "Create New Session" button
 *    - Create SessionSelector component:
 *      - Display list of SessionMetadata
 *      - Each session shows: joinCode, player count, state, timestamps
 *      - Click session → call gm:reconnectToSession
 *      - "Create New Session" button → call gm:createSession
 *    - Create SessionCard component:
 *      - Display single session metadata
 *      - Responsive design (mobile-first)
 *      - Human-readable timestamps ("5 minutes ago")
 */
