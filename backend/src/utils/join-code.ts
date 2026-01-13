import { customAlphabet } from 'nanoid';

// Exclude ambiguous characters: I, O, 0, 1
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(alphabet, 6);

/**
 * Generate a unique 6-character join code
 * Format: [A-Z2-9]{6} (excluding I, O, 0, 1 to avoid confusion)
 * @returns A 6-character alphanumeric code
 */
export function generateJoinCode(): string {
  return nanoid();
}

/**
 * Validate join code format
 * @param code - Code to validate
 * @returns true if code matches expected format
 */
export function isValidJoinCodeFormat(code: string): boolean {
  const pattern = /^[A-Z2-9]{6}$/;
  return pattern.test(code);
}
