import { Socket } from 'socket.io';
import { sessionStore } from '../session-manager.js';
import { generateJoinCode } from '../utils/join-code.js';
import { ErrorCode, ERROR_MESSAGES, GameState, VALIDATION } from '../types/websocket-events.js';
import { createQuestion } from '../models/question.js';
import { io } from '../server.js';

/**
 * Handle GM session creation
 * T026-T029: Create session, validate password, generate join code, emit session:created
 */
export function handleCreateSession(
  socket: Socket,
  data: { gmPassword: string },
  callback: (response: { success: boolean; joinCode?: string; error?: string }) => void
): void {
  // T027: Validate GM password
  const expectedPassword = process.env.GM_PASSWORD;

  if (!expectedPassword) {
    console.error('[GM] GM_PASSWORD not set in environment variables');
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
    });
  }

  if (data.gmPassword !== expectedPassword) {
    console.log('[GM] Invalid password attempt');
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_GM_PASSWORD],
    });
  }

  // T028: Generate unique join code (retry on collision)
  let joinCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    joinCode = generateJoinCode();
    attempts++;
  } while (sessionStore.hasSession(joinCode) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    console.error('[GM] Failed to generate unique join code after max attempts');
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
    });
  }

  // T029: Create session and emit session:created
  const session = sessionStore.createSession(joinCode);

  console.log(`[GM] Session created: ${joinCode}`);

  // GM joins the Socket.IO room to receive player updates
  socket.join(joinCode);

  // Emit to GM client
  socket.emit('session:created', {
    joinCode,
    session: {
      joinCode: session.joinCode,
      players: Array.from(session.players.values()),
      gameState: session.gameState,
      currentQuestionNumber: session.currentQuestion?.questionNumber || 0,
      createdAt: session.createdAt,
      isActive: session.isActive,
    },
  });

  callback({
    success: true,
    joinCode,
  });
}

/**
 * Handle GM ending a session
 * T030: Set isActive=false, broadcast session:ended
 */
export function handleEndSession(
  socket: Socket,
  data: { joinCode: string },
  callback: (response: { success: boolean; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  // Mark session as inactive
  session.isActive = false;
  sessionStore.updateActivity(data.joinCode);

  console.log(`[GM] Session ended: ${data.joinCode}`);

  // Broadcast to all clients in the session
  socket.to(data.joinCode).emit('session:ended', {
    joinCode: data.joinCode,
    reason: 'Game master ended the session',
  });

  callback({ success: true });
}

/**
 * Handle GM starting a new question
 * T069-T073: Create Question, set state to ACTIVE, reset player timestamps, broadcast
 */
export function handleStartQuestion(
  socket: Socket,
  data: { joinCode: string },
  callback: (response: { success: boolean; questionNumber?: number; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // Only allow starting question from WAITING state
  if (session.gameState !== GameState.WAITING) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  // T070: Create new Question with incremented number
  const questionNumber = session.currentQuestion
    ? session.currentQuestion.questionNumber + 1
    : 1;

  const question = createQuestion(questionNumber);

  // T071: Set session.currentQuestion and update gameState to ACTIVE
  session.currentQuestion = question;
  session.gameState = GameState.ACTIVE;

  // T072: Reset all players' lastBuzzTimestamp to null
  for (const player of session.players.values()) {
    player.lastBuzzTimestamp = null;
  }

  sessionStore.updateActivity(data.joinCode);

  console.log(`[GM] Question ${questionNumber} started in session ${data.joinCode}`);

  // T073: Broadcast game:questionStarted and game:stateChanged to all clients
  io.to(data.joinCode).emit('game:questionStarted', {
    questionNumber,
  });

  io.to(data.joinCode).emit('game:stateChanged', {
    joinCode: data.joinCode,
    newState: GameState.ACTIVE,
    questionNumber,
  });

  callback({
    success: true,
    questionNumber,
  });
}

/**
 * Handle GM moving to scoring phase
 * T074-T076: Validate buzzer presses exist, set state to SCORING, broadcast
 */
export function handleMoveToScoring(
  socket: Socket,
  data: { joinCode: string },
  callback: (response: { success: boolean; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // Only allow moving to scoring from ACTIVE state
  if (session.gameState !== GameState.ACTIVE) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  if (!session.currentQuestion) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  // T075: Validate at least 1 buzzer press exists
  if (session.currentQuestion.buzzerPresses.length === 0) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.NO_BUZZER_PRESSES],
    });
  }

  // T076: Update session.gameState to SCORING
  session.gameState = GameState.SCORING;
  sessionStore.updateActivity(data.joinCode);

  const questionNumber = session.currentQuestion.questionNumber;

  console.log(`[GM] Moved to scoring for question ${questionNumber} in session ${data.joinCode}`);

  // T076: Broadcast game:scoringStarted and game:stateChanged
  io.to(data.joinCode).emit('game:scoringStarted', {
    questionNumber,
  });

  io.to(data.joinCode).emit('game:stateChanged', {
    joinCode: data.joinCode,
    newState: GameState.SCORING,
    questionNumber,
  });

  callback({ success: true });
}

/**
 * Handle GM skipping a question
 * T077-T079: Transition from ACTIVE → WAITING, reset currentQuestion, broadcast
 */
export function handleSkipQuestion(
  socket: Socket,
  data: { joinCode: string },
  callback: (response: { success: boolean; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // Only allow skipping from ACTIVE state
  if (session.gameState !== GameState.ACTIVE) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  if (!session.currentQuestion) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  const questionNumber = session.currentQuestion.questionNumber;

  // T078: Transition ACTIVE → WAITING, reset currentQuestion
  session.gameState = GameState.WAITING;
  session.currentQuestion = null;

  sessionStore.updateActivity(data.joinCode);

  console.log(`[GM] Skipped question ${questionNumber} in session ${data.joinCode}`);

  // T078: Broadcast game:questionSkipped
  io.to(data.joinCode).emit('game:questionSkipped', {
    questionNumber,
  });

  io.to(data.joinCode).emit('game:stateChanged', {
    joinCode: data.joinCode,
    newState: GameState.WAITING,
    questionNumber: 0, // No active question
  });

  callback({ success: true });
}

/**
 * Handle GM assigning points to a player
 * T088-T092: Validate state, validate points range, update score, broadcast
 */
export function handleAssignPoints(
  socket: Socket,
  data: { joinCode: string; playerId: string; points: number },
  callback: (response: { success: boolean; newScore?: number; error?: string }) => void
): void {
  const session = sessionStore.getSession(data.joinCode);

  if (!session) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_NOT_FOUND],
    });
  }

  if (!session.isActive) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.SESSION_INACTIVE],
    });
  }

  // T089: Validate gameState === SCORING
  if (session.gameState !== GameState.SCORING) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_STATE_TRANSITION],
    });
  }

  const player = session.players.get(data.playerId);

  if (!player) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.PLAYER_NOT_FOUND],
    });
  }

  // T090: Validate points within range
  if (data.points < VALIDATION.SCORE.MIN_POINTS || data.points > VALIDATION.SCORE.MAX_POINTS) {
    return callback({
      success: false,
      error: ERROR_MESSAGES[ErrorCode.INVALID_INPUT],
    });
  }

  // T091: Update player.score by adding points
  const oldScore = player.score;
  player.score += data.points;
  const newScore = player.score;

  sessionStore.updateActivity(data.joinCode);

  console.log(`[GM] Assigned ${data.points} points to ${player.nickname} in session ${data.joinCode} (${oldScore} → ${newScore})`);

  // T092: Broadcast player:scoreUpdated to all clients
  io.to(data.joinCode).emit('player:scoreUpdated', {
    playerId: player.playerId,
    newScore,
    pointsAdded: data.points,
  });

  callback({
    success: true,
    newScore,
  });
}
