# Feature Specification: GM Session Reconnection

**Feature Branch**: `002-gm-session-reconnect`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "For game master view, I realised that after I create a game session, if I refresh the page, I need to put back the password and then it'll create a brand new session again. This won't work because the game master won't be able to go back to the same session where the players are still at. After putting in the password, can we list down the currently available games and allow game master to connect back to the same session?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GM Session Recovery After Refresh (Priority: P1)

A Game Master accidentally refreshes their browser during an active game session with multiple players already connected. They need to reconnect to the same session without disrupting the players or losing game state.

**Why this priority**: This is critical functionality that makes the app usable for real game sessions. Without it, accidental refreshes force GMs to restart the entire game, frustrating all participants.

**Independent Test**: Can be fully tested by creating a session, adding players, refreshing the GM page, entering password, and verifying the GM can select and reconnect to the existing session with all players still connected.

**Acceptance Scenarios**:

1. **Given** a GM has created a session "ABC123" with 5 players connected and the GM refreshes their browser, **When** the GM re-enters their password on the game master page, **Then** they should see a list of active sessions they created including "ABC123" with player count displayed
2. **Given** the GM sees the list of their active sessions, **When** they click on session "ABC123", **Then** they should reconnect to that session and see all 5 players still in the session with current scores intact
3. **Given** the GM has reconnected to session "ABC123", **When** they interact with the session (e.g., accept a buzz, award points), **Then** all players should receive the updates in real-time as before the refresh

---

### User Story 2 - New Session Creation Flow (Priority: P1)

A Game Master who has entered their password wants to create a brand new session instead of reconnecting to an existing one.

**Why this priority**: Essential to maintain the ability to create new sessions. This complements the reconnection feature.

**Independent Test**: Can be tested by entering password and selecting "Create New Session" option, verifying a new join code is generated and no existing session is reused.

**Acceptance Scenarios**:

1. **Given** the GM has entered their password and sees a list of existing sessions, **When** they click "Create New Session" button, **Then** a new session should be created with a unique join code
2. **Given** the GM creates a new session, **When** players from old sessions try to interact, **Then** the old sessions remain active and unaffected

---

### User Story 3 - Expired Session Handling (Priority: P2)

A Game Master returns after 30+ minutes and attempts to reconnect to a session that has been automatically cleaned up due to inactivity.

**Why this priority**: Important for user experience to handle edge cases gracefully, but not as critical as core reconnection functionality.

**Independent Test**: Can be tested by creating a session, waiting for cleanup interval, then attempting to reconnect and verifying appropriate messaging.

**Acceptance Scenarios**:

1. **Given** a session "ABC123" was created 31 minutes ago with no activity, **When** the GM enters their password, **Then** the session "ABC123" should not appear in the list of available sessions
2. **Given** the GM sees no available sessions in the list, **When** they view the session list, **Then** they should see a message indicating "No active sessions found" with a "Create New Session" option

---

### Edge Cases

- What happens when a GM has multiple active sessions (e.g., running parallel trivia games)?
- How does the system handle if two browser tabs try to connect as GM to the same session simultaneously?
- What happens when a session has no players but the GM reconnects to it?
- How does the system handle password changes or session ownership verification?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store the GM password hash associated with each session in the session data structure
- **FR-002**: System MUST provide a new WebSocket event `getGMSessions` that accepts a password and returns all active sessions created with that password
- **FR-003**: System MUST include session metadata in the response: join code, player count, creation timestamp, last activity timestamp
- **FR-004**: Game Master page MUST display a session selection UI after password verification, showing all active sessions for that password
- **FR-005**: Session selection UI MUST display each session's join code, current player count, and time since creation
- **FR-006**: System MUST provide a "Create New Session" button that bypasses session selection and creates a new session
- **FR-007**: System MUST provide a WebSocket event `reconnectToSession` that allows GM to reconnect to an existing session by join code
- **FR-008**: System MUST verify the password matches the session's stored password hash before allowing reconnection
- **FR-009**: Upon successful reconnection, system MUST emit the full session state to the reconnecting GM (players, scores, game state, settings)
- **FR-010**: System MUST maintain existing session cleanup logic (remove sessions after inactivity threshold)
- **FR-011**: Frontend MUST update the GM interface state to reflect reconnection vs. new session creation
- **FR-012**: System MUST handle the case where a GM refreshes during different game states (waiting, active, scoring) and restore the correct state

### Key Entities

- **Session**: Enhanced with `gmPasswordHash` field to store hashed GM password for ownership verification
- **SessionMetadata**: New lightweight structure containing join code, player count, creation time, last activity time (for session list display)
- **GMSessionListResponse**: Response structure containing array of SessionMetadata objects

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Game Masters can successfully reconnect to their existing session 100% of the time after page refresh when session is still active
- **SC-002**: Session reconnection preserves all game state including player list, scores, game state (waiting/active/scoring), and buzzer settings
- **SC-003**: Session selection UI loads and displays available sessions within 500ms of password verification
- **SC-004**: System prevents unauthorized access - GMs cannot reconnect to sessions created with different passwords
- **SC-005**: Game Masters can create new sessions while having other active sessions without conflicts
- **SC-006**: Session cleanup continues to work correctly - sessions inactive for >10 minutes are not shown in the session list
