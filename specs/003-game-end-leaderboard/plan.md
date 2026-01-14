# Implementation Plan: Game End & Leaderboard

**Branch**: `003-game-end-leaderboard` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-game-end-leaderboard/spec.md`

## Summary

Add game conclusion functionality with celebratory leaderboard display. When GM ends a game, all participants see a ranked leaderboard with final scores, tie handling, and visual celebration elements. Includes "Start New Game" (reset scores, keep players) and "Close Session" (disconnect all, cleanup) options.

**Technical Approach**: Extend GameState enum with ENDED state, add ranking calculation algorithm with tie support, implement WebSocket events for game end broadcast, create responsive leaderboard UI component with confetti animations and podium visualization, ensure mobile-optimized display.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS
**Primary Dependencies**:
- Backend: Express.js 4.x, Socket.IO 4.x
- Frontend: Next.js 14.x (App Router), React 18.x, shadcn/ui, Tailwind CSS 3.x
**Storage**: In-memory (Map/Object structures, no database)
**Testing**: Vitest 1.x (unit/integration), Playwright 1.x (E2E)
**Target Platform**: Web (desktop + mobile browsers), deployed on Fly.io
**Project Type**: Web application (separate backend/frontend)
**Performance Goals**:
- Leaderboard broadcast to all clients <1 second
- Animations at 60fps on mobile devices
- Support up to 50 concurrent game sessions
**Constraints**:
- Mobile-first responsive design
- 44x44px minimum tap targets for buttons
- Offline: Not required (WebSocket-dependent)
**Scale/Scope**: 5-10 players per session, ephemeral sessions (auto-cleanup after 10min inactivity)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No project constitution file found (constitution.md is placeholder template).

**Assumed Principles** (based on existing codebase patterns):
- ✅ **Type Safety**: All WebSocket events strongly typed
- ✅ **Server Authority**: Server is single source of truth for game state
- ✅ **Mobile-First**: Responsive design, touch-optimized
- ✅ **No Persistence**: In-memory only, sessions are ephemeral
- ✅ **Real-Time Sync**: All state changes broadcast via WebSocket

**Evaluation**: Feature aligns with existing patterns. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/003-game-end-leaderboard/
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
│   │   └── websocket-events.ts       # ADD: GameState.ENDED, LeaderboardEntry, LeaderboardData
│   ├── event-handlers/
│   │   └── gm-handlers.ts            # MODIFY: Add endGame handler
│   ├── services/
│   │   └── leaderboard-service.ts    # NEW: Ranking calculation logic
│   ├── session-manager.ts            # MODIFY: Add resetSession, closeSession methods
│   └── server.ts                     # MODIFY: Register new event handlers
└── tests/
    ├── unit/
    │   └── leaderboard-service.test.ts  # NEW: Test ranking algorithm
    └── integration/
        └── game-end.test.ts             # NEW: Test end-to-end game end flow

frontend/
├── app/
│   ├── gamemaster/page.tsx           # MODIFY: Add "End Game" button, post-game actions
│   └── player/page.tsx               # MODIFY: Handle gameEnded event, show leaderboard
├── components/
│   ├── leaderboard.tsx               # NEW: Leaderboard display component
│   ├── confetti.tsx                  # NEW: Confetti animation component
│   └── game-master-controls.tsx      # MODIFY: Add end game button
├── lib/
│   └── websocket-events.ts           # MODIFY: Add new event types
└── tests/
    └── e2e/
        └── game-end-flow.spec.ts     # NEW: Playwright test for full flow
```

**Structure Decision**: Web application structure with separate backend (Express + Socket.IO) and frontend (Next.js). Matches existing trivia-simple-app architecture. Backend handles game state transitions and ranking calculations server-side. Frontend receives broadcast events and renders leaderboard client-side.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. Feature follows existing patterns.

---

# Phase 0: Outline & Research

## Research Tasks

### 1. Ranking Algorithm with Tie Handling
**Question**: What's the standard algorithm for ranking players with tied scores in competitive games?

**Research Focus**:
- Dense rank vs standard competition ranking vs ordinal ranking
- How to handle ties (shared rank numbers, alphabetical ordering within ties)
- Examples from quiz/trivia platforms (Kahoot, Quizizz)

**Decision Needed**: Choose ranking algorithm that matches spec requirements (FR-006, FR-007)

---

### 2. Leaderboard Animation Libraries
**Question**: What's the best approach for celebratory animations (confetti, transitions) in React/Next.js?

**Research Focus**:
- Confetti libraries: react-confetti, canvas-confetti, react-rewards
- Performance on mobile browsers (60fps requirement)
- Bundle size impact
- Tailwind CSS animation capabilities for podium/trophy effects

**Decision Needed**: Choose animation library/approach that balances visual appeal with performance

---

### 3. WebSocket Broadcast Patterns for Game End
**Question**: Best practices for broadcasting game-ending events and handling disconnections during leaderboard display?

**Research Focus**:
- Socket.IO room-wide broadcasts vs individual emits
- Handling players who disconnect after game ends but before seeing leaderboard
- State synchronization when GM disconnects during ENDED state
- Event sequencing for state transition + leaderboard data

**Decision Needed**: Determine event flow and error handling for game end broadcast

---

### 4. Mobile Animation Performance
**Question**: How to ensure smooth animations (60fps) on mobile devices for confetti and podium effects?

**Research Focus**:
- CSS animations vs JavaScript animations (requestAnimationFrame)
- GPU acceleration techniques (transform, opacity)
- Reducing reflows/repaints
- Testing on iOS Safari vs Chrome Mobile

**Decision Needed**: Animation implementation strategy for mobile performance target

---

### 5. Session Cleanup Timing
**Question**: Should ENDED sessions be cleaned up immediately or after a grace period?

**Research Focus**:
- User experience: How long should leaderboard remain accessible?
- Resource management: Immediate cleanup vs delayed cleanup
- Reconnection scenarios: Player refreshes during leaderboard view
- Existing cleanup interval (10 minutes) vs custom logic for ENDED sessions

**Decision Needed**: Session lifecycle policy for ENDED state

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

#### GameState Enum (MODIFY)
- Add `ENDED = 'ended'` state
- Document state transition diagram: WAITING → ACTIVE → SCORING → WAITING | ENDED
- Document valid transitions: WAITING/ACTIVE/SCORING → ENDED

#### LeaderboardEntry (NEW)
- `playerId: string`
- `nickname: string`
- `score: number`
- `rank: number` (1-based, shared for ties)
- `isTied: boolean` (true if multiple players share this rank)

#### LeaderboardData (NEW)
- `entries: LeaderboardEntry[]` (sorted by rank, then alphabetically within ties)
- `totalPlayers: number`
- `timestamp: number` (when game ended)
- `sessionId: string` (join code for reference)

#### GameSession (MODIFY)
- Add optional `leaderboard: LeaderboardData | null` (populated when gameState === ENDED)
- Existing fields remain unchanged

### State Transitions
- From any state (WAITING, ACTIVE, SCORING) → ENDED (via gm:endGame)
- ENDED → WAITING (via gm:startNewGame - resets scores, keeps players)
- ENDED → [deleted] (via gm:closeSession - disconnects all, removes from memory)

### Validation Rules
- Leaderboard can only be generated when gameState transitions to ENDED
- Rank calculation must handle ties correctly (FR-006, FR-007)
- "Start New Game" only available in ENDED state
- "Close Session" only available in ENDED state

---

## 2. API Contracts (`contracts/`)

### New WebSocket Events

#### Client → Server

**`gm:endGame`**
```typescript
{
  joinCode: string;
}
→ callback: { success: boolean; error?: string }
```
- Validates session exists and GM has authority
- Transitions gameState to ENDED
- Generates leaderboard data
- Broadcasts gameEnded event to all clients

**`gm:startNewGame`** (NEW)
```typescript
{
  joinCode: string;
}
→ callback: { success: boolean; error?: string }
```
- Only valid in ENDED state
- Resets all player scores to 0
- Clears leaderboard data
- Resets currentQuestionNumber to 0
- Transitions to WAITING state
- Broadcasts session:updated to all clients

**`gm:closeSession`** (MODIFY from existing `gm:endSession`)
```typescript
{
  joinCode: string;
}
→ callback: { success: boolean; error?: string }
```
- Only valid in ENDED state (or any state, per GM decision)
- Broadcasts session:closed event
- Disconnects all player sockets
- Removes session from memory immediately

---

#### Server → Client

**`game:ended`** (NEW)
```typescript
{
  joinCode: string;
  leaderboard: LeaderboardData;
  timestamp: number;
}
```
- Broadcast to all clients when game ends
- Clients display leaderboard UI
- Clients disable buzzer button

**`game:newGameStarted`** (NEW)
```typescript
{
  joinCode: string;
  session: GameSession; // with reset scores
}
```
- Broadcast to all clients when GM starts new game
- Clients clear leaderboard display
- Clients return to waiting state UI

**`session:closed`** (NEW - different from existing `session:ended`)
```typescript
{
  joinCode: string;
  reason: string; // "Game master closed session"
}
```
- Broadcast to all clients before disconnection
- Clients show "Session closed" message
- Clients disconnect from WebSocket

---

### Modified WebSocket Events

**`session:updated`** (EXISTING - no changes to signature)
- Will now broadcast when leaderboard is populated (gameState changes to ENDED)

---

## 3. Quickstart Guide (`quickstart.md`)

Document:
- How to end a game as GM (click "End Game" button)
- What players see when game ends (leaderboard display)
- How to start a new game with same players ("Start New Game" button)
- How to close the session completely ("Close Session" button)
- Example tie-breaking scenarios (3 players with 25pts → all ranked 1st, next player is 4th)

---

## 4. Agent Context Update

Run: `.specify/scripts/bash/update-agent-context.sh claude`

Updates: `/Users/windrich/Documents/fun-gym/trivia-simple-app/CLAUDE.md`

Add to "Recent Changes":
```
- 003-game-end-leaderboard: Added
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
