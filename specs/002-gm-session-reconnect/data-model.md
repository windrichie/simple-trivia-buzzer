# Data Model: GM Session Reconnection

**Feature**: 002-gm-session-reconnect
**Date**: 2026-01-14
**Status**: Complete

This document defines the data structures required for GM session reconnection functionality.

---

## Entity Definitions

### 1. GameSession (MODIFIED)

**Purpose**: Represents an active game session. Modified to include GM password hash for ownership verification.

**Changes**: Add `gmPasswordHash` field.

```typescript
export interface GameSession {
  joinCode: string;                    // Existing: Unique 6-char session identifier
  players: Player[];                   // Existing: Array of players in session
  gameState: GameState;                // Existing: waiting | active | scoring | ended
  currentQuestionNumber: number;       // Existing: Current question index
  createdAt: number;                   // Existing: Unix timestamp (ms)
  isActive: boolean;                   // Existing: Session active flag
  gmPasswordHash: string;              // NEW: bcrypt hash of GM password
  lastActivity: number;                // EXISTING (if not present, ADD): Unix timestamp of last action
}
```

**Field Rules**:
- `gmPasswordHash` is set once during session creation (`gm:createSession`)
- `gmPasswordHash` is never transmitted to client (security risk)
- `gmPasswordHash` is used to verify ownership in `gm:getActiveSessions` and `gm:reconnectToSession`
- `gmPasswordHash` is immutable (cannot be changed after creation)
- `lastActivity` is updated on every session interaction (player join, GM action, buzzer press)

**Example**:
```typescript
{
  joinCode: 'ABC123',
  players: [
    { playerId: 'p1', nickname: 'Alice', score: 25, ... },
    { playerId: 'p2', nickname: 'Bob', score: 15, ... },
  ],
  gameState: GameState.ACTIVE,
  currentQuestionNumber: 3,
  createdAt: 1705267200000,
  isActive: true,
  gmPasswordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz...', // bcrypt hash
  lastActivity: 1705267800000,
}
```

---

### 2. SessionMetadata (NEW)

**Purpose**: Lightweight structure for displaying session list to GM without exposing sensitive data.

**Fields**:
```typescript
export interface SessionMetadata {
  joinCode: string;              // Session identifier (e.g., "ABC123")
  playerCount: number;           // Total players (including disconnected)
  connectedPlayerCount: number;  // Currently connected players
  createdAt: number;             // Unix timestamp when session created
  lastActivity: number;          // Unix timestamp of last activity
  gameState: GameState;          // Current game state
  questionNumber: number;        // Current question number (for display)
}
```

**Constraints**:
- `playerCount` counts all players (isConnected: true or false)
- `connectedPlayerCount` counts only players with `isConnected: true`
- `createdAt` and `lastActivity` are Unix timestamps in milliseconds
- `gameState` is one of: WAITING, ACTIVE, SCORING, ENDED

**Example**:
```typescript
{
  joinCode: 'ABC123',
  playerCount: 5,
  connectedPlayerCount: 4, // One player disconnected
  createdAt: 1705267200000,
  lastActivity: 1705267800000, // 10 minutes after creation
  gameState: GameState.ACTIVE,
  questionNumber: 3,
}
```

**Derivation from GameSession**:
```typescript
function toSessionMetadata(session: GameSession): SessionMetadata {
  return {
    joinCode: session.joinCode,
    playerCount: session.players.length,
    connectedPlayerCount: session.players.filter(p => p.isConnected).length,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity || session.createdAt,
    gameState: session.gameState,
    questionNumber: session.currentQuestionNumber,
  };
}
```

---

### 3. GMSessionListResponse (NEW)

**Purpose**: Response structure for `gm:getActiveSessions` event.

**Fields**:
```typescript
export interface GMSessionListResponse {
  sessions: SessionMetadata[];  // Array of sessions for this GM password
  totalCount: number;           // Number of sessions found
}
```

**Constraints**:
- `sessions` is sorted by `lastActivity` descending (most recent first)
- `totalCount` equals `sessions.length` (no pagination, so always equal)
- If no sessions found, `sessions` is empty array `[]` and `totalCount` is `0`

**Example** (2 sessions found):
```typescript
{
  sessions: [
    {
      joinCode: 'XYZ789',
      playerCount: 3,
      connectedPlayerCount: 3,
      createdAt: 1705268000000,
      lastActivity: 1705268600000, // Most recent
      gameState: GameState.ACTIVE,
      questionNumber: 5,
    },
    {
      joinCode: 'ABC123',
      playerCount: 5,
      connectedPlayerCount: 4,
      createdAt: 1705267200000,
      lastActivity: 1705267800000, // Older
      gameState: GameState.WAITING,
      questionNumber: 0,
    },
  ],
  totalCount: 2,
}
```

**Example** (no sessions found):
```typescript
{
  sessions: [],
  totalCount: 0,
}
```

---

### 4. Player (EXISTING - No Changes)

**Purpose**: Represents a player in a session.

**Fields** (no changes):
```typescript
export interface Player {
  playerId: string;
  nickname: string;
  score: number;
  buzzerSound: BuzzerSound;
  isConnected: boolean;      // Used to calculate connectedPlayerCount
  lastBuzzTimestamp: number | null;
}
```

---

## Backend Logic

### Session Creation (Modified)

**Event**: `gm:createSession`

**Flow**:
1. Receive GM password (plaintext) from client
2. Hash password using bcrypt (10 salt rounds)
3. Create new GameSession object:
   - Generate unique `joinCode` (6-char alphanumeric)
   - Set `players` to empty array `[]`
   - Set `gameState` to `GameState.WAITING`
   - Set `currentQuestionNumber` to `0`
   - Set `createdAt` to `Date.now()`
   - Set `isActive` to `true`
   - Set `gmPasswordHash` to hashed password
   - Set `lastActivity` to `Date.now()`
4. Store session in Map: `sessions.set(joinCode, session)`
5. Return `{ success: true, joinCode, session }` to client

**Code Example**:
```typescript
const gmPasswordHash = await hashPassword(gmPassword);
const session: GameSession = {
  joinCode: generateJoinCode(),
  players: [],
  gameState: GameState.WAITING,
  currentQuestionNumber: 0,
  createdAt: Date.now(),
  isActive: true,
  gmPasswordHash,
  lastActivity: Date.now(),
};
sessions.set(session.joinCode, session);
```

---

### Get Active Sessions (New)

**Event**: `gm:getActiveSessions`

**Flow**:
1. Receive GM password (plaintext) from client
2. Hash password using bcrypt
3. Query all sessions from Map
4. Filter sessions by comparing password hash:
   ```typescript
   const matchingSessions = Array.from(sessions.values()).filter(session => {
     return await comparePassword(gmPassword, session.gmPasswordHash);
   });
   ```
5. Convert to SessionMetadata (exclude sensitive data)
6. Sort by `lastActivity` descending
7. Return `{ success: true, sessions: metadata, totalCount: metadata.length }`

**Code Example**:
```typescript
const allSessions = Array.from(sessionManager.getAllSessions().values());
const matchingSessions: GameSession[] = [];

for (const session of allSessions) {
  if (await comparePassword(gmPassword, session.gmPasswordHash)) {
    matchingSessions.push(session);
  }
}

const sessionMetadata = matchingSessions
  .map(toSessionMetadata)
  .sort((a, b) => b.lastActivity - a.lastActivity);

return {
  success: true,
  sessions: sessionMetadata,
  totalCount: sessionMetadata.length,
};
```

---

### Reconnect to Session (New)

**Event**: `gm:reconnectToSession`

**Flow**:
1. Receive `joinCode` and `gmPassword` from client
2. Find session by `joinCode`
3. If not found, return `{ success: false, error: 'SESSION_NOT_FOUND' }`
4. Verify password: `await comparePassword(gmPassword, session.gmPasswordHash)`
5. If password mismatch, return `{ success: false, error: 'SESSION_PASSWORD_MISMATCH' }`
6. Join GM socket to session room: `socket.join(joinCode)`
7. Update `lastActivity`: `session.lastActivity = Date.now()`
8. Broadcast `session:gmReconnected` to all clients in room (optional)
9. Return `{ success: true, session }` to GM

**Code Example**:
```typescript
const session = sessionManager.getSession(joinCode);
if (!session) {
  return { success: false, error: ErrorCode.SESSION_NOT_FOUND };
}

const passwordMatch = await comparePassword(gmPassword, session.gmPasswordHash);
if (!passwordMatch) {
  return { success: false, error: ErrorCode.SESSION_PASSWORD_MISMATCH };
}

socket.join(joinCode);
session.lastActivity = Date.now();

io.to(joinCode).emit('session:gmReconnected', {
  joinCode,
  timestamp: Date.now(),
});

return { success: true, session };
```

---

## Validation Rules

### Password Hashing

**Rule**: All GM passwords must be hashed with bcrypt before storage.

**Checks**:
- Never store plaintext passwords
- Use bcrypt with 10 salt rounds (consistent with player passwords)
- Password hash format: `$2a$10$...` (bcrypt format)

**Error Handling**:
- If hashing fails, return `INTERNAL_ERROR`

---

### Session Ownership Verification

**Rule**: Only GM with matching password can reconnect to session.

**Checks**:
- `gm:reconnectToSession`: Verify `comparePassword(gmPassword, session.gmPasswordHash)` returns `true`
- `gm:getActiveSessions`: Filter sessions by password hash match

**Error Codes**:
- `SESSION_PASSWORD_MISMATCH`: Password does not match session's stored hash
- `INVALID_GM_PASSWORD`: Password format invalid (too short, etc.)

---

### Session Metadata Privacy

**Rule**: SessionMetadata must never include sensitive data.

**Exclude from SessionMetadata**:
- `gmPasswordHash` (security risk)
- Player passwords (security risk)
- Player `playerId` (internal identifier, not needed for selection UI)
- Full `players` array (too heavy, not needed for selection)

**Include in SessionMetadata**:
- `joinCode`, `playerCount`, `connectedPlayerCount`, `createdAt`, `lastActivity`, `gameState`, `questionNumber`

---

## Database/Storage Notes

**Storage Type**: In-memory (Map structure)

**Session Map**:
```typescript
Map<string, GameSession>
// Key: joinCode (e.g., 'ABC123')
// Value: GameSession object (now includes gmPasswordHash)
```

**Persistence**: None. Sessions are ephemeral.

**Cleanup**:
- Existing 10-minute inactivity cleanup applies (unchanged)
- Sessions with `lastActivity + 10 minutes < now` are deleted
- No special cleanup for reconnected sessions

---

## Testing Scenarios

### Unit Tests (Backend)

**Password Hashing**:
- ✅ Hash password returns bcrypt format string
- ✅ Compare password with correct hash returns true
- ✅ Compare password with incorrect hash returns false
- ✅ Hash same password twice returns different hashes (salt randomness)

**Session Metadata**:
- ✅ toSessionMetadata excludes gmPasswordHash
- ✅ toSessionMetadata correctly counts connected vs total players
- ✅ toSessionMetadata uses lastActivity if present, createdAt as fallback

**Get Active Sessions**:
- ✅ Returns only sessions matching GM password hash
- ✅ Returns empty array if no sessions match
- ✅ Sorts sessions by lastActivity descending
- ✅ Does not return sessions with mismatched password

**Reconnect to Session**:
- ✅ Returns session if password matches
- ✅ Returns SESSION_PASSWORD_MISMATCH if password incorrect
- ✅ Returns SESSION_NOT_FOUND if session doesn't exist
- ✅ Joins GM socket to session room
- ✅ Updates lastActivity timestamp

### Integration Tests (Backend + WebSocket)

- ✅ GM creates session → gmPasswordHash stored
- ✅ GM calls getActiveSessions → receives matching sessions
- ✅ GM reconnects to session → receives full session data
- ✅ GM with wrong password cannot reconnect to session
- ✅ Multiple GMs with different passwords see different session lists

### E2E Tests (Playwright)

- ✅ GM creates session, refreshes page, sees session in list
- ✅ GM selects session from list, reconnects successfully
- ✅ GM creates new session when no existing sessions
- ✅ Session metadata displayed correctly (player count, timestamps, state)
- ✅ Session list sorted by most recent activity

---

**Status**: Data model complete. Ready for contract generation.
