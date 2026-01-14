/**
 * WebSocket Event Contracts: Game End & Leaderboard Feature
 *
 * This file defines NEW and MODIFIED events for the game end and leaderboard feature.
 * These will be merged into the main websocket-events.ts file.
 *
 * Feature: 003-game-end-leaderboard
 * Date: 2026-01-14
 */

// ============================================================================
// TYPES & ENUMS (MODIFIED)
// ============================================================================

/**
 * GameState enum - ADD ENDED state
 */
export enum GameState {
  WAITING = 'waiting',
  ACTIVE = 'active',
  SCORING = 'scoring',
  ENDED = 'ended',     // NEW: Game concluded, leaderboard displayed
}

/**
 * LeaderboardEntry - NEW
 * Represents a single player's ranking in the final leaderboard
 */
export interface LeaderboardEntry {
  playerId: string;      // Unique player identifier
  nickname: string;      // Player's display name
  score: number;         // Final score
  rank: number;          // Ranking (1-based, shared for ties)
  isTied: boolean;       // true if multiple players share this rank
}

/**
 * LeaderboardData - NEW
 * Container for complete leaderboard information
 */
export interface LeaderboardData {
  entries: LeaderboardEntry[];  // Sorted leaderboard entries (by rank, then name)
  totalPlayers: number;         // Total players in session
  timestamp: number;            // Unix timestamp when game ended
  sessionId: string;            // Join code (for reference)
}

/**
 * GameSession - MODIFIED
 * Add optional leaderboard field
 */
export interface GameSession {
  joinCode: string;
  players: Player[];
  gameState: GameState;                // Now includes ENDED
  currentQuestionNumber: number;
  createdAt: number;
  isActive: boolean;
  leaderboard: LeaderboardData | null; // NEW: Populated when gameState === ENDED
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
   * GM ends the game and displays leaderboard
   * @param joinCode - Session identifier
   * @param callback - Confirms game ended or returns error
   */
  'gm:endGame': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM starts a new game with same players (resets scores)
   * Only valid when gameState === ENDED
   * @param joinCode - Session identifier
   * @param callback - Confirms new game started or returns error
   */
  'gm:startNewGame': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  /**
   * GM closes the session completely (disconnects all, deletes session)
   * @param joinCode - Session identifier
   * @param callback - Confirms session closed or returns error
   */
  'gm:closeSession': (
    data: { joinCode: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  // ----------------------
  // MODIFIED: gm:endSession
  // ----------------------
  // NOTE: In the existing implementation, this event exists but may need to be
  // clarified vs gm:closeSession. Recommendation: Use gm:closeSession as the
  // primary session termination event, deprecate gm:endSession if redundant.
}

// ============================================================================
// SERVER → CLIENT EVENTS (NEW)
// ============================================================================

export interface ServerToClientEvents {
  // ... (existing events omitted for brevity)

  // ----------------------
  // NEW Game State Events
  // ----------------------

  /**
   * Game has ended, leaderboard is displayed
   * Sent to: All clients in session
   */
  'game:ended': (data: {
    joinCode: string;
    leaderboard: LeaderboardData;
    timestamp: number;
  }) => void;

  /**
   * GM started a new game (from ENDED state)
   * Sent to: All clients in session
   */
  'game:newGameStarted': (data: {
    joinCode: string;
    session: GameSession; // Session with reset scores, WAITING state
  }) => void;

  /**
   * Session was closed by GM (immediate shutdown)
   * Sent to: All clients in session (before disconnection)
   */
  'session:closed': (data: {
    joinCode: string;
    reason: string; // e.g., "Game master closed session"
  }) => void;
}

// ============================================================================
// ERROR CODES (MODIFIED)
// ============================================================================

export enum ErrorCode {
  // ... (existing error codes)

  // NEW: Game end errors
  GAME_ALREADY_ENDED = 'GAME_ALREADY_ENDED',
  CANNOT_START_NEW_GAME = 'CANNOT_START_NEW_GAME', // Not in ENDED state
}

// ============================================================================
// ERROR MESSAGES (MODIFIED)
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ... (existing error messages)

  [ErrorCode.GAME_ALREADY_ENDED]: 'Game has already ended.',
  [ErrorCode.CANNOT_START_NEW_GAME]: 'Cannot start new game - current game has not ended.',
};

// ============================================================================
// VALIDATION (UNCHANGED)
// ============================================================================

// Existing VALIDATION constants remain unchanged

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: GM ends the game
 */
// socket.emit('gm:endGame', { joinCode: 'ABC123' }, (response) => {
//   if (response.success) {
//     console.log('Game ended successfully');
//     // Expect 'game:ended' event with leaderboard data
//   }
// });

/**
 * Example: Player receives game ended event
 */
// socket.on('game:ended', ({ joinCode, leaderboard, timestamp }) => {
//   console.log('Game ended:', leaderboard);
//   // Display leaderboard UI
// });

/**
 * Example: GM starts new game
 */
// socket.emit('gm:startNewGame', { joinCode: 'ABC123' }, (response) => {
//   if (response.success) {
//     console.log('New game started');
//     // Expect 'game:newGameStarted' event
//   }
// });

/**
 * Example: GM closes session
 */
// socket.emit('gm:closeSession', { joinCode: 'ABC123' }, (response) => {
//   if (response.success) {
//     console.log('Session closed');
//     // Expect 'session:closed' event, then disconnect
//   }
// });
