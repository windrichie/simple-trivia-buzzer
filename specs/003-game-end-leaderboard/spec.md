# Feature Specification: Game End & Leaderboard

**Feature Branch**: `003-game-end-leaderboard`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Ability to end the actual game session, and show a quick leaderboard based on the points (make it look fun)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - End Game with Leaderboard Display (Priority: P1)

A Game Master has finished asking all trivia questions and wants to formally end the game session, showing all players a fun, celebratory leaderboard with final scores and rankings.

**Why this priority**: This is the natural conclusion to every game session. Without it, games end abruptly with no sense of closure or celebration for winners.

**Independent Test**: Can be fully tested by running a game session with multiple players, awarding points throughout, then clicking "End Game" and verifying all participants see a synchronized leaderboard with correct rankings.

**Acceptance Scenarios**:

1. **Given** a game session is active with 5 players having various scores (Player A: 30pts, Player B: 20pts, Player C: 30pts, Player D: 10pts, Player E: 25pts), **When** the GM clicks "End Game" button, **Then** all players and the GM should see a leaderboard showing rankings: 1st place (tie): Players A & C (30pts), 3rd place: Player E (25pts), 4th place: Player B (20pts), 5th place: Player D (10pts)
2. **Given** the game has ended and leaderboard is displayed, **When** players view the leaderboard, **Then** it should include celebratory visual elements (confetti animation for top 3, trophy icons, podium display) and display player names with their final scores
3. **Given** the leaderboard is displayed to all participants, **When** the GM views their interface, **Then** they should see options to "Start New Game" or "Close Session"

---

### User Story 2 - Handle Tie Scores (Priority: P1)

Multiple players finish the game with identical scores and need to see their tied ranking displayed clearly on the leaderboard.

**Why this priority**: Ties are common in trivia games. Proper handling ensures fair recognition of all players' achievements.

**Independent Test**: Can be tested by creating a game, awarding identical scores to 2+ players, ending the game, and verifying tied players share the same rank number.

**Acceptance Scenarios**:

1. **Given** three players all have 25 points at game end, **When** the leaderboard displays, **Then** all three should be shown as "1st place (tie)" with the next player ranked as "4th place"
2. **Given** players have tied scores, **When** the leaderboard displays, **Then** tied players should be sorted alphabetically by name within their tied rank

---

### User Story 3 - Empty or Single Player Games (Priority: P2)

A Game Master ends a game session that has zero players or only one player participating.

**Why this priority**: Important for handling edge cases gracefully, but less common in real usage.

**Independent Test**: Can be tested by creating a session, ending it immediately with no players, and verifying appropriate messaging.

**Acceptance Scenarios**:

1. **Given** a game session has no players, **When** the GM clicks "End Game", **Then** the GM should see a message "No players participated" with option to close session
2. **Given** a game session has only one player, **When** the game ends, **Then** the leaderboard should still display with that player in 1st place with celebratory animation

---

### User Story 4 - Post-Game Session Cleanup (Priority: P2)

After viewing the leaderboard, the Game Master wants to close the session completely, disconnecting all players and freeing up resources.

**Why this priority**: Important for proper resource management and clean session lifecycle, but not critical to the leaderboard feature itself.

**Independent Test**: Can be tested by ending a game, displaying leaderboard, clicking "Close Session", and verifying all players are disconnected and session is removed from active sessions.

**Acceptance Scenarios**:

1. **Given** the leaderboard is displayed, **When** the GM clicks "Close Session", **Then** all player sockets should be disconnected gracefully with a "Game ended by host" message
2. **Given** the session is closed, **When** the session cleanup interval runs, **Then** the closed session should be removed from memory immediately (not waiting for inactivity timeout)

---

### Edge Cases

- What happens if a player disconnects while the leaderboard is being displayed?
- How does the system handle ending a game that's in the middle of an active question (buzzer pressed, GM hasn't awarded points yet)?
- Should there be a confirmation dialog before ending the game to prevent accidental clicks?
- What happens if the GM disconnects after ending the game but before closing the session?
- Should the leaderboard be persistent (players can still see it after refreshing) or only shown once?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Game Master interface MUST provide an "End Game" button visible during all game states (waiting, active, scoring)
- **FR-002**: System MUST provide a new game state `ENDED` to represent a concluded game session
- **FR-003**: System MUST provide a WebSocket event `endGame` that transitions the session to ENDED state
- **FR-004**: Upon game end, system MUST broadcast `gameEnded` event to all connected players with leaderboard data
- **FR-005**: Leaderboard data MUST include: player rankings (handling ties), player names, final scores, total players
- **FR-006**: System MUST calculate rankings correctly: tied players share the same rank number, next rank skips appropriately (e.g., two 1st place → next is 3rd)
- **FR-007**: Tied players MUST be sorted alphabetically by name within their tied rank
- **FR-008**: Frontend MUST display leaderboard with visual hierarchy: top 3 positions emphasized, remaining players listed below
- **FR-009**: Leaderboard UI MUST include celebratory animations (confetti, trophy icons, podium visualization for top 3)
- **FR-010**: Game Master interface MUST show "Start New Game" and "Close Session" buttons after game ends
- **FR-011**: "Start New Game" button MUST reset all scores to 0, clear buzzer queue, and transition to WAITING state with same players
- **FR-012**: "Close Session" button MUST disconnect all players, emit session closure event, and remove session from memory
- **FR-013**: Players MUST see the leaderboard displayed prominently on their screens when game ends
- **FR-014**: System MUST prevent buzzer presses when game state is ENDED
- **FR-015**: System MUST show confirmation dialog before ending game if a question is currently active (buzzer pressed, not yet scored)
- **FR-016**: Leaderboard display MUST be responsive and work well on mobile devices

### Key Entities

- **GameState**: Add new state `ENDED` to existing enum (WAITING, ACTIVE, SCORING, ENDED)
- **LeaderboardEntry**: Structure containing player name, score, rank, isTied boolean
- **LeaderboardData**: Structure containing array of LeaderboardEntry objects, total players, timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Game Masters can successfully end a game session and all participants see the leaderboard within 1 second
- **SC-002**: Leaderboard calculations are 100% accurate including proper handling of tied scores and rank skipping
- **SC-003**: Leaderboard UI is visually engaging with animations that enhance the fun experience (measured by user feedback)
- **SC-004**: "Start New Game" functionality allows GMs to begin a new game with the same players without requiring them to rejoin
- **SC-005**: "Close Session" cleanly disconnects all players and frees server resources without errors
- **SC-006**: Mobile leaderboard display is fully readable and animations perform smoothly on devices (60fps target)
- **SC-007**: Players cannot submit buzzer presses after game has ended (100% prevention rate)
