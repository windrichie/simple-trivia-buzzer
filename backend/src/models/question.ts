import { GameState, BuzzerPress } from '../types/websocket-events.js';

export interface Question {
  questionNumber: number;
  state: GameState;
  startedAt: number;
  buzzerPresses: BuzzerPress[];
  firstBuzzerId: string | null;
}

/**
 * Create a new question
 */
export function createQuestion(questionNumber: number): Question {
  return {
    questionNumber,
    state: GameState.ACTIVE,
    startedAt: Date.now(),
    buzzerPresses: [],
    firstBuzzerId: null,
  };
}

/**
 * Add a buzzer press to the question
 * Returns true if this is the first press
 */
export function addBuzzerPress(
  question: Question,
  playerId: string,
  playerName: string
): boolean {
  const timestamp = Date.now();
  const isFirst = question.buzzerPresses.length === 0;

  const buzzerPress: BuzzerPress = {
    playerId,
    playerName,
    timestamp,
    isFirst,
  };

  question.buzzerPresses.push(buzzerPress);

  if (isFirst) {
    question.firstBuzzerId = playerId;
  }

  return isFirst;
}

/**
 * Check if player has already buzzed for this question
 */
export function hasPlayerBuzzed(question: Question, playerId: string): boolean {
  return question.buzzerPresses.some(press => press.playerId === playerId);
}

/**
 * Transition question state
 */
export function transitionQuestionState(question: Question, newState: GameState): void {
  question.state = newState;
}
