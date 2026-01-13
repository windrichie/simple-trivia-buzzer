# Data Model: Trivia Buzzer App

**Feature**: 001-trivia-buzzer-app
**Date**: 2026-01-11
**Purpose**: Define core entities, relationships, and state machines for the trivia buzzer system

## Overview

This application uses an in-memory data model stored in server-side RAM. All entities are ephemeral and discarded when the server restarts or sessions expire.

---

## Core Entities

### 1. GameSession

Represents a single trivia game instance.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `joinCode` | `string` | Unique 6-character alphanumeric identifier | Required, unique, uppercase, [A-Z2-9]{6} |
| `gmPasswordHash` | `string` | Hardcoded GM password for session control | Required, from environment variable |
| `players` | `Map<playerId, Player>` | Collection of players in this session | Max 5 players |
| `gameState` | `GameState` | Current question stage | Required, enum: 'waiting' \| 'active' \| 'scoring' |
| `currentQuestion` | `Question \| null` | Current question data (if any) | Optional |
| `createdAt` | `number` | Timestamp of session creation | Required, Date.now() |
| `lastActivity` | `number` | Timestamp of last activity in session | Required, updated on any event |
| `isActive` | `boolean` | Whether session is active or ended | Required, default true |

**Relationships**:
- One-to-Many with `Player` (1 session has 3-5 players)
- One-to-One with `Question` (1 session has 0 or 1 active question at a time)

**Lifecycle**:
1. Created when GM creates session
2. Active while players/GM connected and game running
3. Inactive when GM ends game or 2+ hours of inactivity
4. Cleaned up by background cleanup process

---

### 2. Player

Represents a participant in a game session.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `playerId` | `string` | Unique identifier (UUID) | Required, unique |
| `joinCode` | `string` | Session they belong to | Required, foreign key |
| `nickname` | `string` | Player's chosen display name | Required, 1-20 chars, alphanumeric + spaces |
| `password` | `string` | Personal password for reconnection | Required, 4-20 chars |
| `score` | `number` | Current score in game | Required, default 0, can be negative |
| `buzzerSound` | `BuzzerSound` | Selected buzzer sound | Required, default 'classic' |
| `connectionId` | `string \| null` | Socket.IO connection ID | Optional, null when disconnected |
| `isConnected` | `boolean` | Connection status | Required, default true |
| `lastBuzzTimestamp` | `number \| null` | Timestamp of last buzzer press | Optional, reset each question |
| `createdAt` | `number` | When player joined | Required, Date.now() |

**Relationships**:
- Many-to-One with `GameSession` (player belongs to 1 session)
- One-to-Many with `BuzzerEvent` (player can press buzzer multiple times across questions)

**Validation Rules**:
- Nickname must be unique within a session
- Password is plain text (stored in memory only, acceptable for casual game)
- Score can be negative (wrong answers deduct points)
- `buzzerSound` must be one of the available sound options

**Reconnection Logic**:
- Match player by `(joinCode, nickname, password)` triple
- Restore `score`, `buzzerSound` from stored state
- Update `connectionId` and `isConnected = true`

---

### 3. Question

Represents the current question state in a session.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `questionNumber` | `number` | Sequential question number in session | Required, starts at 1 |
| `state` | `GameState` | Current stage of question | Required, enum: 'waiting' \| 'active' \| 'scoring' |
| `startedAt` | `number` | When question became active | Required, Date.now() |
| `buzzerPresses` | `BuzzerEvent[]` | All buzzer presses for this question | Array, empty initially |
| `firstBuzzerId` | `string \| null` | Player ID who buzzed first | Optional, null until someone buzzes |

**Relationships**:
- One-to-One with `GameSession` (belongs to 1 session)
- One-to-Many with `BuzzerEvent` (can have multiple buzzer presses)

**State Transitions**:
```
waiting → active (GM starts question)
active → scoring (GM moves to scoring, requires at least 1 buzz)
active → waiting (GM skips question, no buzzes required)
scoring → waiting (GM completes scoring)
```

---

### 4. BuzzerEvent

Represents a single buzzer press by a player.

**Fields**:
| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `playerId` | `string` | Player who pressed buzzer | Required |
| `timestamp` | `number` | Server timestamp of press | Required, Date.now() |
| `questionNumber` | `number` | Question this buzz belongs to | Required |
| `isFirst` | `boolean` | Whether this was the first press | Required, determined by server |

**Relationships**:
- Many-to-One with `Player` (buzzer press belongs to 1 player)
- Many-to-One with `Question` (buzzer press belongs to 1 question)

**Processing Logic**:
1. Client sends buzzer press event
2. Server timestamps with `Date.now()`
3. Server adds to `question.buzzerPresses` array
4. Server determines `isFirst` by comparing timestamps
5. If timestamps identical, random selection among tied players
6. Server broadcasts first buzzer to all clients

---

## Enumerations

### GameState

```typescript
enum GameState {
  WAITING = 'waiting',   // Initial state or between questions
  ACTIVE = 'active',     // Question active, buzzers enabled
  SCORING = 'scoring'    // GM assigning points, buzzers disabled
}
```

**State Transition Rules**:
- `WAITING → ACTIVE`: Always allowed (GM starts question)
- `ACTIVE → SCORING`: Requires at least 1 buzzer press
- `ACTIVE → WAITING`: Always allowed (GM skips question)
- `SCORING → WAITING`: Always allowed (GM completes scoring)
- `SCORING → ACTIVE`: Not allowed (must return to WAITING first)

---

### BuzzerSound

```typescript
enum BuzzerSound {
  CLASSIC = 'classic',       // Classic game show buzzer
  HORN = 'horn',             // Air horn sound
  BELL = 'bell',             // Ding bell
  BOING = 'boing',           // Cartoon boing
  CHIME = 'chime',           // Pleasant chime
  WHOOSH = 'whoosh',         // Whoosh sound
  BEEP = 'beep',             // Electronic beep
  DING = 'ding',             // Short ding
  BUZZ = 'buzz',             // Electric buzz
  WHISTLE = 'whistle'        // Referee whistle
}
```

**Total**: 10 pre-defined sounds
**Storage**: Static assets in `public/sounds/` directory
**Format**: MP3 (primary) with OGG fallback

---

## State Machines

### Session Lifecycle State Machine

```
┌─────────────────────────────────────────────┐
│         Session Created (WAITING)           │
│                                             │
│  - joinCode generated                       │
│  - players = empty Map                      │
│  - gameState = WAITING                      │
│  - isActive = true                          │
└──────────────┬──────────────────────────────┘
               │
               │ Players join
               ↓
┌─────────────────────────────────────────────┐
│      Active Session (players joined)        │
│                                             │
│  - 1-5 players connected                    │
│  - Can transition through question states   │
│  - Scores tracked per player                │
└──────────────┬──────────────────────────────┘
               │
               │ GM ends game OR 2+ hrs inactivity
               ↓
┌─────────────────────────────────────────────┐
│          Session Ended (inactive)           │
│                                             │
│  - isActive = false                         │
│  - No new players can join                  │
│  - Scheduled for cleanup                    │
└─────────────────────────────────────────────┘
```

---

### Question Flow State Machine

```
        ┌─────────────────────┐
        │      WAITING        │
        │ (buzzers disabled)  │
        └──────┬──────────────┘
               │
               │ GM starts question
               ↓
        ┌─────────────────────┐
        │       ACTIVE        │
        │ (buzzers enabled)   │◄────┐
        └──────┬──────────────┘     │
               │                     │ GM skips
               │ GM → scoring        │ (no buzzes)
               │ (requires ≥1 buzz)  │
               ↓                     │
        ┌─────────────────────┐     │
        │      SCORING        │     │
        │  (assign points)    │     │
        └──────┬──────────────┘     │
               │                     │
               │ GM completes        │
               │ scoring             │
               └─────────────────────┘
                     (back to WAITING)
```

---

## Validation Rules Summary

### Session-Level Validation
- ✓ Max 5 players per session
- ✓ Join code must be unique across all active sessions
- ✓ Session must have at least 1 player to remain active
- ✓ GM password must match environment variable

### Player-Level Validation
- ✓ Nickname must be unique within session
- ✓ Nickname: 1-20 characters, alphanumeric + spaces only
- ✓ Password: 4-20 characters
- ✓ Buzzer sound must be valid BuzzerSound enum value
- ✓ Score can be any integer (positive or negative)

### Question-Level Validation
- ✓ Cannot transition ACTIVE → SCORING if no buzzer presses
- ✓ Can skip question (ACTIVE → WAITING) regardless of buzzes
- ✓ Question number must increment sequentially
- ✓ Buzzer presses only recorded when state = ACTIVE

### Buzzer Event Validation
- ✓ Only process buzzer events in ACTIVE state
- ✓ Player must be connected to press buzzer
- ✓ Server timestamp is authoritative (ignore client timestamps)
- ✓ First buzzer determined by lowest timestamp

---

## In-Memory Storage Structure

```typescript
// Server-side storage
class SessionStore {
  private sessions: Map<JoinCode, GameSession> = new Map();
  private lastActivity: Map<JoinCode, number> = new Map();

  // Methods
  createSession(joinCode: string): GameSession
  getSession(joinCode: string): GameSession | undefined
  deleteSession(joinCode: string): void
  updateActivity(joinCode: string): void
  cleanupInactiveSessions(): void  // Run every 10 minutes
}
```

**Memory Estimation**:
- 1 GameSession: ~1KB (join code, state, timestamps)
- 1 Player: ~500 bytes (nickname, password, score, connection)
- 5 Players per session: ~2.5KB
- Total per session: ~3.5KB
- 100 concurrent sessions: ~350KB (negligible)

---

## Data Flow Examples

### Example 1: Player Joins Session

```
1. Client → Server: emit('session:join', { joinCode, nickname, password })
2. Server validates:
   - Session exists and isActive
   - Session has < 5 players
   - Nickname unique in session
3. Server creates Player:
   - Generate playerId (UUID)
   - Store nickname, password, connectionId
   - Add to session.players Map
   - Set score = 0, buzzerSound = 'classic'
4. Server → All Clients in room: emit('player:joined', player)
5. Server → Joining Client: emit('session:joined', { sessionState, players })
```

---

### Example 2: Buzzer Press Race Condition

```
Question State = ACTIVE

1. Player A presses buzzer (Client A → Server)
   - Client A plays sound locally immediately
   - Server timestamps: t1 = 1000

2. Player B presses buzzer (Client B → Server)
   - Client B plays sound locally immediately
   - Server timestamps: t2 = 1002

3. Player C presses buzzer (Client C → Server)
   - Client C plays sound locally immediately
   - Server timestamps: t3 = 1002 (tie with B!)

4. Server processing:
   - All buzzes: [A: 1000, B: 1002, C: 1002]
   - First buzz: A (lowest timestamp)
   - Tie-breaker for display: B vs C (random selection)

5. Server → All Clients: emit('buzzer:first', { playerId: A, playerName: 'Alice' })
6. Server → All Clients: emit('buzzer:pressed', [A, B, C] with timestamps)
```

---

### Example 3: Player Reconnection

```
1. Player disconnects (network issue)
   - Server marks player.isConnected = false
   - Server keeps player.connectionId = null
   - Score preserved in memory

2. Player reopens app, credentials auto-filled (localStorage)
   - Client → Server: emit('session:rejoin', { joinCode, nickname, password })

3. Server validates:
   - Session exists
   - Player with matching (joinCode, nickname, password) found
   - Update player.connectionId = new socket ID
   - Set player.isConnected = true

4. Server → Rejoining Client: emit('session:rejoined', { player, session state })
5. Server → All Clients: emit('player:reconnected', { playerId, nickname })
```

---

## Data Integrity Considerations

### Consistency
- Server is single source of truth
- All state changes broadcast to clients
- Clients render server state, never modify locally

### Race Conditions
- Buzzer timestamps: Server-authoritative, no client clock skew
- Simultaneous joins: Validated sequentially by server
- Score updates: Atomic operations on server

### Error Handling
- Invalid join code: Return error, don't crash
- Duplicate nickname: Return validation error
- Disconnect during scoring: Allow GM to continue
- Server restart: All sessions lost (acceptable per spec)

---

**Data Model Complete**: Ready for contract generation (Phase 1 - Contracts).
