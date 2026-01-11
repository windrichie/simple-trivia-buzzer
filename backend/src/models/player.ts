import { BuzzerSound } from '../types/websocket-events.js';
import { randomUUID } from 'crypto';

export interface Player {
  playerId: string;
  joinCode: string;
  nickname: string;
  password: string;
  score: number;
  buzzerSound: BuzzerSound;
  connectionId: string | null;
  isConnected: boolean;
  lastBuzzTimestamp: number | null;
  createdAt: number;
}

/**
 * Create a new player
 */
export function createPlayer(
  joinCode: string,
  nickname: string,
  password: string,
  connectionId: string
): Player {
  return {
    playerId: randomUUID(),
    joinCode,
    nickname,
    password,
    score: 0,
    buzzerSound: BuzzerSound.CLASSIC,
    connectionId,
    isConnected: true,
    lastBuzzTimestamp: null,
    createdAt: Date.now(),
  };
}

/**
 * Reconnect a player with new connection ID
 */
export function reconnectPlayer(player: Player, connectionId: string): void {
  player.connectionId = connectionId;
  player.isConnected = true;
}

/**
 * Disconnect a player
 */
export function disconnectPlayer(player: Player): void {
  player.connectionId = null;
  player.isConnected = false;
}

/**
 * Reset player's buzzer timestamp for new question
 */
export function resetPlayerBuzzer(player: Player): void {
  player.lastBuzzTimestamp = null;
}

/**
 * Check if player credentials match for reconnection
 */
export function validatePlayerCredentials(
  player: Player,
  nickname: string,
  password: string
): boolean {
  return (
    player.nickname.toLowerCase() === nickname.toLowerCase() &&
    player.password === password
  );
}
