/**
 * Password Utility Functions
 *
 * Provides bcrypt-based password hashing and comparison for secure password storage.
 * Used for both GM passwords (session ownership) and player passwords (reconnection).
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt with 10 salt rounds
 * @param password - Plaintext password to hash
 * @returns Promise resolving to bcrypt hash string (format: $2a$10$...)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a bcrypt hash
 * @param password - Plaintext password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
