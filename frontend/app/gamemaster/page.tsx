'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { GameState } from '@/lib/websocket-events';
import type { GameSession, Player } from '@/lib/websocket-events';
import { GameStateIndicator } from '@/components/game-state-indicator';

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

  // T040: Handle session creation
  const handleCreateSession = () => {
    // T142: Client-side validation with specific error messages
    if (!gmPassword) {
      setError('Game master password is required');
      return;
    }
    if (gmPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsCreatingSession(true);
    setError('');

    socket.emit('gm:createSession', { gmPassword }, (response) => {
      setIsCreatingSession(false);

      if (response.success && response.joinCode) {
        setJoinCode(response.joinCode);
        setError('');
      } else {
        setError(response.error || 'Failed to create session');
      }
    });
  };

  // T041: Listen to player:joined events
  useEffect(() => {
    function onSessionCreated(data: { joinCode: string; session: GameSession }) {
      setSession(data.session);
      setPlayers(data.session.players);
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
      setQuestionNumber(data.questionNumber);
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
      setQuestionNumber(0);
      setBuzzerPresses([]);
      setFirstBuzzerId(null);
    }

    socket.on('game:stateChanged', onGameStateChanged);
    socket.on('game:questionStarted', onQuestionStarted);
    socket.on('game:scoringStarted', onScoringStarted);
    socket.on('game:questionSkipped', onQuestionSkipped);

    return () => {
      socket.off('game:stateChanged', onGameStateChanged);
      socket.off('game:questionStarted', onQuestionStarted);
      socket.off('game:scoringStarted', onScoringStarted);
      socket.off('game:questionSkipped', onQuestionSkipped);
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
              Enter password to create a new game session
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
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                  className="pr-10"
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
              onClick={handleCreateSession}
              className="w-full"
              disabled={isCreatingSession}
            >
              {isCreatingSession ? 'Creating Session...' : 'Create Session'}
            </Button>
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

      {/* T080: Game State Indicator */}
      <GameStateIndicator gameState={gameState} questionNumber={questionNumber} />

      {/* T087: Question Controls */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-2xl">Question Controls</CardTitle>
          <CardDescription className="text-center">
            Manage question flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="text-sm text-destructive text-center p-2 border border-destructive rounded">
              {error}
            </div>
          )}

          {/* T081: Start Question button (only enabled in WAITING state) */}
          <Button
            onClick={handleStartQuestion}
            disabled={gameState !== GameState.WAITING || isProcessingAction}
            className="w-full"
            size="lg"
          >
            {isProcessingAction && gameState === GameState.WAITING
              ? 'Starting...'
              : `Start Question ${questionNumber + 1}`}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            {/* T082: Move to Scoring button (only enabled in ACTIVE state) */}
            <Button
              onClick={handleMoveToScoring}
              disabled={gameState !== GameState.ACTIVE || isProcessingAction}
              variant="default"
            >
              {isProcessingAction && gameState === GameState.ACTIVE
                ? 'Processing...'
                : 'Move to Scoring'}
            </Button>

            {/* T083: Skip Question button (only enabled in ACTIVE state) */}
            <Button
              onClick={handleSkipQuestion}
              disabled={gameState !== GameState.ACTIVE || isProcessingAction}
              variant="outline"
            >
              {isProcessingAction ? 'Skipping...' : 'Skip Question'}
            </Button>
          </div>
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
