/**
 * WebSocket Event Contracts: Trivia Buzzer App
 *
 * This file defines the typed contract between client and server using Socket.IO.
 * All events are strongly typed for compile-time safety.
 *
 * Usage:
 * - Server: io.on<ServerToClientEvents, ClientToServerEvents>(...)
 * - Client: socket.on<ClientToServerEvents, ServerToClientEvents>(...)
 */

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export enum GameState {
  WAITING = 'waiting',
  ACTIVE = 'active',
  SCORING = 'scoring',
  ENDED = 'ended',  // Feature 003: Game end state
}

export enum BuzzerSound {
  PARTY_HORN = 'party_horn',
  BURPS = 'burps',
  FARTS = 'farts',
  SCREAMS = 'screams',
  SNORE = 'snore',
  MOAN = 'moan',
}

export interface Player {
  playerId: string;
  nickname: string;
  score: number;
  buzzerSound: BuzzerSound;
  isConnected: boolean;
  lastBuzzTimestamp: number | null;
}

export interface GameSession {
  joinCode: string;
  players: Player[];
  gameState: GameState;
  currentQuestionNumber: number;
  createdAt: number;
  isActive: boolean;
  gmPasswordHash: string;    // Feature 002: bcrypt hash of GM password for session ownership
  lastActivity: number;       // Feature 002: Unix timestamp of last activity (ms)
  leaderboard: LeaderboardData | null;  // Feature 003: Final rankings when game ends
}

export interface BuzzerPress {
  playerId: string;
  playerName: string;
  timestamp: number;
  isFirst: boolean;
}

/**
 * LeaderboardEntry - Feature 003: Game End & Leaderboard
 * Represents a single player's final ranking
 */
export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;      // 1-based ranking (shared for ties)
  isTied: boolean;   // True if this rank is shared with other players
}

/**
 * LeaderboardData - Feature 003: Game End & Leaderboard
 * Complete leaderboard with metadata
 */
export interface LeaderboardData {
  entries: LeaderboardEntry[];  // Sorted by rank ascending
  totalPlayers: number;
  timestamp: number;            // When leaderboard was calculated
  sessionId: string;            // Join code for reference
}

/**
 * SessionMetadata - Feature 002: GM Session Reconnection
 * Lightweight structure for displaying session list to GM
 * Excludes sensitive data like password hashes
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
 * GMSessionListResponse - Feature 002: GM Session Reconnection
 * Response structure for gm:getActiveSessions event
 */
export interface GMSessionListResponse {
  sessions: SessionMetadata[];  // Array of sessions for this GM password
  totalCount: number;           // Number of sessions found
}

// ============================================================================
// CLIENT → SERVER EVENTS
// ============================================================================

export interface ClientToServerEvents {
  // ----------------------
  // Game Master Events
  // ----------------------

  /**
   * GM creates a new game session
   * @param gmPassword - Game master password from environment
   * @param callback - Returns joinCode and session data on success, or error
   * Feature 002: Modified to return full session data (not just joinCode)
   */
  'gm:createSession': (
    data: { gmPassword: string },
    callback: (response: { success: boolean; joinCode?: string; session?: GameSession; error?: string }) => void
  ) => void;

  /**
   * GM starts a new question (transitions to ACTIVE state)
   * @param joinCode - Session identifier
   * @param callback - Confirms transition or returns error
   */
  'gm:startQuestion': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM transitions to scoring (requires at least 1 buzzer press)
   * @param joinCode - Session identifier
   * @param callback - Confirms transition or returns error
   */
  'gm:moveToScoring': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM skips current question without scoring (back to WAITING)
   * @param joinCode - Session identifier
   * @param callback - Confirms transition or returns error
   */
  'gm:skipQuestion': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM assigns points to a player (positive or negative)
   * @param joinCode - Session identifier
   * @param playerId - Target player
   * @param points - Points to add (can be negative)
   * @param callback - Confirms score update or returns error
   */
  'gm:assignPoints': (
    data: { joinCode: string; playerId: string; points: number },
    callback: (response: { success: boolean; newScore?: number; error?: string }) => void
  ) => void;

  /**
   * GM ends current question (completes scoring phase, returns to WAITING)
   * @param joinCode - Session identifier
   * @param callback - Confirms transition or returns error
   */
  'gm:endQuestion': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM ends the game (Feature 003: Game End & Leaderboard)
   * Transitions to ENDED state, calculates leaderboard, keeps session active
   * @param joinCode - Session identifier
   * @param callback - Returns leaderboard data on success, or error
   */
  'gm:endGame': (
    data: { joinCode: string },
    callback: (response: { success: boolean; leaderboard?: LeaderboardData; error?: string }) => void
  ) => void;

  /**
   * GM ends the game session (completely closes session)
   * @param joinCode - Session identifier
   * @param callback - Confirms session ended or returns error
   */
  'gm:endSession': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM requests list of all active sessions for their password (Feature 002)
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
   * GM reconnects to an existing session by join code (Feature 002)
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
  // Player Events
  // ----------------------

  /**
   * Player joins a session
   * @param joinCode - Session to join
   * @param nickname - Player's display name (1-20 chars, alphanumeric + spaces)
   * @param password - Personal password for reconnection (4-20 chars)
   * @param callback - Returns player data on success, or error
   */
  'player:join': (
    data: { joinCode: string; nickname: string; password: string },
    callback: (response: {
      success: boolean;
      player?: Player;
      session?: GameSession;
      error?: string;
    }) => void
  ) => void;

  /**
   * Player rejoins after disconnect (reconnection)
   * @param joinCode - Session to rejoin
   * @param nickname - Player's nickname
   * @param password - Player's password
   * @param callback - Returns restored player data on success, or error
   */
  'player:rejoin': (
    data: { joinCode: string; nickname: string; password: string },
    callback: (response: {
      success: boolean;
      player?: Player;
      session?: GameSession;
      error?: string;
    }) => void
  ) => void;

  /**
   * Player presses buzzer (only works in ACTIVE state)
   * @param joinCode - Session identifier
   * @param playerId - Player pressing buzzer
   * @param callback - Confirms buzzer press or returns error
   */
  'player:pressBuzzer': (
    data: { joinCode: string; playerId: string },
    callback: (response: { success: boolean; timestamp?: number; error?: string }) => void
  ) => void;

  /**
   * Player changes buzzer sound
   * @param joinCode - Session identifier
   * @param playerId - Player changing sound
   * @param buzzerSound - New buzzer sound selection
   * @param callback - Confirms sound change or returns error
   */
  'player:changeBuzzerSound': (
    data: { joinCode: string; playerId: string; buzzerSound: BuzzerSound },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
}

// ============================================================================
// SERVER → CLIENT EVENTS
// ============================================================================

export interface ServerToClientEvents {
  // ----------------------
  // Session Events
  // ----------------------

  /**
   * Session was created successfully
   * Sent to: GM who created it
   */
  'session:created': (data: { joinCode: string; session: GameSession }) => void;

  /**
   * Session state changed (state transition, player joined, etc.)
   * Sent to: All clients in session
   */
  'session:updated': (data: { session: GameSession }) => void;

  /**
   * Session ended by GM
   * Sent to: All clients in session
   */
  'session:ended': (data: { joinCode: string; reason: string }) => void;

  /**
   * GM reconnected to existing session (Feature 002)
   * Sent to: All clients in session (optional notification)
   */
  'session:gmReconnected': (data: {
    joinCode: string;
    timestamp: number;
  }) => void;

  // ----------------------
  // Player Events
  // ----------------------

  /**
   * A player successfully joined the session
   * Sent to: All clients in session
   */
  'player:joined': (data: { player: Player }) => void;

  /**
   * A player reconnected after disconnect
   * Sent to: All clients in session
   */
  'player:reconnected': (data: { player: Player }) => void;

  /**
   * A player disconnected (network issue, closed tab, etc.)
   * Sent to: All clients in session
   */
  'player:disconnected': (data: { playerId: string; playerName: string }) => void;

  /**
   * A player's score was updated
   * Sent to: All clients in session
   */
  'player:scoreUpdated': (data: { playerId: string; newScore: number; pointsAdded: number }) => void;

  /**
   * A player changed their buzzer sound
   * Sent to: All clients in session (for awareness)
   */
  'player:buzzerSoundChanged': (data: { playerId: string; newSound: BuzzerSound }) => void;

  // ----------------------
  // Game State Events
  // ----------------------

  /**
   * Game state transitioned (waiting → active → scoring → waiting)
   * Sent to: All clients in session
   */
  'game:stateChanged': (data: {
    joinCode: string;
    newState: GameState;
    questionNumber: number;
  }) => void;

  /**
   * GM started a new question (state → ACTIVE)
   * Sent to: All clients in session
   */
  'game:questionStarted': (data: { questionNumber: number }) => void;

  /**
   * GM moved to scoring phase (state → SCORING)
   * Sent to: All clients in session
   */
  'game:scoringStarted': (data: { questionNumber: number }) => void;

  /**
   * GM skipped the current question (state → WAITING)
   * Sent to: All clients in session
   */
  'game:questionSkipped': (data: { questionNumber: number }) => void;

  /**
   * GM ended the current question (completes scoring, state → WAITING)
   * Sent to: All clients in session
   */
  'game:questionEnded': (data: { questionNumber: number }) => void;

  /**
   * GM ended the game (Feature 003: Game End & Leaderboard)
   * Sent to: All clients in session
   */
  'game:ended': (data: {
    joinCode: string;
    leaderboard: LeaderboardData;
  }) => void;

  // ----------------------
  // Buzzer Events
  // ----------------------

  /**
   * A player pressed their buzzer
   * Sent to: All clients in session
   */
  'buzzer:pressed': (data: BuzzerPress) => void;

  /**
   * First buzzer press identified
   * Sent to: All clients in session
   */
  'buzzer:first': (data: {
    playerId: string;
    playerName: string;
    timestamp: number;
  }) => void;

  /**
   * All buzzer presses for current question (for display)
   * Sent to: All clients in session (after scoring begins)
   */
  'buzzer:allPresses': (data: { presses: BuzzerPress[] }) => void;

  // ----------------------
  // Error Events
  // ----------------------

  /**
   * General error event (validation failures, etc.)
   * Sent to: Individual client that caused error
   */
  'error': (data: { message: string; code: string }) => void;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_FULL = 'SESSION_FULL',
  SESSION_INACTIVE = 'SESSION_INACTIVE',
  INVALID_JOIN_CODE = 'INVALID_JOIN_CODE',

  // Player errors
  NICKNAME_TAKEN = 'NICKNAME_TAKEN',
  INVALID_NICKNAME = 'INVALID_NICKNAME',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  PLAYER_NOT_CONNECTED = 'PLAYER_NOT_CONNECTED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  // Game state errors
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  BUZZER_DISABLED = 'BUZZER_DISABLED',
  NO_BUZZER_PRESSES = 'NO_BUZZER_PRESSES',
  ALREADY_BUZZED = 'ALREADY_BUZZED',

  // GM errors
  INVALID_GM_PASSWORD = 'INVALID_GM_PASSWORD',
  GM_ONLY_ACTION = 'GM_ONLY_ACTION',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Feature 002: GM Session Reconnection errors
  SESSION_PASSWORD_MISMATCH = 'SESSION_PASSWORD_MISMATCH',
  NO_SESSIONS_FOUND = 'NO_SESSIONS_FOUND',

  // Feature 003: Game End & Leaderboard errors
  GAME_ALREADY_ENDED = 'GAME_ALREADY_ENDED',
  CANNOT_START_NEW_GAME = 'CANNOT_START_NEW_GAME',
}

// ============================================================================
// HELPER TYPES FOR VALIDATION
// ============================================================================

/**
 * Validation constraints for player data
 */
export const VALIDATION = {
  NICKNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9\s]+$/, // Alphanumeric + spaces only
  },
  PASSWORD: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 20,
  },
  SESSION: {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 5,
    JOIN_CODE_LENGTH: 6,
    JOIN_CODE_PATTERN: /^[A-Z2-9]{6}$/, // Uppercase letters + numbers, excluding confusing chars
  },
  SCORE: {
    MIN_POINTS: -1000, // Reasonable lower bound
    MAX_POINTS: 1000,  // Reasonable upper bound
  },
} as const;

/**
 * Human-readable error messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SESSION_NOT_FOUND]: 'Game session not found. Please check the join code.',
  [ErrorCode.SESSION_FULL]: 'This session is full (maximum 5 players).',
  [ErrorCode.SESSION_INACTIVE]: 'This session has ended.',
  [ErrorCode.INVALID_JOIN_CODE]: 'Invalid join code format.',

  [ErrorCode.NICKNAME_TAKEN]: 'This nickname is already taken in this session.',
  [ErrorCode.INVALID_NICKNAME]: 'Nickname must be 1-20 characters, alphanumeric only.',
  [ErrorCode.INVALID_PASSWORD]: 'Password must be 4-20 characters.',
  [ErrorCode.PLAYER_NOT_FOUND]: 'Player not found in this session.',
  [ErrorCode.PLAYER_NOT_CONNECTED]: 'You are not connected to this session.',
  [ErrorCode.AUTHENTICATION_FAILED]: 'Incorrect nickname or password.',

  [ErrorCode.INVALID_STATE_TRANSITION]: 'Cannot perform this action in the current game state.',
  [ErrorCode.BUZZER_DISABLED]: 'Buzzer is disabled. Wait for the next question.',
  [ErrorCode.NO_BUZZER_PRESSES]: 'Cannot move to scoring - at least one player must buzz.',
  [ErrorCode.ALREADY_BUZZED]: 'You have already buzzed for this question.',

  [ErrorCode.INVALID_GM_PASSWORD]: 'Invalid game master password.',
  [ErrorCode.GM_ONLY_ACTION]: 'Only the game master can perform this action.',

  [ErrorCode.INVALID_INPUT]: 'Invalid input data.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing.',

  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down.',

  // Feature 002: GM Session Reconnection errors
  [ErrorCode.SESSION_PASSWORD_MISMATCH]: 'Incorrect GM password for this session.',
  [ErrorCode.NO_SESSIONS_FOUND]: 'No active sessions found for this password.',

  // Feature 003: Game End & Leaderboard errors
  [ErrorCode.GAME_ALREADY_ENDED]: 'Game has already ended.',
  [ErrorCode.CANNOT_START_NEW_GAME]: 'Cannot start new game - current game must be ended first.',
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidGameState(state: string): state is GameState {
  return Object.values(GameState).includes(state as GameState);
}

export function isValidBuzzerSound(sound: string): sound is BuzzerSound {
  return Object.values(BuzzerSound).includes(sound as BuzzerSound);
}

export function isValidJoinCode(code: string): boolean {
  return VALIDATION.SESSION.JOIN_CODE_PATTERN.test(code);
}

export function isValidNickname(nickname: string): boolean {
  return (
    nickname.length >= VALIDATION.NICKNAME.MIN_LENGTH &&
    nickname.length <= VALIDATION.NICKNAME.MAX_LENGTH &&
    VALIDATION.NICKNAME.PATTERN.test(nickname)
  );
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= VALIDATION.PASSWORD.MIN_LENGTH &&
    password.length <= VALIDATION.PASSWORD.MAX_LENGTH
  );
}
