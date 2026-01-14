# Data Model: Game End & Leaderboard

**Feature**: 003-game-end-leaderboard
**Date**: 2026-01-14
**Status**: Complete

This document defines the data structures and state transitions for the game end and leaderboard feature.

---

## Entity Definitions

### 1. GameState Enum (MODIFIED)

**Purpose**: Represents the current state of a game session.

**Changes**: Add `ENDED` state to existing enum.

```typescript
export enum GameState {
  WAITING = 'waiting',   // Existing: Waiting for GM to start question
  ACTIVE = 'active',     // Existing: Question active, buzzers enabled
  SCORING = 'scoring',   // Existing: GM reviewing buzzer presses, assigning points
  ENDED = 'ended',       // NEW: Game concluded, leaderboard displayed
}
```

**State Transition Diagram**:
```
┌─────────┐
│ WAITING │◄───────┐
└────┬────┘        │
     │             │
     │ gm:startQuestion
     │             │
     ▼             │
┌─────────┐        │
│ ACTIVE  │        │ gm:skipQuestion
└────┬────┘        │ gm:endQuestion
     │             │
     │ gm:moveToScoring
     │             │
     ▼             │
┌─────────┐        │
│ SCORING ├────────┘
└────┬────┘
     │
     │ gm:endGame (from any state)
     │
     ▼
┌─────────┐
│ ENDED   │
└────┬────┘
     │
     │ gm:startNewGame → back to WAITING (reset scores)
     │ gm:closeSession → session deleted
     │
     └─────► Session removed from memory
```

**Valid Transitions**:
- `WAITING → ACTIVE` (existing)
- `ACTIVE → SCORING` (existing)
- `SCORING → WAITING` (existing)
- `WAITING → ENDED` (new: end game without questions)
- `ACTIVE → ENDED` (new: end game during question)
- `SCORING → ENDED` (new: end game during scoring)
- `ENDED → WAITING` (new: start new game with same players)
- `ENDED → [deleted]` (new: close session)

**Invalid Transitions**: All others

---

### 2. LeaderboardEntry (NEW)

**Purpose**: Represents a single player's ranking in the final leaderboard.

**Fields**:
```typescript
export interface LeaderboardEntry {
  playerId: string;      // Unique player identifier (matches Player.playerId)
  nickname: string;      // Player's display name
  score: number;         // Final score
  rank: number;          // Ranking (1-based, shared for ties)
  isTied: boolean;       // true if multiple players share this rank
}
```

**Constraints**:
- `rank` starts at 1 (1st place)
- Tied players have identical `rank` values
- Entries sorted by rank ascending, then nickname ascending (within ties)

**Example** (5 players):
```typescript
[
  { playerId: 'p1', nickname: 'Alice', score: 30, rank: 1, isTied: true },
  { playerId: 'p3', nickname: 'Charlie', score: 30, rank: 1, isTied: true },
  { playerId: 'p5', nickname: 'Eve', score: 25, rank: 3, isTied: false },
  { playerId: 'p2', nickname: 'Bob', score: 20, rank: 4, isTied: false },
  { playerId: 'p4', nickname: 'David', score: 10, rank: 5, isTied: false },
]
```

**Ranking Rules** (Standard Competition Ranking):
- Two players tied for 1st → both rank 1, next player is rank 3 (not 2)
- Three players tied for 2nd → all rank 2, next player is rank 5 (not 3)

---

### 3. LeaderboardData (NEW)

**Purpose**: Container for complete leaderboard information, broadcast to all clients when game ends.

**Fields**:
```typescript
export interface LeaderboardData {
  entries: LeaderboardEntry[];  // Sorted leaderboard entries
  totalPlayers: number;         // Total players in session (including disconnected)
  timestamp: number;            // Unix timestamp when game ended
  sessionId: string;            // Join code (for reference)
}
```

**Constraints**:
- `entries` must be sorted by rank (ascending), then nickname (ascending)
- `totalPlayers` includes disconnected players (isConnected: false)
- `timestamp` set when `gm:endGame` is called
- `sessionId` matches the session's `joinCode`

**Example**:
```typescript
{
  entries: [
    { playerId: 'p1', nickname: 'Alice', score: 30, rank: 1, isTied: true },
    { playerId: 'p3', nickname: 'Charlie', score: 30, rank: 1, isTied: true },
    { playerId: 'p5', nickname: 'Eve', score: 25, rank: 3, isTied: false },
  ],
  totalPlayers: 5, // Even if 2 disconnected, count all
  timestamp: 1705267200000,
  sessionId: 'ABC123',
}
```

---

### 4. GameSession (MODIFIED)

**Purpose**: Represents an active game session. Modified to include leaderboard data when game ends.

**Changes**: Add optional `leaderboard` field.

```typescript
export interface GameSession {
  joinCode: string;                    // Existing
  players: Player[];                   // Existing
  gameState: GameState;                // Existing (now includes ENDED)
  currentQuestionNumber: number;       // Existing
  createdAt: number;                   // Existing
  isActive: boolean;                   // Existing (false when ENDED)
  leaderboard: LeaderboardData | null; // NEW: Populated when gameState === ENDED
}
```

**Field Rules**:
- `leaderboard` is `null` for states: WAITING, ACTIVE, SCORING
- `leaderboard` is populated when transitioning to ENDED state
- `leaderboard` is cleared when transitioning from ENDED → WAITING (via startNewGame)
- `isActive` is set to `false` when gameState becomes ENDED

---

### 5. Player (EXISTING - No Changes)

**Purpose**: Represents a player in a session.

**Fields** (no changes):
```typescript
export interface Player {
  playerId: string;
  nickname: string;
  score: number;              // Modified by gm:assignPoints
  buzzerSound: BuzzerSound;
  isConnected: boolean;
  lastBuzzTimestamp: number | null;
}
```

**Note**: When calculating leaderboard, include all players (even `isConnected: false`).

---

## State Transition Logic

### Transition to ENDED State

**Trigger**: `gm:endGame` event

**Pre-conditions**:
- Session exists
- GM has authority (password verified)

**Actions**:
1. Set `session.gameState = GameState.ENDED`
2. Set `session.isActive = false`
3. Generate `LeaderboardData`:
   - Calculate rankings using algorithm (see research.md)
   - Sort entries by rank, then nickname
   - Set timestamp to current time
4. Set `session.leaderboard = generatedLeaderboardData`
5. Broadcast `game:ended` event to all clients in room

**Post-conditions**:
- All clients display leaderboard
- Buzzer button disabled for all players
- GM sees "Start New Game" and "Close Session" buttons

---

### Transition from ENDED to WAITING (Start New Game)

**Trigger**: `gm:startNewGame` event

**Pre-conditions**:
- Session exists
- `session.gameState === GameState.ENDED`
- GM has authority

**Actions**:
1. Reset all player scores: `players.forEach(p => p.score = 0)`
2. Clear leaderboard: `session.leaderboard = null`
3. Reset question counter: `session.currentQuestionNumber = 0`
4. Set state: `session.gameState = GameState.WAITING`
5. Set active: `session.isActive = true`
6. Clear buzzer queue (if any buzzer state persists)
7. Broadcast `game:newGameStarted` event to all clients

**Post-conditions**:
- Players see cleared leaderboard
- Players see waiting state UI (buzzers disabled)
- Scores reset to 0
- GM can start new questions

---

### Transition from ENDED to Deleted (Close Session)

**Trigger**: `gm:closeSession` event

**Pre-conditions**:
- Session exists
- GM has authority
- (Optional: `session.gameState === GameState.ENDED` - can be enforced or allow from any state)

**Actions**:
1. Broadcast `session:closed` event to all clients in room
2. Disconnect all player sockets: `socket.disconnect(true)`
3. Remove session from memory: `sessionManager.deleteSession(joinCode)`

**Post-conditions**:
- All clients disconnected
- Session no longer exists in memory
- Join code invalid for future joins

---

## Validation Rules

### Leaderboard Generation

**Rule**: Leaderboard must be generated synchronously when `gameState` transitions to `ENDED`.

**Algorithm** (from research.md):
1. Copy all players from session
2. Sort by score descending, then nickname ascending
3. Iterate and assign ranks:
   - If player score equals previous player score → same rank, mark both as tied
   - Otherwise → increment rank counter
4. Return LeaderboardData with sorted entries

**Edge Cases**:
- **Zero players**: Return empty entries array, totalPlayers = 0
- **Single player**: Rank 1, isTied = false
- **All tied**: All players rank 1, all isTied = true
- **Negative scores**: Valid, sorted correctly (highest negative is better)

---

### State Transition Validation

**Rule**: Only GM can trigger state transitions to/from ENDED.

**Checks**:
- `gm:endGame`: Verify GM password before allowing
- `gm:startNewGame`: Verify gameState === ENDED
- `gm:closeSession`: Verify GM password

**Error Codes** (existing enum):
- `INVALID_STATE_TRANSITION`: If startNewGame called when not in ENDED state
- `INVALID_GM_PASSWORD`: If GM password incorrect
- `SESSION_NOT_FOUND`: If session doesn't exist

---

### Player Actions in ENDED State

**Rule**: Players cannot press buzzer when `gameState === ENDED`.

**Checks**:
- `player:pressBuzzer`: Return error if `session.gameState === GameState.ENDED`

**Error Code**: `BUZZER_DISABLED`

---

## Database/Storage Notes

**Storage Type**: In-memory (Map structure)

**Session Map**:
```typescript
Map<string, GameSession>
// Key: joinCode (e.g., 'ABC123')
// Value: GameSession object (including leaderboard when ENDED)
```

**Persistence**: None. Sessions are ephemeral.

**Cleanup**:
- Existing 10-minute inactivity cleanup applies to ENDED sessions
- Explicit cleanup via `gm:closeSession` removes immediately

---

## Testing Scenarios

### Unit Tests (Backend)

**Leaderboard Service**:
- ✅ No players → empty leaderboard
- ✅ Single player → rank 1, not tied
- ✅ Two players, different scores → ranks 1 and 2
- ✅ Two players, same score → both rank 1 (tied), next would be rank 3
- ✅ Three players tied, then one unique → ranks 1, 1, 1 (tied), 4
- ✅ Alphabetical ordering within tied ranks
- ✅ Negative scores handled correctly
- ✅ All players same score → all rank 1 (tied)

**State Transitions**:
- ✅ WAITING → ENDED (valid)
- ✅ ACTIVE → ENDED (valid)
- ✅ SCORING → ENDED (valid)
- ✅ ENDED → WAITING (valid with startNewGame)
- ✅ ENDED → deleted (valid with closeSession)
- ✅ ENDED → ACTIVE (invalid, should error)

### Integration Tests (Backend + WebSocket)

- ✅ GM ends game → `game:ended` broadcast received by all clients
- ✅ Leaderboard data correct (rankings, ties, alphabetical order)
- ✅ GM starts new game → scores reset, state returns to WAITING
- ✅ GM closes session → all clients disconnected, session deleted
- ✅ Player tries to buzz in ENDED state → error returned

### E2E Tests (Playwright)

- ✅ Full game flow: create session, play questions, end game, see leaderboard
- ✅ Leaderboard displays correctly on both GM and player screens
- ✅ Tie handling: 3 players with same score show as rank 1 (tied)
- ✅ Start new game: leaderboard clears, scores reset, can play again
- ✅ Close session: all players see disconnect message

---

**Status**: Data model complete. Ready for contract generation.
