# Implementation Plan: GM Session Reconnection

**Branch**: `002-gm-session-reconnect` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-gm-session-reconnect/spec.md`

## Summary

Allow Game Masters to reconnect to existing sessions after page refresh instead of being forced to create new sessions. After entering GM password, display a list of active sessions (with player count and metadata) for the GM to select from, or create a new session. Preserves game state, prevents session abandonment, enables smooth GM experience across page refreshes/disconnections.

**Technical Approach**: Store GM password hash with each session, implement `getGMSessions` WebSocket event to query sessions by password, add `reconnectToSession` event for GM to rejoin existing session, modify frontend GM page to show session selection UI after password entry, maintain backward compatibility with single-step session creation flow for new GMs.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS
**Primary Dependencies**:
- Backend: Express.js 4.x, Socket.IO 4.x, bcryptjs (for password hashing)
- Frontend: Next.js 14.x (App Router), React 18.x, shadcn/ui, Tailwind CSS 3.x
**Storage**: In-memory (Map/Object structures, no database)
**Testing**: Vitest 1.x (unit/integration), Playwright 1.x (E2E)
**Target Platform**: Web (desktop + mobile browsers), deployed on Fly.io
**Project Type**: Web application (separate backend/frontend)
**Performance Goals**:
- Session list retrieval <500ms
- Reconnection to session <1 second
- Support up to 50 concurrent sessions
**Constraints**:
- Mobile-first responsive design
- 44x44px minimum tap targets for buttons
- Password security (bcrypt hashing, no plaintext storage)
**Scale/Scope**: 5-10 sessions per GM password, 5-10 players per session, ephemeral sessions (auto-cleanup after 10min inactivity)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No project constitution file found (constitution.md is placeholder template).

**Assumed Principles** (based on existing codebase patterns):
- ✅ **Type Safety**: All WebSocket events strongly typed
- ✅ **Server Authority**: Server is single source of truth for game state
- ✅ **Mobile-First**: Responsive design, touch-optimized
- ✅ **No Persistence**: In-memory only, sessions are ephemeral
- ✅ **Real-Time Sync**: All state changes broadcast via WebSocket
- ✅ **Security**: Passwords hashed with bcrypt, never stored in plaintext

**Evaluation**: Feature aligns with existing patterns. Password hashing adds security layer consistent with player password handling. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/002-gm-session-reconnect/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (COMPLETE)
├── research.md          # Phase 0 output (TODO)
├── data-model.md        # Phase 1 output (TODO)
├── quickstart.md        # Phase 1 output (TODO)
├── contracts/           # Phase 1 output (TODO)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── types/
│   │   └── websocket-events.ts       # ADD: getGMSessions, reconnectToSession events
│   ├── event-handlers/
│   │   └── gm-handlers.ts            # MODIFY: Add getGMSessions, reconnectToSession handlers
│   ├── session-manager.ts            # MODIFY: Store gmPasswordHash, add getSessionsByPassword method
│   ├── utils/
│   │   └── password-utils.ts         # NEW: bcrypt hash/compare utilities
│   └── server.ts                     # MODIFY: Register new event handlers
└── tests/
    ├── unit/
    │   ├── password-utils.test.ts    # NEW: Test password hashing
    │   └── session-manager.test.ts   # MODIFY: Test getSessionsByPassword
    └── integration/
        └── gm-reconnect.test.ts      # NEW: Test end-to-end reconnection flow

frontend/
├── app/
│   └── gamemaster/page.tsx           # MODIFY: Add session selection UI after password entry
├── components/
│   ├── session-selector.tsx          # NEW: List of available sessions to reconnect
│   └── session-card.tsx              # NEW: Single session card with metadata
├── lib/
│   └── websocket-events.ts           # MODIFY: Add new event types
└── tests/
    └── e2e/
        └── gm-reconnect-flow.spec.ts # NEW: Playwright test for reconnection
```

**Structure Decision**: Web application structure with separate backend (Express + Socket.IO) and frontend (Next.js). Matches existing trivia-simple-app architecture. Backend stores GM password hash with each session, provides query endpoint. Frontend adds session selection step between password entry and session access.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. Feature follows existing patterns.

---

# Phase 0: Outline & Research

## Research Tasks

### 1. Password Hashing Strategy for GM Passwords
**Question**: Should we use the same bcrypt hashing approach for GM passwords as for player passwords, or use a different strategy?

**Research Focus**:
- Existing password handling in player authentication
- bcrypt salt rounds (10-12 recommended for web apps)
- Performance impact of bcrypt on session creation (hashing happens once per session)
- Security best practices for ephemeral session authentication

**Decision Needed**: Confirm bcrypt parameters (salt rounds, hash storage format)

---

### 2. Session Metadata Structure
**Question**: What metadata should be displayed in the session list to help GM identify the correct session?

**Research Focus**:
- Key identifiers: join code, player count, creation timestamp, last activity
- Human-readable formats: "5 players, created 10 minutes ago"
- Sorting: Most recent first, or most active first?
- Mobile display considerations (limited screen space)

**Decision Needed**: Define SessionMetadata interface fields and display format

---

### 3. Session Ownership Model
**Question**: Should sessions be permanently tied to the GM password that created them, or allow password changes?

**Research Focus**:
- Use case: GM wants to change password mid-session
- Security implications: Allowing password changes vs immutable ownership
- Simplicity: Password hash stored at creation, never updated
- Edge case: GM forgets password, loses access to sessions

**Decision Needed**: Immutable password hash vs updateable ownership

---

### 4. Concurrent GM Connections
**Question**: What happens if a GM connects to the same session from two different browser tabs?

**Research Focus**:
- Socket.IO room mechanics: Multiple sockets with same session ID
- State synchronization: Both tabs receive same broadcasts
- User experience: Should we prevent concurrent connections or allow them?
- Edge cases: Tab A makes action, Tab B sees update

**Decision Needed**: Allow or prevent concurrent GM connections to same session

---

### 5. Session List Pagination
**Question**: Should we paginate the session list, or return all sessions for a given password?

**Research Focus**:
- Typical usage: How many sessions does a GM create in 10 minutes (cleanup window)?
- Realistic scenario: 1-3 active sessions, rarely more than 5
- Performance: Returning 5-10 sessions vs 50+ sessions
- UX: Scrollable list vs paginated view

**Decision Needed**: Pagination strategy (none, infinite scroll, or page-based)

---

## Output

All findings will be consolidated in `research.md` with format:
- **Decision**: [chosen approach]
- **Rationale**: [why chosen]
- **Alternatives Considered**: [what else evaluated]
- **Implementation Notes**: [practical considerations]

---

# Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

## 1. Data Model (`data-model.md`)

### Entities to Define

#### GameSession (MODIFY)
- Add `gmPasswordHash: string` field to store hashed GM password
- Stored at session creation, used for ownership verification
- Never transmitted to client

#### SessionMetadata (NEW)
- `joinCode: string`
- `playerCount: number` (count of players, including disconnected)
- `connectedPlayerCount: number` (count of connected players only)
- `createdAt: number` (Unix timestamp)
- `lastActivity: number` (Unix timestamp)
- `gameState: GameState` (waiting, active, scoring, ended)
- `questionNumber: number` (current question number)

**Purpose**: Lightweight structure for displaying session list to GM without exposing full session data.

#### GMSessionListResponse (NEW)
- `sessions: SessionMetadata[]` (array of available sessions)
- `totalCount: number` (number of sessions found)

---

## 2. API Contracts (`contracts/`)

### New WebSocket Events

#### Client → Server

**`gm:getActiveSessions`** (NEW)
```typescript
{
  gmPassword: string; // Plaintext password (hashed on server for comparison)
}
→ callback: {
  success: boolean;
  sessions?: SessionMetadata[];
  totalCount?: number;
  error?: string;
}
```
- Server hashes provided password
- Queries all active sessions, filters by matching `gmPasswordHash`
- Returns SessionMetadata array (sorted by lastActivity desc)
- If no sessions found, returns empty array (not an error)

**`gm:reconnectToSession`** (NEW)
```typescript
{
  joinCode: string;
  gmPassword: string; // For verification
}
→ callback: {
  success: boolean;
  session?: GameSession;
  error?: string;
}
```
- Server validates session exists
- Server verifies password hash matches session's `gmPasswordHash`
- Joins GM socket to session room
- Returns full session data (players, scores, state, etc.)

**`gm:createSession`** (MODIFIED)
```typescript
{
  gmPassword: string;
}
→ callback: {
  success: boolean;
  joinCode?: string;
  session?: GameSession; // NEW: Also return full session data
  error?: string;
}
```
- Existing behavior: Create new session, hash password, store hash
- MODIFIED: Also return full session data in callback (not just joinCode)
- Frontend can immediately transition to GM interface

---

#### Server → Client

**`session:gmReconnected`** (NEW)
```typescript
{
  joinCode: string;
  timestamp: number;
}
```
- Broadcast to all clients when GM reconnects to existing session
- Informs players that GM is back (optional UI notification)

---

### Modified Error Codes

**ErrorCode enum** (ADD):
```typescript
SESSION_PASSWORD_MISMATCH = 'SESSION_PASSWORD_MISMATCH',
NO_SESSIONS_FOUND = 'NO_SESSIONS_FOUND', // Not strictly an error, but informational
```

**ERROR_MESSAGES** (ADD):
```typescript
[ErrorCode.SESSION_PASSWORD_MISMATCH]: 'Incorrect GM password for this session.',
[ErrorCode.NO_SESSIONS_FOUND]: 'No active sessions found for this password.',
```

---

## 3. Quickstart Guide (`quickstart.md`)

Document:
- How GM workflow changes: Enter password → See session list (if any exist) → Select session or create new
- How to reconnect to an existing session (click on session card)
- How to create a new session (click "Create New Session" button)
- What happens when multiple sessions exist (list sorted by recent activity)
- What happens when no sessions exist (automatically show create new session form)
- Security note: Session ownership tied to password, cannot transfer sessions

---

## 4. Agent Context Update

Run: `.specify/scripts/bash/update-agent-context.sh claude`

Updates: `/Users/windrich/Documents/fun-gym/trivia-simple-app/CLAUDE.md`

Add to "Recent Changes":
```
- 002-gm-session-reconnect: Added
```

**Preserve manual additions** between `<!-- MANUAL ADDITIONS START -->` and `<!-- MANUAL ADDITIONS END -->` markers.

---

## Key Rules Compliance

- ✅ Using absolute paths throughout
- ✅ All NEEDS CLARIFICATION items moved to Phase 0 research tasks
- ✅ No gate failures detected (no constitution violations)
- ✅ Technical Context fully specified (no unknowns)

---

**Next Steps**:
1. Execute Phase 0 research tasks → generate `research.md`
2. Execute Phase 1 design → generate `data-model.md`, `contracts/`, `quickstart.md`
3. Stop and report (Phase 2 tasks generation happens via `/speckit.tasks` command)
