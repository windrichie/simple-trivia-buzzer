'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { BuzzerButton } from '@/components/buzzer-button';
import { BuzzerSoundSelector } from '@/components/buzzer-sound-selector';
import { GameState } from '@/lib/websocket-events';
import type { GameSession, Player, BuzzerSound } from '@/lib/websocket-events';

export default function PlayerPage() {
  const { socket, isConnected } = useSocket();
  const { credentials, isLoaded, saveCredentials, clearCredentials, areCredentialsRecent } = useLocalStorage();
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.WAITING);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  // T140: Add loading state for join operation
  const [isJoining, setIsJoining] = useState(false);
  // T141: Track connection status for reconnection handling
  const [wasDisconnected, setWasDisconnected] = useState(false);

  // T119: Load credentials from localStorage on mount and pre-fill form
  useEffect(() => {
    if (isLoaded && credentials && !joined) {
      setJoinCode(credentials.joinCode);
      setNickname(credentials.nickname);
      setPassword(credentials.password);
      setIsAutoFilled(true);
    }
  }, [isLoaded, credentials, joined]);

  // T044: Handle player join
  const handleJoin = () => {
    // T142: Client-side validation with specific error messages
    if (!joinCode) {
      setError('Join code is required');
      return;
    }
    if (joinCode.length !== 6) {
      setError('Join code must be exactly 6 characters');
      return;
    }
    if (!nickname) {
      setError('Nickname is required');
      return;
    }
    if (nickname.length < 2) {
      setError('Nickname must be at least 2 characters');
      return;
    }
    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 3) {
      setError('Password must be at least 3 characters');
      return;
    }

    setIsJoining(true);
    setError('');

    socket.emit(
      'player:join',
      { joinCode: joinCode.toUpperCase(), nickname, password },
      (response) => {
        setIsJoining(false);

        if (response.success && response.player && response.session) {
          setJoined(true);
          setCurrentPlayer(response.player);
          setPlayers(response.session.players);
          setGameState(response.session.gameState);
          setError('');

          // T118: Save credentials to localStorage after successful join
          saveCredentials({
            joinCode: joinCode.toUpperCase(),
            nickname,
            password,
          });
        } else {
          setError(response.error || 'Failed to join session');
        }
      }
    );
  };

  // T113-T114: Handle player rejoin
  const handleRejoin = () => {
    // T142: Client-side validation with specific error messages
    if (!joinCode) {
      setError('Join code is required');
      return;
    }
    if (joinCode.length !== 6) {
      setError('Join code must be exactly 6 characters');
      return;
    }
    if (!nickname) {
      setError('Nickname is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsRejoining(true);

    socket.emit(
      'player:rejoin',
      { joinCode: joinCode.toUpperCase(), nickname, password },
      (response) => {
        setIsRejoining(false);

        if (response.success && response.player && response.session) {
          // T114: Restore score, buzzerSound, and session state
          setJoined(true);
          setCurrentPlayer(response.player);
          setPlayers(response.session.players);
          setGameState(response.session.gameState);
          setError('');
        } else {
          // T115: Display error on authentication failure
          setError(response.error || 'Failed to rejoin session');
        }
      }
    );
  };

  // T063: Handle buzzer press
  const handlePressBuzzer = useCallback((data: { joinCode: string; playerId: string }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socket.emit('player:pressBuzzer', data, (response) => {
        if (response.success) {
          setHasBuzzed(true);
        }
        resolve(response);
      });
    });
  }, [socket]);

  // T067: Handle buzzer sound change
  const handleChangeBuzzerSound = useCallback((data: {
    joinCode: string;
    playerId: string;
    buzzerSound: BuzzerSound;
  }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socket.emit('player:changeBuzzerSound', data, (response) => {
        if (response.success && currentPlayer) {
          setCurrentPlayer({ ...currentPlayer, buzzerSound: data.buzzerSound });
        }
        resolve(response);
      });
    });
  }, [socket, currentPlayer]);

  // T047: Listen to player:joined and player:disconnected events
  useEffect(() => {
    function onPlayerJoined(data: { player: Player }) {
      setPlayers((prev) => {
        // Check if player already exists
        const exists = prev.some(p => p.playerId === data.player.playerId);
        if (exists) return prev;
        return [...prev, data.player];
      });
    }

    function onPlayerDisconnected(data: { playerId: string; playerName: string }) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.playerId ? { ...p, isConnected: false } : p
        )
      );
    }

    function onSessionEnded() {
      setJoined(false);
      setCurrentPlayer(null);
      setPlayers([]);
      setError('Game master ended the session');
    }

    // T116: Listen to player:reconnected event
    function onPlayerReconnected(data: { player: Player }) {
      // Update players list to show reconnected player
      setPlayers((prev) => {
        const existing = prev.find(p => p.playerId === data.player.playerId);
        if (existing) {
          return prev.map(p =>
            p.playerId === data.player.playerId
              ? { ...p, isConnected: true }
              : p
          );
        }
        return [...prev, data.player];
      });
    }

    socket.on('player:joined', onPlayerJoined);
    socket.on('player:disconnected', onPlayerDisconnected);
    socket.on('player:reconnected', onPlayerReconnected);
    socket.on('session:ended', onSessionEnded);

    return () => {
      socket.off('player:joined', onPlayerJoined);
      socket.off('player:disconnected', onPlayerDisconnected);
      socket.off('player:reconnected', onPlayerReconnected);
      socket.off('session:ended', onSessionEnded);
    };
  }, [socket]);

  // T064-T065: Listen to buzzer events
  useEffect(() => {
    function onBuzzerPressed(data: {
      playerId: string;
      playerName: string;
      timestamp: number;
      isFirst: boolean;
    }) {
      // Update local buzzer state if this player pressed
      if (currentPlayer && data.playerId === currentPlayer.playerId) {
        setHasBuzzed(true);
        setIsFirst(data.isFirst);
      }

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
      // Mark this player as first if it's the current player
      if (currentPlayer && data.playerId === currentPlayer.playerId) {
        setIsFirst(true);
      }
    }

    function onBuzzerSoundChanged(data: {
      playerId: string;
      newSound: BuzzerSound;
    }) {
      // Update player's buzzer sound in the list
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === data.playerId
            ? { ...p, buzzerSound: data.newSound }
            : p
        )
      );

      // Update current player if it's them
      if (currentPlayer && data.playerId === currentPlayer.playerId) {
        setCurrentPlayer({ ...currentPlayer, buzzerSound: data.newSound });
      }
    }

    socket.on('buzzer:pressed', onBuzzerPressed);
    socket.on('buzzer:first', onBuzzerFirst);
    socket.on('player:buzzerSoundChanged', onBuzzerSoundChanged);

    return () => {
      socket.off('buzzer:pressed', onBuzzerPressed);
      socket.off('buzzer:first', onBuzzerFirst);
      socket.off('player:buzzerSoundChanged', onBuzzerSoundChanged);
    };
  }, [socket, currentPlayer]);

  // T085-T086: Listen to game state change events and reset buzzer state
  useEffect(() => {
    function onGameStateChanged(data: {
      joinCode: string;
      newState: GameState;
      questionNumber: number;
    }) {
      setGameState(data.newState);
      // Reset buzzer state when new question starts
      if (data.newState === GameState.ACTIVE) {
        setHasBuzzed(false);
        setIsFirst(false);
      }
    }

    function onQuestionStarted(data: { questionNumber: number }) {
      setGameState(GameState.ACTIVE);
      setHasBuzzed(false);
      setIsFirst(false);
    }

    function onScoringStarted(data: { questionNumber: number }) {
      setGameState(GameState.SCORING);
    }

    function onQuestionSkipped(data: { questionNumber: number }) {
      setGameState(GameState.WAITING);
      setHasBuzzed(false);
      setIsFirst(false);
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

  // T141: Track disconnection and reconnection
  useEffect(() => {
    if (!isConnected && joined) {
      // We were in a game but lost connection
      setWasDisconnected(true);
    } else if (isConnected && wasDisconnected) {
      // We've reconnected - show message briefly then clear it
      setTimeout(() => setWasDisconnected(false), 3000);
    }
  }, [isConnected, joined, wasDisconnected]);

  // T099: Listen to player:scoreUpdated event with animation
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

      // Update current player's score and trigger animation
      if (currentPlayer && data.playerId === currentPlayer.playerId) {
        setCurrentPlayer({ ...currentPlayer, score: data.newScore });
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 1000);
      }
    }

    socket.on('player:scoreUpdated', onScoreUpdated);

    return () => {
      socket.off('player:scoreUpdated', onScoreUpdated);
    };
  }, [socket, currentPlayer]);

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

  if (!joined) {
    // T043: Join form
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <span>👤</span> Join Game
            </CardTitle>
            <CardDescription>
              Enter the join code to start playing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* T121: Visual indicator when credentials are auto-filled */}
            {isAutoFilled && areCredentialsRecent() && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">ℹ️</span>
                  <span>Credentials restored from last session</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="joinCode">Join Code</Label>
              <Input
                id="joinCode"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="Your name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Set a password to reconnect"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={20}
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
              <p className="text-xs text-muted-foreground">
                Use this password to rejoin if you get disconnected
              </p>
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            {/* T112/T122: Join and Rejoin buttons - suggest rejoin if credentials are recent */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleJoin}
                variant={isAutoFilled && areCredentialsRecent() ? 'outline' : 'default'}
                className="w-full"
                disabled={isJoining || isRejoining}
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </Button>
              <Button
                onClick={handleRejoin}
                variant={isAutoFilled && areCredentialsRecent() ? 'default' : 'outline'}
                className="w-full"
                disabled={isJoining || isRejoining}
              >
                {isRejoining ? 'Rejoining...' : 'Rejoin'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {isAutoFilled && areCredentialsRecent()
                ? 'Click "Rejoin" to return to your active game'
                : 'Use "Rejoin" if you were disconnected from an active game'}
            </p>

            {/* T120: Clear Saved Credentials button */}
            {credentials && (
              <Button
                onClick={() => {
                  clearCredentials();
                  setJoinCode('');
                  setNickname('');
                  setPassword('');
                  setIsAutoFilled(false);
                }}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Saved Credentials
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // T045-T046: Display joined confirmation and player list
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

      {/* Buzzer Button - prominently displayed at top */}
      {currentPlayer && (
        <div className="flex justify-center">
          <BuzzerButton
            playerId={currentPlayer.playerId}
            joinCode={joinCode}
            buzzerSound={currentPlayer.buzzerSound}
            gameState={gameState}
            hasBuzzed={hasBuzzed}
            isFirst={isFirst}
            onPressBuzzer={handlePressBuzzer}
          />
        </div>
      )}

      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-2xl">Welcome, {currentPlayer?.nickname}! 👋</CardTitle>
          <CardDescription className="text-center">
            You're in the game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* T098-T099: Display large score card with animation */}
          <div className="text-center">
            <div className="relative inline-block">
              <div
                className={`text-6xl sm:text-7xl font-bold text-primary transition-all duration-500 ${
                  scoreAnimation ? 'scale-110 text-green-600' : ''
                }`}
              >
                {currentPlayer?.score || 0}
              </div>
              {/* T145: Enhanced score animation with glow effect */}
              {scoreAnimation && (
                <div className="absolute inset-0 animate-ping opacity-25">
                  <div className="text-6xl sm:text-7xl font-bold text-green-600">
                    {currentPlayer?.score || 0}
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Your Score</div>
          </div>

          {/* Buzzer Sound Selector */}
          {currentPlayer && (
            <BuzzerSoundSelector
              playerId={currentPlayer.playerId}
              joinCode={joinCode}
              currentSound={currentPlayer.buzzerSound}
              onChangeBuzzerSound={handleChangeBuzzerSound}
            />
          )}

          {/* T100: Show all players' scores sorted by score descending */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span>👥 Players</span>
              <span className="text-sm text-muted-foreground">({players.length}/5)</span>
            </h3>
            <div className="space-y-2">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all ${
                    player.playerId === currentPlayer?.playerId
                      ? 'bg-primary/10 border-primary shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
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
                    {player.playerId === currentPlayer?.playerId && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-lg text-primary">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
