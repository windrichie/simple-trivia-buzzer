import { GameSession, createGameSession, updateSessionActivity } from './models/session.js';

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
   */
  createSession(joinCode: string): GameSession {
    const session = createGameSession(joinCode);
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

// Export singleton instance
export const sessionStore = new SessionStore();
