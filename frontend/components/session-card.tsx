/**
 * SessionCard Component (Feature 002: GM Session Reconnection)
 *
 * Displays a single session's metadata for GM to select
 * T028 [US1][US2]: Render session metadata with join code, players, state, timestamps
 */

import { SessionMetadata, GameState } from '@/lib/websocket-events';

interface SessionCardProps {
  session: SessionMetadata;
  onSelect: (joinCode: string) => void;
}

export function SessionCard({ session, onSelect }: SessionCardProps) {
  // Format timestamps to human-readable format
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  // Determine if session is inactive (>5 min since last activity)
  const isInactive = Date.now() - session.lastActivity > 300000; // 5 minutes

  // Game state labels
  const stateLabels: Record<GameState, string> = {
    [GameState.WAITING]: 'Waiting',
    [GameState.ACTIVE]: 'Active',
    [GameState.SCORING]: 'Scoring',
    [GameState.ENDED]: 'Ended',
  };

  return (
    <button
      onClick={() => onSelect(session.joinCode)}
      className="w-full text-left p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Reconnect to session ${session.joinCode}`}
    >
      {/* Join Code - Prominent header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-gray-900">{session.joinCode}</h3>
        {isInactive && (
          <span className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Session info grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {/* Players */}
        <div>
          <span className="text-gray-600">Players:</span>{' '}
          <span className="font-semibold text-gray-900">
            {session.connectedPlayerCount}/{session.playerCount} online
          </span>
        </div>

        {/* Game State */}
        <div>
          <span className="text-gray-600">State:</span>{' '}
          <span className="font-semibold text-gray-900">
            {stateLabels[session.gameState]}
          </span>
        </div>

        {/* Question Number */}
        <div>
          <span className="text-gray-600">Question:</span>{' '}
          <span className="font-semibold text-gray-900">
            {session.questionNumber === 0 ? 'Not started' : `#${session.questionNumber}`}
          </span>
        </div>

        {/* Last Activity */}
        <div>
          <span className="text-gray-600">Last active:</span>{' '}
          <span className="font-semibold text-gray-900">
            {formatTimeAgo(session.lastActivity)}
          </span>
        </div>
      </div>

      {/* Created timestamp - bottom */}
      <div className="mt-2 text-xs text-gray-500">
        Created {formatTimeAgo(session.createdAt)}
      </div>
    </button>
  );
}
