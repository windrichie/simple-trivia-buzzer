/**
 * SessionSelector Component (Feature 002: GM Session Reconnection)
 *
 * Displays list of active sessions for GM to select from
 * T029 [US1][US2]: Render session list with SessionCard components
 */

import { SessionMetadata } from '@/lib/websocket-events';
import { SessionCard } from './session-card';
import { Button } from './ui/button';

interface SessionSelectorProps {
  sessions: SessionMetadata[];
  onSelectSession: (joinCode: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export function SessionSelector({
  sessions,
  onSelectSession,
  onCreateNew,
  isLoading = false,
}: SessionSelectorProps) {
  // Empty state - no sessions found
  if (sessions.length === 0 && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">No Active Sessions Found</h2>
          <p className="text-gray-600">
            No active sessions found. Create a new session to get started!
          </p>
        </div>

        <Button
          onClick={onCreateNew}
          size="lg"
          className="w-full min-h-[44px]"
        >
          Create New Session
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Your Active Sessions</h2>
        <p className="text-gray-600">
          Select a session to reconnect, or create a new one
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading sessions...</p>
        </div>
      )}

      {/* Session list */}
      {!isLoading && sessions.length > 0 && (
        <>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {sessions.map((session) => (
              <SessionCard
                key={session.joinCode}
                session={session}
                onSelect={onSelectSession}
              />
            ))}
          </div>

          {/* Create new session button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={onCreateNew}
              variant="outline"
              size="lg"
              className="w-full min-h-[44px]"
            >
              Create New Session
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
