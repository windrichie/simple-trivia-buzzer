import { GameSession, createGameSession, updateSessionActivity } from './models/session.js';
import { SessionMetadata } from './types/websocket-events.js';
import { comparePassword } from './utils/password-utils.js';

// Cleanup runs every 10 minutes
const CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL || '600000');
// Sessions inactive for > 2 hours are removed
const INACTIVE_THRESHOLD = parseInt(process.env.SESSION_INACTIVE_THRESHOLD || '7200000');

export class SessionStore {
  private sessions: Map<string, GameSession>;
  private cleanupTimer: NodeJS.Timeout | null;

  constructor() {
    this.sessions = new Map();
    this.cleanupTimer = null;
    this.startCleanupInterval();
  }

  /**
   * Create a new game session
   * @param joinCode - Unique session identifier
   * @param gmPasswordHash - Bcrypt hash of GM password (for ownership verification)
   */
  createSession(joinCode: string, gmPasswordHash: string): GameSession {
    const session = createGameSession(joinCode, gmPasswordHash);
    this.sessions.set(joinCode, session);
    return session;
  }

  /**
   * Get a session by join code
   */
  getSession(joinCode: string): GameSession | undefined {
    return this.sessions.get(joinCode);
  }

  /**
   * Delete a session
   */
  deleteSession(joinCode: string): boolean {
    return this.sessions.delete(joinCode);
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(joinCode: string): void {
    const session = this.sessions.get(joinCode);
    if (session) {
      updateSessionActivity(session);
    }
  }

  /**
   * Check if join code already exists
   */
  hasSession(joinCode: string): boolean {
    return this.sessions.has(joinCode);
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   */
  getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count (for monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all sessions for a specific GM password (Feature 002)
   * @param gmPassword - Plaintext GM password to verify against session hashes
   * @returns Array of SessionMetadata for sessions matching the password
   */
  async getSessionsByPassword(gmPassword: string): Promise<SessionMetadata[]> {
    const matchingSessions: SessionMetadata[] = [];

    for (const session of this.sessions.values()) {
      // Compare password with stored hash
      const isMatch = await comparePassword(gmPassword, session.gmPasswordHash);

      if (isMatch) {
        matchingSessions.push(toSessionMetadata(session));
      }
    }

    // Sort by lastActivity descending (most recent first)
    matchingSessions.sort((a, b) => b.lastActivity - a.lastActivity);

    return matchingSessions;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveSessions();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Clean up inactive sessions
   * Removes sessions that have been inactive for > INACTIVE_THRESHOLD
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    for (const [joinCode, session] of this.sessions) {
      const inactiveTime = now - session.lastActivity;

      if (inactiveTime > INACTIVE_THRESHOLD || !session.isActive) {
        sessionsToDelete.push(joinCode);
      }
    }

    for (const joinCode of sessionsToDelete) {
      this.sessions.delete(joinCode);
      console.log(`[SessionStore] Cleaned up inactive session: ${joinCode}`);
    }

    if (sessionsToDelete.length > 0) {
      console.log(`[SessionStore] Cleanup completed. Removed ${sessionsToDelete.length} sessions. Active sessions: ${this.sessions.size}`);
    }
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/**
 * Convert internal GameSession to SessionMetadata (Feature 002)
 * Excludes sensitive data like password hashes
 * @param session - Internal GameSession model
 * @returns SessionMetadata for API transmission
 */
function toSessionMetadata(session: GameSession): SessionMetadata {
  // Count connected players
  let connectedCount = 0;
  for (const player of session.players.values()) {
    if (player.isConnected) {
      connectedCount++;
    }
  }

  return {
    joinCode: session.joinCode,
    playerCount: session.players.size,
    connectedPlayerCount: connectedCount,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    gameState: session.gameState,
    questionNumber: session.lastQuestionNumber,
  };
}

// Export singleton instance
export const sessionStore = new SessionStore();
