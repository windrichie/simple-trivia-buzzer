# Tasks: GM Session Reconnection

**Input**: Design documents from `/specs/002-gm-session-reconnect/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification - no test tasks included

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web application structure:
- Backend: `backend/src/`
- Frontend: `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install bcryptjs dependency in backend package.json
- [ ] T002 [P] Install @types/bcryptjs dev dependency in backend package.json
- [ ] T003 [P] Verify TypeScript 5.x and Node.js 22 LTS environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Create password utility functions in backend/src/utils/password-utils.ts
- [ ] T005 [P] Add SessionMetadata interface to backend/src/types/websocket-events.ts
- [ ] T006 [P] Add GMSessionListResponse interface to backend/src/types/websocket-events.ts
- [ ] T007 [P] Add gmPasswordHash field to GameSession interface in backend/src/types/websocket-events.ts
- [ ] T008 [P] Add lastActivity field to GameSession interface in backend/src/types/websocket-events.ts
- [ ] T009 [P] Add SESSION_PASSWORD_MISMATCH error code to ErrorCode enum in backend/src/types/websocket-events.ts
- [ ] T010 [P] Add NO_SESSIONS_FOUND error code to ErrorCode enum in backend/src/types/websocket-events.ts
- [ ] T011 [P] Add error messages for new error codes to ERROR_MESSAGES in backend/src/types/websocket-events.ts
- [ ] T012 Modify session creation in backend/src/session-manager.ts to hash GM password and store gmPasswordHash
- [ ] T013 Modify session creation in backend/src/session-manager.ts to initialize lastActivity timestamp
- [ ] T014 Add getSessionsByPassword method to backend/src/session-manager.ts
- [ ] T015 Add toSessionMetadata helper function to backend/src/session-manager.ts
- [ ] T016 Update all session interaction points in backend/src/session-manager.ts to update lastActivity timestamp
- [ ] T017 [P] Copy SessionMetadata interface to frontend/lib/websocket-events.ts
- [ ] T018 [P] Copy new error codes to frontend/lib/websocket-events.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Stories 1 & 2 (Priority: P1) 🎯 MVP

**Combined Phase**: Both US1 (GM Session Recovery) and US2 (New Session Creation) are P1 and represent the same feature flow - they are implemented together

### User Story 1 Goal
Allow GM to reconnect to existing sessions after page refresh instead of creating new sessions

### User Story 2 Goal
Allow GM to create new session from session selection screen

**Independent Test**: Create session with players, refresh GM page, enter password, verify GM can either select existing session OR create new session

### Backend Implementation (User Stories 1 & 2)

- [ ] T019 [P] [US1][US2] Add gm:getActiveSessions event handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T020 [P] [US1] Add gm:reconnectToSession event handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T021 [US1][US2] Modify gm:createSession event handler in backend/src/event-handlers/gm-handlers.ts to return full session data
- [ ] T022 [US1] Add session:gmReconnected broadcast to gm:reconnectToSession handler in backend/src/event-handlers/gm-handlers.ts
- [ ] T023 [US1][US2] Register new event handlers in backend/src/server.ts
- [ ] T024 [US1][US2] Update gm:getActiveSessions event signature in backend/src/types/websocket-events.ts ClientToServerEvents
- [ ] T025 [US1] Update gm:reconnectToSession event signature in backend/src/types/websocket-events.ts ClientToServerEvents
- [ ] T026 [US1][US2] Update gm:createSession event signature in backend/src/types/websocket-events.ts ClientToServerEvents to include session in response
- [ ] T027 [US1] Add session:gmReconnected event to backend/src/types/websocket-events.ts ServerToClientEvents

### Frontend Implementation (User Stories 1 & 2)

- [ ] T028 [P] [US1][US2] Create SessionCard component in frontend/components/session-card.tsx
- [ ] T029 [P] [US1][US2] Create SessionSelector component in frontend/components/session-selector.tsx
- [ ] T030 [US1][US2] Modify GM page in frontend/app/gamemaster/page.tsx to call gm:getActiveSessions after password entry
- [ ] T031 [US1] Add session selection logic to frontend/app/gamemaster/page.tsx to display SessionSelector when sessions exist
- [ ] T032 [US2] Add "Create New Session" button to frontend/app/gamemaster/page.tsx session selector view
- [ ] T033 [US1] Implement reconnectToSession call in frontend/app/gamemaster/page.tsx when session card clicked
- [ ] T034 [US2] Implement createSession call in frontend/app/gamemaster/page.tsx when "Create New Session" clicked
- [ ] T035 [US1][US2] Add state management for session list and selected session in frontend/app/gamemaster/page.tsx
- [ ] T036 [P] [US1][US2] Update WebSocket event types in frontend/lib/websocket-events.ts to match backend

**Checkpoint**: At this point, User Stories 1 AND 2 should be fully functional - GM can reconnect to existing sessions OR create new sessions

---

## Phase 4: User Story 3 (Priority: P2) - Edge Cases

**Goal**: Handle expired sessions and empty state gracefully

**Independent Test**: Create session, wait 10+ minutes for cleanup, enter password, verify "No sessions found" message appears

### Implementation for User Story 3

- [ ] T037 [P] [US3] Add "No active sessions found" empty state to frontend/components/session-selector.tsx
- [ ] T038 [P] [US3] Add automatic "Create New Session" option when session list is empty in frontend/app/gamemaster/page.tsx
- [ ] T039 [US3] Add human-readable timestamp formatting (timeAgo) to frontend/components/session-card.tsx
- [ ] T040 [US3] Add visual indicator for expired/inactive sessions (last activity >5 min ago) in frontend/components/session-card.tsx

**Checkpoint**: All user stories should now be independently functional with graceful edge case handling

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T041 [P] Add loading states to frontend/app/gamemaster/page.tsx during session list fetch
- [ ] T042 [P] Add error handling and user feedback for failed reconnection in frontend/app/gamemaster/page.tsx
- [ ] T043 [P] Add mobile-responsive styling to frontend/components/session-card.tsx (44x44px tap targets)
- [ ] T044 [P] Add mobile-responsive styling to frontend/components/session-selector.tsx (scrollable list)
- [ ] T045 [P] Add optional toast notification for players when GM reconnects in frontend/app/player/page.tsx
- [ ] T046 Verify session cleanup logic still works correctly with gmPasswordHash field in backend/src/session-manager.ts
- [ ] T047 Add logging for password verification failures in backend/src/event-handlers/gm-handlers.ts
- [ ] T048 Add logging for successful reconnections in backend/src/event-handlers/gm-handlers.ts
- [ ] T049 [P] Validate quickstart.md scenarios manually (create session, refresh, reconnect)
- [ ] T050 [P] Update CLAUDE.md "Recent Changes" section with feature 002 completion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1 & 2 (Phase 3)**: Depends on Foundational phase completion - MVP implementation
- **User Story 3 (Phase 4)**: Depends on Phase 3 completion - Edge cases
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories, implemented together
- **User Story 3 (P2)**: Can start after Phase 3 - Builds on top of core reconnection flow

### Within Each User Story

- Backend event handlers before frontend implementation
- Type definitions before event handlers
- Session manager modifications before event handlers
- Components (SessionCard, SessionSelector) before page modifications
- Core implementation before edge case handling

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All Foundational tasks marked [P] (T004-T011, T017-T018) can run in parallel within Phase 2
- Backend tasks T019-T020 can run in parallel (different handlers)
- Backend tasks T024-T027 can run in parallel (different event signatures)
- Frontend components T028-T029 can run in parallel (different files)
- Frontend tasks T036 and T040 can run in parallel (different files)
- All Polish tasks marked [P] (T041-T045, T049-T050) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definition tasks together:
Task: "Add SessionMetadata interface to backend/src/types/websocket-events.ts"
Task: "Add GMSessionListResponse interface to backend/src/types/websocket-events.ts"
Task: "Add gmPasswordHash field to GameSession interface"
Task: "Add lastActivity field to GameSession interface"
Task: "Add SESSION_PASSWORD_MISMATCH error code"
Task: "Add NO_SESSIONS_FOUND error code"
Task: "Add error messages for new error codes"

# Launch utility creation and frontend type sync together:
Task: "Create password utility functions in backend/src/utils/password-utils.ts"
Task: "Copy SessionMetadata interface to frontend/lib/websocket-events.ts"
Task: "Copy new error codes to frontend/lib/websocket-events.ts"
```

---

## Parallel Example: User Stories 1 & 2 Backend

```bash
# Launch backend event handlers together:
Task: "Add gm:getActiveSessions event handler in backend/src/event-handlers/gm-handlers.ts"
Task: "Add gm:reconnectToSession event handler in backend/src/event-handlers/gm-handlers.ts"

# Launch event signature updates together:
Task: "Update gm:getActiveSessions event signature in ClientToServerEvents"
Task: "Update gm:reconnectToSession event signature in ClientToServerEvents"
Task: "Update gm:createSession event signature to include session in response"
Task: "Add session:gmReconnected event to ServerToClientEvents"
```

---

## Parallel Example: User Stories 1 & 2 Frontend

```bash
# Launch component creation together:
Task: "Create SessionCard component in frontend/components/session-card.tsx"
Task: "Create SessionSelector component in frontend/components/session-selector.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T018) - CRITICAL
3. Complete Phase 3: User Stories 1 & 2 (T019-T036)
4. **STOP and VALIDATE**:
   - Create session with players
   - Refresh GM page
   - Enter password
   - Verify session list appears
   - Verify can reconnect to existing session
   - Verify can create new session
5. Deploy/demo if ready - MVP complete!

### Incremental Delivery

1. Complete Setup + Foundational (T001-T018) → Foundation ready
2. Add User Stories 1 & 2 (T019-T036) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (T037-T040) → Test edge cases → Deploy/Demo
4. Add Polish (T041-T050) → Final refinements → Deploy/Demo
5. Each phase adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T018)
2. Once Foundational is done:
   - Developer A: Backend implementation (T019-T027)
   - Developer B: Frontend implementation (T028-T036)
3. Stories complete and integrate independently
4. Developer C can work on Polish tasks in parallel with main implementation

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] labels map task to specific user story for traceability
  - [US1] = User Story 1 (GM Session Recovery After Refresh)
  - [US2] = User Story 2 (New Session Creation Flow)
  - [US3] = User Story 3 (Expired Session Handling)
- Each user story should be independently completable and testable
- Tests not included (not requested in specification)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- bcryptjs already confirmed available in existing codebase
- All password hashing uses bcrypt with 10 salt rounds per research.md
- Session ownership is immutable (password hash cannot be changed after creation)
- Concurrent GM connections allowed per research.md
- No pagination implemented (all sessions returned) per research.md
- Mobile-first design with 44x44px minimum tap targets per plan.md constraints

---

## Task Count Summary

- **Total Tasks**: 50
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 15 tasks (BLOCKS all user stories)
- **User Stories 1 & 2 (Phase 3)**: 18 tasks (MVP)
- **User Story 3 (Phase 4)**: 4 tasks (Edge cases)
- **Polish (Phase 5)**: 10 tasks

**Parallel Opportunities**: 23 tasks marked [P] can run in parallel with other tasks

**MVP Scope**: Phases 1-3 (36 tasks) deliver fully functional GM session reconnection

**Independent Test Criteria**:
- User Stories 1 & 2: GM can refresh page, see session list, reconnect OR create new session
- User Story 3: System handles expired sessions gracefully with appropriate messaging
