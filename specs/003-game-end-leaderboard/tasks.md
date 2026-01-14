# Tasks: Game End & Leaderboard

**Input**: Design documents from `/specs/003-game-end-leaderboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification - no test tasks included

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Web application structure:
- Backend: `backend/src/`
- Frontend: `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install canvas-confetti dependency in frontend package.json
- [ ] T002 [P] Install @types/canvas-confetti dev dependency in frontend package.json
- [ ] T003 [P] Verify canvas-confetti imports work in Next.js 14 App Router

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Add ENDED state to GameState enum in backend/src/types/websocket-events.ts
- [ ] T005 [P] Add LeaderboardEntry interface to backend/src/types/websocket-events.ts
- [ ] T006 [P] Add LeaderboardData interface to backend/src/types/websocket-events.ts
- [ ] T007 [P] Add leaderboard field to GameSession interface in backend/src/types/websocket-events.ts
- [ ] T008 [P] Add GAME_ALREADY_ENDED error code to ErrorCode enum in backend/src/types/websocket-events.ts
- [ ] T009 [P] Add CANNOT_START_NEW_GAME error code to ErrorCode enum in backend/src/types/websocket-events.ts
- [ ] T010 [P] Add error messages for new error codes to ERROR_MESSAGES in backend/src/types/websocket-events.ts
- [ ] T011 Create leaderboard service with calculateLeaderboard function in backend/src/services/leaderboard-service.ts
- [ ] T012 Implement Standard Competition Ranking algorithm in backend/src/services/leaderboard-service.ts
- [ ] T013 Add tie detection and alphabetical sorting logic in backend/src/services/leaderboard-service.ts
- [ ] T014 [P] Copy ENDED state to GameState enum in frontend/lib/websocket-events.ts
- [ ] T015 [P] Copy LeaderboardEntry interface to frontend/lib/websocket-events.ts
- [ ] T016 [P] Copy LeaderboardData interface to frontend/lib/websocket-events.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Stories 1 & 2 (Priority: P1) 🎯 MVP

**Combined Phase**: Both US1 (End Game with Leaderboard) and US2 (Handle Tie Scores) are P1 and represent the core leaderboard feature - US2's tie handling is built into the ranking algorithm from US1

### User Story 1 Goal
Allow GM to end game and display celebratory leaderboard with rankings to all participants

### User Story 2 Goal
Correctly handle tied scores in leaderboard display (built into ranking algorithm)

**Independent Test**: Run game session with players having various scores (including ties), click "End Game", verify leaderboard displays with correct rankings, tie indicators, and confetti animation

### Backend Implementation (User Stories 1 & 2)

- [ ] T017 [P] [US1][US2] Add gm:endGame event handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T018 [US1][US2] Implement game state transition to ENDED in backend/src/event-handlers/gm-handlers.ts endGame handler
- [ ] T019 [US1][US2] Call leaderboard service to calculate rankings in backend/src/event-handlers/gm-handlers.ts endGame handler
- [ ] T020 [US1][US2] Store leaderboard in session.leaderboard in backend/src/event-handlers/gm-handlers.ts endGame handler
- [ ] T021 [US1][US2] Broadcast game:ended event with leaderboard data in backend/src/event-handlers/gm-handlers.ts endGame handler
- [ ] T022 [US1][US2] Register gm:endGame handler in backend/src/server.ts
- [ ] T023 [P] [US1][US2] Add gm:endGame event signature to backend/src/types/websocket-events.ts ClientToServerEvents
- [ ] T024 [P] [US1][US2] Add game:ended event signature to backend/src/types/websocket-events.ts ServerToClientEvents
- [ ] T025 [US1] Add buzzer press blocking logic for ENDED state in backend/src/event-handlers/player-handlers.ts

### Frontend Implementation (User Stories 1 & 2)

- [ ] T026 [P] [US1][US2] Create Leaderboard component in frontend/components/leaderboard.tsx
- [ ] T027 [US1][US2] Implement leaderboard entry rendering with rank, name, score in frontend/components/leaderboard.tsx
- [ ] T028 [US1][US2] Add tie indicator display for tied ranks in frontend/components/leaderboard.tsx
- [ ] T029 [US1][US2] Add podium visualization for top 3 players in frontend/components/leaderboard.tsx
- [ ] T030 [US1][US2] Add trophy icons (🥇🥈🥉) for top 3 in frontend/components/leaderboard.tsx
- [ ] T031 [US1] Add confetti animation trigger using canvas-confetti in frontend/components/leaderboard.tsx
- [ ] T032 [US1] Configure confetti parameters (particle count, colors, origin) in frontend/components/leaderboard.tsx
- [ ] T033 [P] [US1] Add "End Game" button to GM interface in frontend/app/gamemaster/page.tsx
- [ ] T034 [US1] Implement gm:endGame call on button click in frontend/app/gamemaster/page.tsx
- [ ] T035 [US1][US2] Add game:ended event listener in frontend/app/gamemaster/page.tsx
- [ ] T036 [US1][US2] Display Leaderboard component when game:ended received in frontend/app/gamemaster/page.tsx
- [ ] T037 [US1][US2] Add game:ended event listener in frontend/app/player/page.tsx
- [ ] T038 [US1][US2] Display Leaderboard component when game:ended received in frontend/app/player/page.tsx
- [ ] T039 [US1] Disable buzzer button in ENDED state in frontend/components/buzzer-button.tsx
- [ ] T040 [P] [US1][US2] Update WebSocket event types in frontend/lib/websocket-events.ts to match backend

**Checkpoint**: At this point, User Stories 1 AND 2 should be fully functional - GM can end game, all participants see leaderboard with correct rankings and tie handling

---

## Phase 4: User Story 4 (Priority: P2) - Post-Game Actions

**Goal**: Allow GM to start new game with same players OR close session completely after viewing leaderboard

**Independent Test**: End game, view leaderboard, verify "Start New Game" resets scores and returns to WAITING, verify "Close Session" disconnects all players

### Backend Implementation (User Story 4)

- [ ] T041 [P] [US4] Add gm:startNewGame event handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T042 [US4] Validate gameState === ENDED in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T043 [US4] Reset all player scores to 0 in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T044 [US4] Clear leaderboard data in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T045 [US4] Reset currentQuestionNumber to 0 in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T046 [US4] Transition gameState to WAITING in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T047 [US4] Broadcast game:newGameStarted event in gm:startNewGame handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T048 [P] [US4] Add gm:closeSession event handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T049 [US4] Broadcast session:closed event in gm:closeSession handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T050 [US4] Disconnect all player sockets in gm:closeSession handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T051 [US4] Remove session from memory immediately in gm:closeSession handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T052 [US4] Register gm:startNewGame and gm:closeSession handlers in backend/src/server.ts
- [ ] T053 [P] [US4] Add gm:startNewGame event signature to backend/src/types/websocket-events.ts ClientToServerEvents
- [ ] T054 [P] [US4] Add gm:closeSession event signature to backend/src/types/websocket-events.ts ClientToServerEvents
- [ ] T055 [P] [US4] Add game:newGameStarted event signature to backend/src/types/websocket-events.ts ServerToClientEvents
- [ ] T056 [P] [US4] Add session:closed event signature to backend/src/types/websocket-events.ts ServerToClientEvents

### Frontend Implementation (User Story 4)

- [ ] T057 [P] [US4] Add "Start New Game" button to GM leaderboard view in frontend/app/gamemaster/page.tsx
- [ ] T058 [P] [US4] Add "Close Session" button to GM leaderboard view in frontend/app/gamemaster/page.tsx
- [ ] T059 [US4] Implement gm:startNewGame call on button click in frontend/app/gamemaster/page.tsx
- [ ] T060 [US4] Implement gm:closeSession call on button click in frontend/app/gamemaster/page.tsx
- [ ] T061 [US4] Add game:newGameStarted event listener in frontend/app/gamemaster/page.tsx
- [ ] T062 [US4] Clear leaderboard and return to WAITING state UI in frontend/app/gamemaster/page.tsx when game:newGameStarted received
- [ ] T063 [US4] Add game:newGameStarted event listener in frontend/app/player/page.tsx
- [ ] T064 [US4] Clear leaderboard and return to WAITING state UI in frontend/app/player/page.tsx when game:newGameStarted received
- [ ] T065 [US4] Add session:closed event listener in frontend/app/player/page.tsx
- [ ] T066 [US4] Display "Session closed by host" message and disconnect in frontend/app/player/page.tsx when session:closed received
- [ ] T067 [P] [US4] Update WebSocket event types in frontend/lib/websocket-events.ts for new events

**Checkpoint**: At this point, User Story 4 should be fully functional - GM can start new game or close session from leaderboard view

---

## Phase 5: User Story 3 (Priority: P2) - Edge Cases

**Goal**: Handle empty sessions and single-player games gracefully with appropriate messaging

**Independent Test**: End game with 0 players, verify appropriate message. End game with 1 player, verify leaderboard displays with celebration.

### Implementation for User Story 3

- [ ] T068 [P] [US3] Add "No players participated" empty state to frontend/components/leaderboard.tsx
- [ ] T069 [P] [US3] Add single player celebration variant to frontend/components/leaderboard.tsx
- [ ] T070 [US3] Add confirmation dialog for ending game during ACTIVE state in frontend/app/gamemaster/page.tsx
- [ ] T071 [US3] Check for active buzzer presses before showing confirmation in frontend/app/gamemaster/page.tsx
- [ ] T072 [US3] Add edge case handling for 0 players in backend/src/services/leaderboard-service.ts
- [ ] T073 [US3] Add edge case handling for 1 player in backend/src/services/leaderboard-service.ts

**Checkpoint**: All user stories should now be independently functional with graceful edge case handling

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T074 [P] Add mobile-responsive styling to frontend/components/leaderboard.tsx (stack podium vertically on mobile)
- [ ] T075 [P] Optimize confetti animation for mobile (reduce particle count on small screens) in frontend/components/leaderboard.tsx
- [ ] T076 [P] Add GPU-accelerated CSS animations (transform, opacity) for podium slide-in in frontend/components/leaderboard.tsx
- [ ] T077 [P] Add staggered animation delays for top 3 podium entries (0ms, 100ms, 200ms) in frontend/components/leaderboard.tsx
- [ ] T078 [P] Add loading state for leaderboard calculation in frontend/components/leaderboard.tsx
- [ ] T079 [P] Add error handling for failed game end in frontend/app/gamemaster/page.tsx
- [ ] T080 [P] Add 44x44px minimum tap target for "End Game" button in frontend/app/gamemaster/page.tsx
- [ ] T081 [P] Add 44x44px minimum tap targets for post-game buttons in frontend/app/gamemaster/page.tsx
- [ ] T082 [P] Add prefers-reduced-motion detection to disable animations if requested in frontend/components/leaderboard.tsx
- [ ] T083 Add logging for game end events in backend/src/event-handlers/gm-handlers.ts
- [ ] T084 Add logging for leaderboard calculation errors in backend/src/services/leaderboard-service.ts
- [ ] T085 Verify session cleanup still works correctly with ENDED state and leaderboard field in backend/src/session-manager.ts
- [ ] T086 [P] Validate quickstart.md scenarios manually (end game, view leaderboard, start new game, close session)
- [ ] T087 [P] Update CLAUDE.md "Recent Changes" section with feature 003 completion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1 & 2 (Phase 3)**: Depends on Foundational phase completion - MVP implementation
- **User Story 4 (Phase 4)**: Depends on Phase 3 completion - Post-game flow
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion - Edge cases
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories, implemented together (US2 tie handling is part of US1 leaderboard algorithm)
- **User Story 4 (P2)**: Depends on Phase 3 - Needs ENDED state and leaderboard display to be functional
- **User Story 3 (P2)**: Depends on Phase 3 - Edge cases build on top of core leaderboard feature

### Within Each User Story

- Backend leaderboard service before event handlers
- Backend event handlers before frontend implementation
- Type definitions before event handlers
- Leaderboard component before page integrations
- Core display before edge case handling
- Core implementation before post-game actions

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All Foundational tasks marked [P] (T004-T010, T014-T016) can run in parallel within Phase 2
- Backend tasks T017, T023-T024 can run in parallel (different functions)
- Backend tasks T041, T048 can run in parallel (different handlers)
- Backend tasks T053-T056 can run in parallel (different event signatures)
- Frontend components T026, T033 can run in parallel (different files)
- Frontend tasks T057-T058 can run in parallel (same file, different buttons but no conflicts)
- All Polish tasks marked [P] (T074-T082, T086-T087) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definition tasks together:
Task: "Add ENDED state to GameState enum in backend/src/types/websocket-events.ts"
Task: "Add LeaderboardEntry interface to backend/src/types/websocket-events.ts"
Task: "Add LeaderboardData interface to backend/src/types/websocket-events.ts"
Task: "Add leaderboard field to GameSession interface"
Task: "Add GAME_ALREADY_ENDED error code"
Task: "Add CANNOT_START_NEW_GAME error code"
Task: "Add error messages for new error codes"

# Launch frontend type sync tasks together:
Task: "Copy ENDED state to GameState enum in frontend/lib/websocket-events.ts"
Task: "Copy LeaderboardEntry interface to frontend/lib/websocket-events.ts"
Task: "Copy LeaderboardData interface to frontend/lib/websocket-events.ts"
```

---

## Parallel Example: User Stories 1 & 2 Backend

```bash
# Launch event signature updates together:
Task: "Add gm:endGame event signature to ClientToServerEvents"
Task: "Add game:ended event signature to ServerToClientEvents"
```

---

## Parallel Example: User Story 4 Backend

```bash
# Launch event handlers together:
Task: "Add gm:startNewGame event handler in backend/src/event-handlers/gm-handlers.ts"
Task: "Add gm:closeSession event handler in backend/src/event-handlers/gm-handlers.ts"

# Launch event signature updates together:
Task: "Add gm:startNewGame event signature to ClientToServerEvents"
Task: "Add gm:closeSession event signature to ClientToServerEvents"
Task: "Add game:newGameStarted event signature to ServerToClientEvents"
Task: "Add session:closed event signature to ServerToClientEvents"
```

---

## Parallel Example: User Story 4 Frontend

```bash
# Launch post-game button creation together:
Task: "Add Start New Game button to GM leaderboard view in frontend/app/gamemaster/page.tsx"
Task: "Add Close Session button to GM leaderboard view in frontend/app/gamemaster/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T016) - CRITICAL
3. Complete Phase 3: User Stories 1 & 2 (T017-T040)
4. **STOP and VALIDATE**:
   - Run game with multiple players
   - Award various scores (including ties)
   - Click "End Game"
   - Verify all participants see leaderboard
   - Verify rankings correct (including tie handling)
   - Verify confetti animation plays
   - Verify buzzer disabled in ENDED state
5. Deploy/demo if ready - MVP complete!

### Incremental Delivery

1. Complete Setup + Foundational (T001-T016) → Foundation ready
2. Add User Stories 1 & 2 (T017-T040) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 4 (T041-T067) → Test post-game actions → Deploy/Demo
4. Add User Story 3 (T068-T073) → Test edge cases → Deploy/Demo
5. Add Polish (T074-T087) → Final refinements → Deploy/Demo
6. Each phase adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T016)
2. Once Foundational is done:
   - Developer A: Backend implementation (T017-T025)
   - Developer B: Frontend implementation (T026-T040)
3. Stories complete and integrate independently
4. Developer C can work on Polish tasks in parallel with main implementation

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] labels map task to specific user story for traceability
  - [US1] = User Story 1 (End Game with Leaderboard Display)
  - [US2] = User Story 2 (Handle Tie Scores) - Built into US1 leaderboard algorithm
  - [US3] = User Story 3 (Empty or Single Player Games)
  - [US4] = User Story 4 (Post-Game Session Cleanup)
- Each user story should be independently completable and testable
- Tests not included (not requested in specification)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- canvas-confetti library chosen per research.md for confetti effects
- Standard Competition Ranking (1224) algorithm per research.md
- Tailwind CSS animations for podium effects (zero bundle size) per research.md
- 60fps mobile animation target per plan.md performance goals
- Mobile-first design with 44x44px minimum tap targets per plan.md constraints
- GPU-accelerated CSS animations (transform, opacity) per research.md
- ENDED sessions use existing 10-minute cleanup per research.md

---

## Task Count Summary

- **Total Tasks**: 87
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 13 tasks (BLOCKS all user stories)
- **User Stories 1 & 2 (Phase 3)**: 24 tasks (MVP)
- **User Story 4 (Phase 4)**: 27 tasks (Post-game actions)
- **User Story 3 (Phase 5)**: 6 tasks (Edge cases)
- **Polish (Phase 6)**: 14 tasks

**Parallel Opportunities**: 32 tasks marked [P] can run in parallel with other tasks

**MVP Scope**: Phases 1-3 (40 tasks) deliver fully functional game end with leaderboard display and tie handling

**Independent Test Criteria**:
- User Stories 1 & 2: GM can end game, leaderboard displays with correct rankings and tie handling, confetti animation plays
- User Story 4: GM can start new game (reset scores) or close session (disconnect all)
- User Story 3: System handles 0 players and 1 player gracefully with appropriate messaging
