import { GameState } from '../types/websocket-events.js';
import { Player } from './player.js';
import { Question } from './question.js';

export interface GameSession {
  joinCode: string;
  players: Map<string, Player>; // playerId -> Player
  gameState: GameState;
  currentQuestion: Question | null;
  lastQuestionNumber: number; // Track highest question number in this session
  createdAt: number;
  lastActivity: number;
  isActive: boolean;
}

/**
 * Create a new game session
 */
export function createGameSession(joinCode: string): GameSession {
  const now = Date.now();
  return {
    joinCode,
    players: new Map(),
    gameState: GameState.WAITING,
    currentQuestion: null,
    lastQuestionNumber: 0,
    createdAt: now,
    lastActivity: now,
    isActive: true,
  };
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(session: GameSession): void {
  session.lastActivity = Date.now();
}

/**
 * Check if session has space for more players
 */
export function hasSpaceForPlayer(session: GameSession): boolean {
  return session.players.size < 5; // Max 5 players
}

/**
 * Check if nickname is already taken in session
 */
export function isNicknameTaken(session: GameSession, nickname: string): boolean {
  for (const player of session.players.values()) {
    if (player.nickname.toLowerCase() === nickname.toLowerCase()) {
      return true;
    }
  }
  return false;
}
