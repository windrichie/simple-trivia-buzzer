/**
 * Leaderboard Component (Feature 003: Game End & Leaderboard)
 *
 * Displays final game rankings with:
 * - Standard Competition Ranking (1224) with tie indicators
 * - Podium-style display for top 3 (gold, silver, bronze)
 * - Confetti celebration animation
 * - Responsive mobile-first design
 *
 * T026-T032: Render leaderboard entries, podium, tie indicators, confetti
 */

'use client';

import { LeaderboardData, LeaderboardEntry } from '@/lib/websocket-events';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface LeaderboardProps {
  leaderboard: LeaderboardData;
  showConfetti?: boolean;
}

export function Leaderboard({ leaderboard, showConfetti = true }: LeaderboardProps) {
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  // T031: Trigger confetti animation on mount (once)
  useEffect(() => {
    if (showConfetti && !confettiTriggered) {
      triggerConfetti();
      setConfettiTriggered(true);
    }
  }, [showConfetti, confettiTriggered]);

  // T032: Confetti animation with multiple bursts
  const triggerConfetti = () => {
    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Burst from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // Burst from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // T026: Determine podium medals for top 3
  const getPodiumEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  // T027: Get rank display color
  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 font-extrabold';
      case 2:
        return 'text-gray-500 font-bold';
      case 3:
        return 'text-amber-700 font-bold';
      default:
        return 'text-gray-700 font-semibold';
    }
  };

  // T028: Get background color for entries
  const getEntryBgColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-300';
      case 2:
        return 'bg-gray-50 border-gray-300';
      case 3:
        return 'bg-amber-50 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
          🏆 Final Rankings
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''} competed
        </p>
      </div>

      {/* T029: Leaderboard entries */}
      <div className="space-y-3">
        {leaderboard.entries.map((entry: LeaderboardEntry, index: number) => (
          <div
            key={entry.playerId}
            className={`flex items-center gap-3 sm:gap-4 p-4 rounded-lg border-2 transition-all duration-300 hover:scale-[1.02] ${getEntryBgColor(
              entry.rank
            )}`}
          >
            {/* Rank & Medal */}
            <div className="flex-shrink-0 w-12 sm:w-16 text-center">
              <div className={`text-2xl sm:text-3xl ${getRankColor(entry.rank)}`}>
                {entry.rank <= 3 ? getPodiumEmoji(entry.rank) : `#${entry.rank}`}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {entry.nickname}
                </p>
                {/* T030: Tie indicator */}
                {entry.isTied && (
                  <span className="flex-shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    TIED
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-right">
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {entry.score}
              </p>
              <p className="text-xs text-gray-600">points</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {leaderboard.entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No players to rank</p>
        </div>
      )}
    </div>
  );
}
