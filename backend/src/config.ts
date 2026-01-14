/**
 * Application Configuration
 * Reads from environment variables with sensible defaults
 */

/**
 * Maximum number of players allowed per game session
 * Can be configured via MAX_PLAYERS environment variable
 * Default: 10 players
 */
export const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS || '10', 10);

/**
 * Game Master password for creating sessions
 * Must be set via GM_PASSWORD environment variable
 */
export const GM_PASSWORD = process.env.GM_PASSWORD || 'changeme123';

/**
 * Frontend URL for CORS configuration
 * Should be set to production frontend URL in production
 */
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Server port
 */
export const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * Node environment
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  if (MAX_PLAYERS < 1) {
    throw new Error('MAX_PLAYERS must be at least 1');
  }

  if (MAX_PLAYERS > 100) {
    console.warn('⚠️  MAX_PLAYERS is set to', MAX_PLAYERS, '- this is quite high. Consider performance implications.');
  }

  if (!GM_PASSWORD || GM_PASSWORD === 'changeme123') {
    console.warn('⚠️  GM_PASSWORD not set or using default. Please set a secure password in production!');
  }

  console.log('✅ Configuration loaded:');
  console.log('   - MAX_PLAYERS:', MAX_PLAYERS);
  console.log('   - PORT:', PORT);
  console.log('   - NODE_ENV:', NODE_ENV);
  console.log('   - FRONTEND_URL:', FRONTEND_URL);
}
