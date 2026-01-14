# Research: GM Session Reconnection

**Feature**: 002-gm-session-reconnect
**Date**: 2026-01-14
**Status**: Complete

This document consolidates research findings for technical decisions required by the GM Session Reconnection feature.

---

## 1. Password Hashing Strategy for GM Passwords

### Decision
Use **bcryptjs** with **10 salt rounds** for GM password hashing, matching the existing player password handling.

### Rationale
- **Consistency**: Players already use bcrypt for password hashing (existing codebase pattern)
- **Security**: bcrypt is industry-standard for password hashing, resistant to rainbow table and brute-force attacks
- **Performance**: 10 salt rounds provides strong security (2^10 = 1024 iterations) while keeping hash time under 100ms
- **Dependency**: bcryptjs already in project (no new dependency needed)
- **Simplicity**: Same utility functions can be reused for both GM and player passwords

### Alternatives Considered
- **Argon2**: More modern, but requires native dependencies (not ideal for Fly.io deployment)
- **Plaintext comparison**: Insecure, rejected immediately
- **Simple hashing (SHA-256)**: Fast but vulnerable to rainbow tables without salting

### Implementation Pattern
```typescript
// utils/password-utils.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Implementation Notes
- Hash password once when session is created (`gm:createSession`)
- Store hash in `session.gmPasswordHash` field (never in plaintext)
- Compare passwords using `bcrypt.compare()` for `gm:getActiveSessions` and `gm:reconnectToSession`
- Never transmit password hash to client (security risk)
- Performance impact: ~50-100ms per hash operation (acceptable for session creation)

---

## 2. Session Metadata Structure

### Decision
Include **comprehensive metadata** for GM session selection: join code, player counts (total + connected), timestamps (created + last activity), game state, question number.

### Rationale
- **Join Code**: Primary identifier, allows GM to recognize specific session
- **Player Counts**: Shows session activity level (5 players vs 0 players)
- **Connected Count**: Indicates if players are currently active (5 connected vs 2 connected)
- **Created At**: Helps GM identify older vs newer sessions ("Created 5 minutes ago")
- **Last Activity**: Shows session freshness ("Active 2 minutes ago")
- **Game State**: Shows if game is waiting, active, scoring, or ended
- **Question Number**: Shows progress through trivia game ("Question 5")

### SessionMetadata Interface
```typescript
export interface SessionMetadata {
  joinCode: string;              // e.g., "ABC123"
  playerCount: number;           // Total players (including disconnected)
  connectedPlayerCount: number;  // Currently connected players
  createdAt: number;             // Unix timestamp (ms)
  lastActivity: number;          // Unix timestamp (ms)
  gameState: GameState;          // waiting | active | scoring | ended
  questionNumber: number;        // Current question (0-based or 1-based)
}
```

### Display Format (Frontend)
```tsx
<SessionCard>
  <h3>{session.joinCode}</h3>
  <p>{session.connectedPlayerCount}/{session.playerCount} players online</p>
  <p>Question {session.questionNumber} • {session.gameState}</p>
  <p>Created {timeAgo(session.createdAt)}</p>
  <p>Last active {timeAgo(session.lastActivity)}</p>
</SessionCard>
```

### Sorting Strategy
Sort sessions by **lastActivity descending** (most recently active first). This ensures GM sees their actively-used sessions at the top.

### Alternatives Considered
- **Minimal metadata** (join code only): Too little info, GM can't distinguish sessions
- **Full session data** (including all players): Too heavy, unnecessary for selection UI
- **Sort by createdAt**: Less useful than lastActivity (old but active session should be prioritized)

### Implementation Notes
- Generate SessionMetadata from full GameSession object (map/filter)
- Exclude sensitive data: password hashes, player passwords, internal IDs
- Use `date-fns` or similar for human-readable time formatting ("5 minutes ago")
- Mobile-first design: Stack metadata vertically for narrow screens

---

## 3. Session Ownership Model

### Decision
**Immutable password hash** - sessions are permanently tied to the GM password that created them. No password changes allowed.

### Rationale
- **Simplicity**: Password hash stored at creation, never updated (fewer edge cases)
- **Security**: Clear ownership model, no ambiguity about who controls a session
- **Ephemeral Sessions**: Sessions only live for 10 minutes (inactivity cleanup), password changes unlikely in that window
- **Use Case**: GMs typically run one trivia game, not long-running campaigns requiring password rotation

### Edge Case Handling
- **GM forgets password**: Session becomes inaccessible after 10 minutes (auto-cleanup), acceptable loss for ephemeral sessions
- **GM wants to change password**: Must close existing sessions and create new ones (or wait for cleanup)
- **Multiple GMs**: Each GM password creates independent sessions (no sharing)

### Alternatives Considered
- **Updateable ownership**: Requires `gm:changePassword` event, password verification, re-hashing, added complexity for minimal benefit
- **Session transfer**: Requires ownership handoff mechanism, security risks (who can transfer? how to verify?)

### Implementation Notes
- `session.gmPasswordHash` set once in `createSession()`, never modified
- No `updatePassword()` or `transferOwnership()` methods
- Frontend: No "Change Password" UI for existing sessions
- Documentation: Clearly state that password cannot be changed for active sessions

---

## 4. Concurrent GM Connections

### Decision
**Allow concurrent GM connections** to the same session from multiple browser tabs/devices.

### Rationale
- **Socket.IO supports it**: Multiple sockets can join the same room, all receive broadcasts
- **Flexibility**: GM might open session on laptop, then check progress on phone
- **No conflicts**: GM actions (start question, assign points) are processed sequentially by server
- **State sync**: Both tabs/devices see same updates via WebSocket broadcasts
- **Edge case rarity**: Most GMs use one device/tab, concurrent connections are rare

### Behavior
- GM opens Tab A, reconnects to session "ABC123"
- GM opens Tab B, reconnects to same session "ABC123"
- Both tabs receive all `session:updated`, `game:stateChanged`, `buzzer:pressed` events
- If Tab A clicks "Start Question", Tab B sees game state change to ACTIVE
- If Tab B assigns points, Tab A sees player score update

### Alternatives Considered
- **Prevent concurrent connections**: Requires tracking "GM socket ID" per session, disconnect old socket when new one connects. Adds complexity, breaks valid use case (GM switches devices mid-game).
- **Warn on concurrent connections**: UI shows "You are connected from another tab", but still allows it. Could add later if issues arise.

### Implementation Notes
- No special handling needed (Socket.IO handles this by default)
- Multiple sockets in same room all receive broadcasts
- Server doesn't track "active GM socket ID"
- Frontend: No locking mechanism, no "session in use" errors

---

## 5. Session List Pagination

### Decision
**No pagination** - return all sessions for a given password (unpaginated list).

### Rationale
- **Realistic scale**: GMs create 1-3 sessions per 10-minute window (cleanup), rarely more than 5
- **Performance**: Returning 5-10 SessionMetadata objects (~500 bytes each) = 2.5-5KB payload, negligible
- **UX simplicity**: Single scrollable list, no "Load More" button, no page numbers
- **Edge case handling**: Even if GM somehow has 50 sessions, 25KB payload is acceptable for modern browsers

### Scrollable List (Frontend)
```tsx
<div className="session-list overflow-y-auto max-h-[60vh]">
  {sessions.map(session => (
    <SessionCard key={session.joinCode} session={session} />
  ))}
</div>
```

### Fallback (if needed later)
If usage patterns change and GMs regularly have 20+ active sessions:
- Add `limit` and `offset` parameters to `gm:getActiveSessions`
- Implement infinite scroll or "Load More" button
- Current decision: **YAGNI** (You Aren't Gonna Need It)

### Alternatives Considered
- **Limit to 10 sessions**: Arbitrary cutoff, what if GM has 11? How to select which 10?
- **Infinite scroll**: Adds complexity for no current benefit
- **Page-based pagination**: Poor UX on mobile, unnecessary for small datasets

### Implementation Notes
- `gm:getActiveSessions` returns all matching sessions (no limit parameter)
- Sort by `lastActivity desc` (most recent first)
- Frontend: Scrollable container with `overflow-y-auto`
- Mobile: Session cards stack vertically, large tap targets (44x44px minimum)

---

## Summary of Decisions

| Research Area | Decision | Key Benefit |
|---------------|----------|-------------|
| Password Hashing | bcryptjs with 10 salt rounds | Security + consistency with existing code |
| Session Metadata | Comprehensive (join code, players, timestamps, state) | GM can easily identify sessions |
| Session Ownership | Immutable password hash | Simplicity, matches ephemeral session model |
| Concurrent Connections | Allow multiple GM sockets per session | Flexibility, no conflicts |
| Session List Pagination | No pagination (return all) | Simple, sufficient for realistic usage |

---

**Status**: All research complete. Ready for Phase 1 (Design & Contracts).
