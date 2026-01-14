/**
 * Leaderboard Service (Feature 003: Game End & Leaderboard)
 *
 * Implements Standard Competition Ranking (1224) algorithm:
 * - Players with same score get same rank
 * - Next rank number skips appropriately (e.g., two players tied for 1st, next is 3rd)
 * - Within same rank, players are sorted alphabetically by nickname
 *
 * T011-T013: calculateLeaderboard with Standard Competition Ranking + tie detection
 */

import { Player } from '../models/player.js';
import { LeaderboardEntry, LeaderboardData } from '../types/websocket-events.js';

/**
 * Calculate leaderboard from array of players
 * @param players - Array of players to rank
 * @param sessionId - Join code for reference
 * @returns LeaderboardData with ranked entries
 */
export function calculateLeaderboard(
  players: Player[],
  sessionId: string
): LeaderboardData {
  // T072: Handle edge case - 0 players
  if (players.length === 0) {
    return {
      entries: [],
      totalPlayers: 0,
      timestamp: Date.now(),
      sessionId,
    };
  }

  // T073: Handle edge case - 1 player (no ties possible)
  if (players.length === 1) {
    const player = players[0];
    return {
      entries: [{
        playerId: player.playerId,
        nickname: player.nickname,
        score: player.score,
        rank: 1,
        isTied: false,
      }],
      totalPlayers: 1,
      timestamp: Date.now(),
      sessionId,
    };
  }

  // T012: Sort players by score descending, then alphabetically by nickname
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    // T013: Alphabetical tie-breaker
    return a.nickname.localeCompare(b.nickname);
  });

  // T012: Implement Standard Competition Ranking (1224)
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const previousPlayer = i > 0 ? sortedPlayers[i - 1] : null;

    // If score differs from previous player, update rank to current position
    if (previousPlayer && player.score !== previousPlayer.score) {
      currentRank = i + 1; // Standard Competition Ranking
    }

    // T013: Detect ties - check if next player has same score
    const nextPlayer = i < sortedPlayers.length - 1 ? sortedPlayers[i + 1] : null;
    const isTied = Boolean(
      (previousPlayer && player.score === previousPlayer.score) ||
      (nextPlayer && player.score === nextPlayer.score)
    );

    entries.push({
      playerId: player.playerId,
      nickname: player.nickname,
      score: player.score,
      rank: currentRank,
      isTied,
    });
  }

  return {
    entries,
    totalPlayers: players.length,
    timestamp: Date.now(),
    sessionId,
  };
}
