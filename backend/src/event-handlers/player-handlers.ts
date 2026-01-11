import { Socket } from 'socket.io';
import { sessionStore } from '../session-manager.js';
import { createPlayer } from '../models/player.js';
import { hasSpaceForPlayer, isNicknameTaken } from '../models/session.js';
import { isValidNickname, isValidPassword, isValidJoinCode, sanitizeNickname } from '../utils/validation.js';
import { ErrorCode, ERROR_MESSAGES, GameState, BuzzerSound, isValidBuzzerSound } from '../types/websocket-events.js';
import { addBuzzerPress, hasPlayerBuzzed } from '../models/question.js';

/**
 * Handle player joining a session
 * T031-T035: Validate, create player, join room, broadcast player:joined
 */
export function handlePlayerJoin(
  socket: Socket,
  data: { joinCode: string; nickname: string; password: string },
  callback: (response: {
    success: boolean;
    player?: any;
    session?: any;
    error?: string;
  }) => void
): void {
  // T032: Validate join code format
  if (!isValidJoinCode(data.joinCode)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_JOIN_CODE],
    });
  }

  // T032: Check if session exists
  const session = sessionStore.getSession(data.joinCode);
  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  // T032: Check if session is active
  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // T032: Check session capacity (<5 players)
  if (!hasSpaceForPlayer(session)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_FULL],
    });
  }

  // T032: Validate nickname
  const nickname = sanitizeNickname(data.nickname);
  if (!isValidNickname(nickname)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_NICKNAME],
    });
  }

  // T032: Check nickname uniqueness
  if (isNicknameTaken(session, nickname)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.NICKNAME_TAKEN],
    });
  }

  // Validate password
  if (!isValidPassword(data.password)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_PASSWORD],
    });
  }

  // T033: Create Player entity
  const player = createPlayer(data.joinCode, nickname, data.password, socket.id);

  // Add player to session
  session.players.set(player.playerId, player);
  sessionStore.updateActivity(data.joinCode);

  // T034: Join Socket.IO room
  socket.join(data.joinCode);

  console.log(`[Player] ${nickname} joined session ${data.joinCode} (${socket.id})`);

  // T035: Broadcast player:joined to all clients in room
  socket.to(data.joinCode).emit('player:joined', {
    player: {
      playerId: player.playerId,
      nickname: player.nickname,
      score: player.score,
      buzzerSound: player.buzzerSound,
      isConnected: player.isConnected,
      lastBuzzTimestamp: player.lastBuzzTimestamp,
    },
  });

  // Return success to joining player
  callback({
    success: true,
    player: {
      playerId: player.playerId,
      nickname: player.nickname,
      score: player.score,
      buzzerSound: player.buzzerSound,
      isConnected: player.isConnected,
      lastBuzzTimestamp: player.lastBuzzTimestamp,
    },
    session: {
      joinCode: session.joinCode,
      players: Array.from(session.players.values()).map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        score: p.score,
        buzzerSound: p.buzzerSound,
        isConnected: p.isConnected,
        lastBuzzTimestamp: p.lastBuzzTimestamp,
      })),
      gameState: session.gameState,
      currentQuestionNumber: session.currentQuestion?.questionNumber || 0,
      createdAt: session.createdAt,
      isActive: session.isActive,
    },
  });
}

/**
 * Handle player disconnection
 * T036: Mark player.isConnected=false, broadcast player:disconnected
 */
export function handlePlayerDisconnect(socket: Socket): void {
  // Find which session this socket belongs to
  for (const session of sessionStore.getAllSessions()) {
    for (const player of session.players.values()) {
      if (player.connectionId === socket.id && player.isConnected) {
        // Mark player as disconnected
        player.isConnected = false;
        player.connectionId = null;

        console.log(`[Player] ${player.nickname} disconnected from session ${session.joinCode}`);

        // Broadcast to other players in the session
        socket.to(session.joinCode).emit('player:disconnected', {
          playerId: player.playerId,
          playerName: player.nickname,
        });

        return;
      }
    }
  }
}

/**
 * Handle player rejoining after disconnect
 * T103-T108: Validate credentials, reconnect player, broadcast player:reconnected
 */
export function handlePlayerRejoin(
  socket: Socket,
  data: { joinCode: string; nickname: string; password: string },
  callback: (response: {
    success: boolean;
    player?: any;
    session?: any;
    error?: string;
  }) => void
): void {
  // T104: Validate join code format
  if (!isValidJoinCode(data.joinCode)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_JOIN_CODE],
    });
  }

  // T104: Check if session exists
  const session = sessionStore.getSession(data.joinCode);
  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  // T104: Check if session is active
  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // T104: Validate credentials - find player by (joinCode, nickname, password) triple
  const nickname = sanitizeNickname(data.nickname);
  let foundPlayer = null;

  for (const player of session.players.values()) {
    if (
      player.nickname.toLowerCase() === nickname.toLowerCase() &&
      player.password === data.password
    ) {
      foundPlayer = player;
      break;
    }
  }

  // T105: Return AUTHENTICATION_FAILED if credentials don't match
  if (!foundPlayer) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.AUTHENTICATION_FAILED],
    });
  }

  // T106: Update player.connectionId to new socket ID, set isConnected = true
  foundPlayer.connectionId = socket.id;
  foundPlayer.isConnected = true;

  sessionStore.updateActivity(data.joinCode);

  // Join Socket.IO room
  socket.join(data.joinCode);

  console.log(`[Player] ${foundPlayer.nickname} reconnected to session ${data.joinCode} (${socket.id})`);

  // T107: Broadcast player:reconnected to all clients in room
  socket.to(data.joinCode).emit('player:reconnected', {
    player: {
      playerId: foundPlayer.playerId,
      nickname: foundPlayer.nickname,
      score: foundPlayer.score,
      buzzerSound: foundPlayer.buzzerSound,
      isConnected: foundPlayer.isConnected,
      lastBuzzTimestamp: foundPlayer.lastBuzzTimestamp,
    },
  });

  // T108: Return full player state to restore UI
  callback({
    success: true,
    player: {
      playerId: foundPlayer.playerId,
      nickname: foundPlayer.nickname,
      score: foundPlayer.score,
      buzzerSound: foundPlayer.buzzerSound,
      isConnected: foundPlayer.isConnected,
      lastBuzzTimestamp: foundPlayer.lastBuzzTimestamp,
    },
    session: {
      joinCode: session.joinCode,
      players: Array.from(session.players.values()).map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        score: p.score,
        buzzerSound: p.buzzerSound,
        isConnected: p.isConnected,
        lastBuzzTimestamp: p.lastBuzzTimestamp,
      })),
      gameState: session.gameState,
      currentQuestionNumber: session.currentQuestion?.questionNumber || 0,
      createdAt: session.createdAt,
      isActive: session.isActive,
    },
  });
}

/**
 * Handle player buzzer press
 * T048-T054: Validate state, timestamp, detect first press, broadcast
 */
export function handlePressBuzzer(
  socket: Socket,
  data: { joinCode: string; playerId: string },
  callback: (response: { success: boolean; timestamp?: number; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  // T049: Validate gameState === ACTIVE
  if (session.gameState !== GameState.ACTIVE) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.BUZZER_DISABLED],
    });
  }

  const player = session.players.get(data.playerId);

  if (!player) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.PLAYER_NOT_FOUND],
    });
  }

  if (!session.currentQuestion) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  // T050: Check if player already buzzed
  if (hasPlayerBuzzed(session.currentQuestion, data.playerId)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.ALREADY_BUZZED],
    });
  }

  // T051-T052: Timestamp buzzer press and determine if first
  const isFirst = addBuzzerPress(session.currentQuestion, player.playerId, player.nickname);
  const timestamp = Date.now();
  player.lastBuzzTimestamp = timestamp;

  sessionStore.updateActivity(data.joinCode);

  console.log(`[Buzzer] ${player.nickname} buzzed (${isFirst ? 'FIRST' : 'not first'})`);

  // T053: Broadcast buzzer:pressed to all clients
  socket.to(data.joinCode).emit('buzzer:pressed', {
    playerId: player.playerId,
    playerName: player.nickname,
    timestamp,
    isFirst,
  });

  // Also emit to the player who pressed
  socket.emit('buzzer:pressed', {
    playerId: player.playerId,
    playerName: player.nickname,
    timestamp,
    isFirst,
  });

  // T054: Broadcast buzzer:first if this is the first press
  if (isFirst) {
    socket.to(data.joinCode).emit('buzzer:first', {
      playerId: player.playerId,
      playerName: player.nickname,
      timestamp,
    });

    socket.emit('buzzer:first', {
      playerId: player.playerId,
      playerName: player.nickname,
      timestamp,
    });
  }

  callback({
    success: true,
    timestamp,
  });
}

/**
 * Handle player changing buzzer sound
 * T055: Update player.buzzerSound, broadcast change
 */
export function handleChangeBuzzerSound(
  socket: Socket,
  data: { joinCode: string; playerId: string; buzzerSound: BuzzerSound },
  callback: (response: { success: boolean; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  const player = session.players.get(data.playerId);

  if (!player) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.PLAYER_NOT_FOUND],
    });
  }

  if (!isValidBuzzerSound(data.buzzerSound)) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_INPUT],
    });
  }

  player.buzzerSound = data.buzzerSound;
  sessionStore.updateActivity(data.joinCode);

  console.log(`[Player] ${player.nickname} changed buzzer sound to ${data.buzzerSound}`);

  // Broadcast to all players in session
  socket.to(data.joinCode).emit('player:buzzerSoundChanged', {
    playerId: player.playerId,
    newSound: data.buzzerSound,
  });

  callback({ success: true });
}
