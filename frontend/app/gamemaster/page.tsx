'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { GameState } from '@/lib/websocket-events';
import type { GameSession, Player, SessionMetadata, LeaderboardData } from '@/lib/websocket-events';
import { GameStateIndicator } from '@/components/game-state-indicator';
import { SessionSelector } from '@/components/session-selector';
import { Leaderboard } from '@/components/leaderboard';

export default function GameMasterPage() {
  const { socket, isConnected } = useSocket();
  const [gmPassword, setGmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<GameState>(GameState.WAITING);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [buzzerPresses, setBuzzerPresses] = useState<Array<{ playerId: string; playerName: string; timestamp: number; isFirst: boolean }>>([]);
  const [firstBuzzerId, setFirstBuzzerId] = useState<string | null>(null);
  const [customPoints, setCustomPoints] = useState<{ [playerId: string]: string }>({});
  const [copied, setCopied] = useState(false);
  // T140: Add loading states for async operations
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  // T141: Track connection status for reconnection handling
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // Feature 002: Session reconnection state
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Feature 003: Game End & Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);

  // Auto-login: Load stored GM password from localStorage
  useEffect(() => {
    const storedPassword = localStorage.getItem('gmPassword');
    if (storedPassword && !joinCode && !showSessionSelector && isConnected) {
      setGmPassword(storedPassword);
      setIsLoadingSessions(true);
      setError('');

      // Auto-submit to check for sessions
      setTimeout(() => {
        socket.emit('gm:getActiveSessions', { gmPassword: storedPassword }, (response) => {
          setIsLoadingSessions(false);

          if (response.success && response.sessions) {
            localStorage.setItem('gmPassword', storedPassword);
            setSessions(response.sessions);
            setShowSessionSelector(true);
          } else {
            setError(response.error || 'Failed to fetch sessions');
          }
        });
      }, 100);
    }
  }, [isConnected, joinCode, showSessionSelector, socket]); // Dependencies

  // Handle logout - clear stored password
  const handleLogout = () => {
    localStorage.removeItem('gmPassword');
    setGmPassword('');
    setShowSessionSelector(false);
    setSessions([]);
    setJoinCode(null);
    setSession(null);
    setPlayers([]);
    setError('');
  };

  // T150: Handle copy join code to clipboard
  const handleCopyJoinCode = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[GM] Failed to copy join code:', error);
      setError('Failed to copy join code');
    }
  };

  // Feature 002: Handle password submission - check for existing sessions first
  const handlePasswordSubmit = () => {
    // T142: Client-side validation with specific error messages
    if (!gmPassword) {
      setError('Game master password is required');
      return;
    }
    if (gmPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoadingSessions(true);
    setError('');

    // T030: Call gm:getActiveSessions after password entry
    socket.emit('gm:getActiveSessions', { gmPassword }, (response) => {
      setIsLoadingSessions(false);

      if (response.success && response.sessions) {
        // Save password to localStorage for auto-login on refresh
        localStorage.setItem('gmPassword', gmPassword);

        setSessions(response.sessions);
        // T031: Display SessionSelector if sessions exist
        setShowSessionSelector(true);
      } else {
        setError(response.error || 'Failed to fetch sessions');
      }
    });
  };

  // T034: Create new session
  const handleCreateNewSession = () => {
    setIsCreatingSession(true);
    setError('');

    socket.emit('gm:createSession', { gmPassword }, (response) => {
      setIsCreatingSession(false);

      if (response.success && response.joinCode && response.session) {
        setJoinCode(response.joinCode);
        setSession(response.session);
        setPlayers(response.session.players);
        setGameState(response.session.gameState);
        setQuestionNumber(response.session.currentQuestionNumber);
        setShowSessionSelector(false);
        setError('');
      } else {
        setError(response.error || 'Failed to create session');
      }
    });
  };

  // T033: Reconnect to existing session
  const handleReconnectToSession = (selectedJoinCode: string) => {
    setIsCreatingSession(true);
    setError('');

    socket.emit('gm:reconnectToSession', { joinCode: selectedJoinCode, gmPassword }, (response) => {
      setIsCreatingSession(false);

      if (response.success && response.session) {
        setJoinCode(selectedJoinCode);
        setSession(response.session);
        setPlayers(response.session.players);
        setGameState(response.session.gameState);
        setQuestionNumber(response.session.currentQuestionNumber);
        setShowSessionSelector(false);
        setError('');
      } else {
        setError(response.error || 'Failed to reconnect to session');
      }
    });
  };

  // T041: Listen to player:joined events
  useEffect(() => {
    function onSessionCreated(data: { joinCode: string; session: GameSession }) {
      setSession(data.session);
      setPlayers(data.session.players);
      setGameState(data.session.gameState);
      setQuestionNumber(data.session.currentQuestionNumber);
    }

    function onPlayerJoined(data: { player: Player }) {
      setPlayers((prev) => [...prev, data.player]);
    }

    function onPlayerDisconnected(data: { playerId: string; playerName: string }) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.playerId ? { ...p, isConnected: false } : p
        )
      );
    }

    function onPlayerReconnected(data: { player: Player }) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.player.playerId ? { ...data.player, isConnected: true } : p
        )
      );
    }

    socket.on('session:created', onSessionCreated);
    socket.on('player:joined', onPlayerJoined);
    socket.on('player:disconnected', onPlayerDisconnected);
    socket.on('player:reconnected', onPlayerReconnected);

    return () => {
      socket.off('session:created', onSessionCreated);
      socket.off('player:joined', onPlayerJoined);
      socket.off('player:disconnected', onPlayerDisconnected);
      socket.off('player:reconnected', onPlayerReconnected);
    };
  }, [socket]);

  // T085: Listen to game state change events
  useEffect(() => {
    function onGameStateChanged(data: {
      joinCode: string;
      newState: GameState;
      questionNumber: number;
    }) {
      setGameState(data.newState);
      // Only update questionNumber when not transitioning to WAITING
      // (WAITING transitions are handled by specific event handlers)
      if (data.newState !== GameState.WAITING) {
        setQuestionNumber(data.questionNumber);
      }
    }

    function onQuestionStarted(data: { questionNumber: number }) {
      setQuestionNumber(data.questionNumber);
      setGameState(GameState.ACTIVE);
      // Reset buzzer presses for new question
      setBuzzerPresses([]);
      setFirstBuzzerId(null);
    }

    function onScoringStarted(data: { questionNumber: number }) {
      setQuestionNumber(data.questionNumber);
      setGameState(GameState.SCORING);
    }

    function onQuestionSkipped(data: { questionNumber: number }) {
      setGameState(GameState.WAITING);
      // Keep the skipped question number so "Start Question X+1" shows correctly
      setQuestionNumber(data.questionNumber);
      setBuzzerPresses([]);
      setFirstBuzzerId(null);
    }

    function onQuestionEnded(data: { questionNumber: number }) {
      setGameState(GameState.WAITING);
      // Keep the completed question number so "Start Question X+1" shows correctly
      setQuestionNumber(data.questionNumber);
      setBuzzerPresses([]);
      setFirstBuzzerId(null);
    }

    // Feature 003: Handle game ended event
    function onGameEnded(data: { joinCode: string; leaderboard: LeaderboardData }) {
      console.log('[GM] Game ended, displaying leaderboard');
      setGameState(GameState.ENDED);
      setLeaderboard(data.leaderboard);
      setBuzzerPresses([]);
      setFirstBuzzerId(null);
    }

    socket.on('game:stateChanged', onGameStateChanged);
    socket.on('game:questionStarted', onQuestionStarted);
    socket.on('game:scoringStarted', onScoringStarted);
    socket.on('game:questionSkipped', onQuestionSkipped);
    socket.on('game:questionEnded', onQuestionEnded);
    socket.on('game:ended', onGameEnded);

    return () => {
      socket.off('game:stateChanged', onGameStateChanged);
      socket.off('game:questionStarted', onQuestionStarted);
      socket.off('game:scoringStarted', onScoringStarted);
      socket.off('game:questionSkipped', onQuestionSkipped);
      socket.off('game:questionEnded', onQuestionEnded);
      socket.off('game:ended', onGameEnded);
    };
  }, [socket]);

  // Listen to buzzer events to display who buzzed
  useEffect(() => {
    function onBuzzerPressed(data: {
      playerId: string;
      playerName: string;
      timestamp: number;
      isFirst: boolean;
    }) {
      setBuzzerPresses((prev) => [...prev, data]);

      // Update player's lastBuzzTimestamp in the list
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.playerId
            ? { ...p, lastBuzzTimestamp: data.timestamp }
            : p
        )
      );
    }

    function onBuzzerFirst(data: {
      playerId: string;
      playerName: string;
      timestamp: number;
    }) {
      setFirstBuzzerId(data.playerId);
    }

    socket.on('buzzer:pressed', onBuzzerPressed);
    socket.on('buzzer:first', onBuzzerFirst);

    return () => {
      socket.off('buzzer:pressed', onBuzzerPressed);
      socket.off('buzzer:first', onBuzzerFirst);
    };
  }, [socket]);

  // T141: Track disconnection and reconnection
  useEffect(() => {
    if (!isConnected && joinCode) {
      // We had a session but lost connection
      setWasDisconnected(true);
    } else if (isConnected && wasDisconnected) {
      // We've reconnected - show message briefly then clear it
      setTimeout(() => setWasDisconnected(false), 3000);
    }
  }, [isConnected, joinCode, wasDisconnected]);

  // T099: Listen to player:scoreUpdated event
  useEffect(() => {
    function onScoreUpdated(data: {
      playerId: string;
      newScore: number;
      pointsAdded: number;
    }) {
      // Update player's score in the list
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.playerId ? { ...p, score: data.newScore } : p
        )
      );
    }

    socket.on('player:scoreUpdated', onScoreUpdated);

    return () => {
      socket.off('player:scoreUpdated', onScoreUpdated);
    };
  }, [socket]);

  // T042: Handle end session
  const handleEndSession = () => {
    if (!joinCode) return;

    socket.emit('gm:endSession', { joinCode }, (response) => {
      if (response.success) {
        setJoinCode(null);
        setSession(null);
        setPlayers([]);
        setGameState(GameState.WAITING);
        setQuestionNumber(0);
        setBuzzerPresses([]);
        setFirstBuzzerId(null);
      } else {
        setError(response.error || 'Failed to end session');
      }
    });
  };

  // T081: Handle start question
  const handleStartQuestion = () => {
    if (!joinCode) return;

    setIsProcessingAction(true);
    setError('');

    socket.emit('gm:startQuestion', { joinCode }, (response) => {
      setIsProcessingAction(false);

      if (response.success) {
        setError('');
      } else {
        setError(response.error || 'Failed to start question');
      }
    });
  };

  // T082: Handle move to scoring
  const handleMoveToScoring = () => {
    if (!joinCode) return;

    setIsProcessingAction(true);
    setError('');

    socket.emit('gm:moveToScoring', { joinCode }, (response) => {
      setIsProcessingAction(false);

      if (response.success) {
        setError('');
      } else {
        // T084: Display error if no buzzes
        setError(response.error || 'Failed to move to scoring');
      }
    });
  };

  // T083: Handle skip question
  const handleSkipQuestion = () => {
    if (!joinCode) return;

    setIsProcessingAction(true);
    setError('');

    socket.emit('gm:skipQuestion', { joinCode }, (response) => {
      setIsProcessingAction(false);

      if (response.success) {
        setError('');
      } else {
        setError(response.error || 'Failed to skip question');
      }
    });
  };

  // T097: Handle assigning points to a player
  const handleAssignPoints = (playerId: string, points: number) => {
    if (!joinCode) return;

    socket.emit('gm:assignPoints', { joinCode, playerId, points }, (response) => {
      if (response.success) {
        setError('');
      } else {
        setError(response.error || 'Failed to assign points');
      }
    });
  };

  // T096: Handle custom points input
  const handleCustomPoints = (playerId: string) => {
    const pointsStr = customPoints[playerId];
    if (!pointsStr) return;

    const points = parseInt(pointsStr, 10);
    if (isNaN(points)) {
      setError('Invalid point value');
      return;
    }

    if (points < -1000 || points > 1000) {
      setError('Points must be between -1000 and 1000');
      return;
    }

    handleAssignPoints(playerId, points);
    setCustomPoints({ ...customPoints, [playerId]: '' });
  };

  // Handle ending question (completing scoring phase)
  const handleEndQuestion = () => {
    if (!joinCode) return;

    setIsProcessingAction(true);
    setError('');

    socket.emit('gm:endQuestion', { joinCode }, (response) => {
      setIsProcessingAction(false);

      if (response.success) {
        setError('');
        // Clear buzzer presses when returning to WAITING state
        setBuzzerPresses([]);
        setFirstBuzzerId(null);
      } else {
        setError(response.error || 'Failed to end question');
      }
    });
  };

  // Feature 003: Handle end game
  const handleEndGame = () => {
    if (!joinCode) return;

    setIsProcessingAction(true);
    setError('');

    socket.emit('gm:endGame', { joinCode }, (response) => {
      setIsProcessingAction(false);

      if (response.success && response.leaderboard) {
        console.log('[GM] Game ended successfully');
        // Note: leaderboard will be set via game:ended event
        setError('');
      } else {
        setError(response.error || 'Failed to end game');
      }
    });
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardHeader>
            <CardTitle>Connecting...</CardTitle>
            <CardDescription>Establishing connection to server</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  // Feature 002: Show SessionSelector if sessions are available
  if (showSessionSelector) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full px-4 py-3 rounded-lg bg-red-100 border border-red-400 text-red-800 text-center z-50">
            {error}
          </div>
        )}
        <SessionSelector
          sessions={sessions}
          onSelectSession={handleReconnectToSession}
          onCreateNew={handleCreateNewSession}
          isLoading={isCreatingSession}
        />
      </main>
    );
  }

  if (!joinCode) {
    // T039: Password input form
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <span>🎮</span> Game Master
            </CardTitle>
            <CardDescription>
              Enter password to check for existing sessions or create new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Game Master Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={gmPassword}
                  onChange={(e) => setGmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className="pr-10"
                  disabled={isLoadingSessions}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <Button
              onClick={handlePasswordSubmit}
              className="w-full"
              disabled={isLoadingSessions}
            >
              {isLoadingSessions ? 'Checking Sessions...' : 'Continue'}
            </Button>

            {/* Show logout option if password is auto-filled from localStorage */}
            {localStorage.getItem('gmPassword') && (
              <div className="text-center">
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Use different password?
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // T041: Display session with players list
  return (
    <main className="min-h-screen p-4 space-y-6">
      {/* T141: Connection status banner */}
      {!isConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-center">
          <strong>Connection lost.</strong> Attempting to reconnect...
        </div>
      )}
      {wasDisconnected && isConnected && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg text-center">
          <strong>Reconnected!</strong> You're back online.
        </div>
      )}

      {/* Feature 003: Display leaderboard at top when game has ended */}
      {gameState === GameState.ENDED && leaderboard ? (
        <div className="mb-4">
          <Leaderboard leaderboard={leaderboard} showConfetti={true} />
        </div>
      ) : (
        /* T080: Game State Indicator - only show when game hasn't ended */
        <GameStateIndicator gameState={gameState} questionNumber={questionNumber} />
      )}

      {/* T087: Question Controls - Redesigned */}
      <Card className="overflow-hidden border-2 shadow-lg">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 sm:px-6 py-5 border-b-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
            Question Flow
          </h2>

          {/* Visual Flow Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              gameState === GameState.WAITING ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-300 dark:bg-slate-600'
            }`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              gameState === GameState.ACTIVE ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'
            }`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              gameState === GameState.SCORING ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-slate-300 dark:bg-slate-600'
            }`} />
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
            <span className={`transition-colors ${gameState === GameState.WAITING ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              Setup
            </span>
            <span className={`transition-colors ${gameState === GameState.ACTIVE ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              Active
            </span>
            <span className={`transition-colors ${gameState === GameState.SCORING ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
              Scoring
            </span>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-800">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Contextual Primary Action */}
          <div className="space-y-3">
            {gameState === GameState.WAITING && (
              <button
                onClick={handleStartQuestion}
                disabled={isProcessingAction}
                className="group relative w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 sm:py-5 px-6 rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2 text-lg sm:text-xl">
                  {isProcessingAction ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Question {questionNumber + 1}
                    </>
                  )}
                </span>
              </button>
            )}

            {gameState === GameState.ACTIVE && (
              <div className="space-y-3">
                <button
                  onClick={handleMoveToScoring}
                  disabled={isProcessingAction}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 sm:py-5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2 text-lg sm:text-xl">
                    {isProcessingAction ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Move to Scoring
                      </>
                    )}
                  </span>
                </button>

                <button
                  onClick={handleSkipQuestion}
                  disabled={isProcessingAction}
                  className="w-full bg-white hover:bg-slate-50 disabled:bg-slate-100 border-2 border-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    {isProcessingAction ? 'Skipping...' : 'Skip Question'}
                  </span>
                </button>
              </div>
            )}

            {gameState === GameState.SCORING && (
              <button
                onClick={handleEndQuestion}
                disabled={isProcessingAction}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 sm:py-5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2 text-lg sm:text-xl">
                  {isProcessingAction ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Ending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Complete & Continue
                    </>
                  )}
                </span>
              </button>
            )}
          </div>

          {/* Separator */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">or</span>
            </div>
          </div>

          {/* End Game Action */}
          <button
            onClick={handleEndGame}
            disabled={gameState === GameState.ENDED || isProcessingAction}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:from-slate-200 disabled:to-slate-200 text-white disabled:text-slate-400 font-bold py-3.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed border-2 border-rose-700/20 disabled:border-slate-300"
          >
            <span className="flex items-center justify-center gap-2 text-base sm:text-lg">
              {isProcessingAction ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ending Game...
                </>
              ) : (
                <>
                  <span className="text-xl">🏆</span>
                  End Game & Show Results
                </>
              )}
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Buzzer Presses Display */}
      {buzzerPresses.length > 0 && (
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl">Buzzer Order</CardTitle>
            <CardDescription className="text-center">
              Players who buzzed in for Question {questionNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buzzerPresses
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((press, index) => (
                  <div
                    key={press.playerId}
                    className={`flex items-center justify-between p-3 sm:p-4 border-2 rounded-lg transition-all ${
                      press.isFirst || press.playerId === firstBuzzerId
                        ? 'bg-yellow-100 border-yellow-500 shadow-md scale-[1.02]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg sm:text-xl min-w-[2.5rem] ${
                        press.isFirst || press.playerId === firstBuzzerId
                          ? 'text-yellow-700'
                          : 'text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-base sm:text-lg">{press.playerName}</span>
                      {(press.isFirst || press.playerId === firstBuzzerId) && (
                        <span className="text-yellow-700 font-bold text-sm sm:text-base flex items-center gap-1">
                          <span className="text-xl">🏆</span> FIRST
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(press.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* T094-T097: Score Assignment UI (only during SCORING state) */}
      {gameState === GameState.SCORING && (
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl">Assign Points</CardTitle>
            <CardDescription className="text-center">
              Award or deduct points for Question {questionNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {players
                .sort((a, b) => {
                  // Sort by buzz order (those who buzzed first)
                  const aPress = buzzerPresses.find(p => p.playerId === a.playerId);
                  const bPress = buzzerPresses.find(p => p.playerId === b.playerId);
                  if (aPress && bPress) return aPress.timestamp - bPress.timestamp;
                  if (aPress) return -1;
                  if (bPress) return 1;
                  return 0;
                })
                .map((player) => (
                  <div
                    key={player.playerId}
                    className={`p-4 sm:p-5 border-2 rounded-lg transition-all ${
                      player.playerId === firstBuzzerId
                        ? 'bg-yellow-50 border-yellow-400 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg sm:text-xl">{player.nickname}</span>
                        {player.playerId === firstBuzzerId && (
                          <span className="text-xs sm:text-sm bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                            🏆 FIRST
                          </span>
                        )}
                      </div>
                      <span className="text-3xl sm:text-4xl font-bold text-primary">
                        {player.score}
                      </span>
                    </div>

                    {/* T095: Quick point buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <Button
                        onClick={() => handleAssignPoints(player.playerId, 10)}
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105"
                      >
                        +10
                      </Button>
                      <Button
                        onClick={() => handleAssignPoints(player.playerId, 5)}
                        variant="default"
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 transition-all hover:scale-105"
                      >
                        +5
                      </Button>
                      <Button
                        onClick={() => handleAssignPoints(player.playerId, -5)}
                        variant="destructive"
                        size="sm"
                        className="transition-all hover:scale-105"
                      >
                        -5
                      </Button>
                      <Button
                        onClick={() => handleAssignPoints(player.playerId, -10)}
                        variant="destructive"
                        size="sm"
                        className="transition-all hover:scale-105"
                      >
                        -10
                      </Button>
                    </div>

                    {/* T096: Custom point input */}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Custom points"
                        value={customPoints[player.playerId] || ''}
                        onChange={(e) =>
                          setCustomPoints({
                            ...customPoints,
                            [player.playerId]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomPoints(player.playerId);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleCustomPoints(player.playerId)}
                        variant="outline"
                        size="sm"
                        disabled={!customPoints[player.playerId]}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-2xl">Game Session</CardTitle>
          <CardDescription className="text-center">
            Share this code with players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
            <div className="text-5xl sm:text-6xl font-bold tracking-wider text-primary">
              {joinCode}
            </div>
            <Button
              onClick={handleCopyJoinCode}
              size="icon"
              variant="outline"
              className="h-12 w-12 transition-all hover:scale-110"
              title="Copy join code"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* T100: Show all players' scores sorted by score descending */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span>👥 Players</span>
              <span className="text-sm text-muted-foreground">({players.length}/5)</span>
            </h3>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4 border-2 border-dashed rounded-lg">
                Waiting for players to join...
              </p>
            ) : (
              <div className="space-y-2">
                {players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between p-3 border-2 rounded-lg transition-all hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 && players.length > 1 && (
                        <span className="text-xl">👑</span>
                      )}
                      <div
                        className={`w-3 h-3 rounded-full shadow-sm ${
                          player.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}
                      />
                      <span className="font-medium">{player.nickname}</span>
                    </div>
                    <span className="font-bold text-lg text-primary">{player.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* T042: End Session button */}
          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="w-full"
          >
            End Session
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
