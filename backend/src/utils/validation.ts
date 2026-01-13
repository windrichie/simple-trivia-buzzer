import { VALIDATION } from '../types/websocket-events.js';

/**
 * Validate nickname format
 * Requirements: 1-20 characters, alphanumeric + spaces only
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') {
    return false;
  }
  return (
    nickname.length >= VALIDATION.NICKNAME.MIN_LENGTH &&
    nickname.length <= VALIDATION.NICKNAME.MAX_LENGTH &&
    VALIDATION.NICKNAME.PATTERN.test(nickname)
  );
}

/**
 * Validate password format
 * Requirements: 4-20 characters
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return (
    password.length >= VALIDATION.PASSWORD.MIN_LENGTH &&
    password.length <= VALIDATION.PASSWORD.MAX_LENGTH
  );
}

/**
 * Validate join code format
 * Requirements: 6 characters, uppercase letters + numbers, excluding I, O, 0, 1
 */
export function isValidJoinCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return VALIDATION.SESSION.JOIN_CODE_PATTERN.test(code);
}

/**
 * Validate score points are within acceptable range
 */
export function isValidScorePoints(points: number): boolean {
  return (
    typeof points === 'number' &&
    points >= VALIDATION.SCORE.MIN_POINTS &&
    points <= VALIDATION.SCORE.MAX_POINTS
  );
}

/**
 * Sanitize nickname by trimming whitespace
 */
export function sanitizeNickname(nickname: string): string {
  return nickname.trim();
}
