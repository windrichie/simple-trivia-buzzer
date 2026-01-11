# Feature Specification: Trivia Buzzer App

**Feature Branch**: `001-trivia-buzzer-app`
**Created**: 2026-01-11
**Status**: Draft
**Input**: User description: "I want to create a new project to create a really simple app to accompany a trivia night with friends. Since it is just for fun, I want to keep the cost minimum (basically free tier if we can), will use Vercel free tier."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Master Creates and Manages Game Session (Priority: P1)

A game master wants to host a trivia night with friends. They access the game master interface (protected by password), create a new game session with a shareable join code, and share this code with 3-5 players so they can join the game.

**Why this priority**: This is the foundation of the entire app. Without the ability to create and join sessions, no other features can function. This represents the minimum viable product.

**Independent Test**: Can be fully tested by creating a session, receiving a join code, and verifying that players can use this code to connect to the same session. Delivers the core value of coordinating multiple devices for a shared game experience.

**Acceptance Scenarios**:

1. **Given** the game master navigates to the game master page, **When** they enter the correct password, **Then** they gain access to the game master interface
2. **Given** the game master is on the game master interface, **When** they create a new game session, **Then** a unique join code is generated and displayed
3. **Given** a game session exists with a join code, **When** a player enters this join code on the player page, **Then** they successfully join the session
4. **Given** multiple players (3-5) have the same join code, **When** they all enter it, **Then** they all join the same game session

---

### User Story 2 - Players Buzz In During Questions (Priority: P1)

During a trivia question, players want to buzz in to answer. When they press their buzzer, it plays a sound and the system identifies who buzzed first. Each player can customize their buzzer sound from a list of options to make it more fun and identifiable.

**Why this priority**: This is the core gameplay mechanic and the primary reason for building this app. Without a working buzzer that identifies who pressed first, the app loses its main value proposition.

**Independent Test**: Can be tested by having multiple players connected to a session, showing a question, and having them buzz in. The system should play sounds and clearly identify the first player to buzz. This delivers immediate value for managing the competitive aspect of trivia night.

**Acceptance Scenarios**:

1. **Given** the game master has started a question (question active state), **When** a player presses their buzzer button, **Then** their buzzer sound plays and they are marked as having buzzed in
2. **Given** multiple players are in a question active state, **When** they press their buzzers at different times, **Then** the system identifies and displays who pressed first
3. **Given** a player is on the player interface, **When** they access sound customization, **Then** they can select from a list of available buzzer sounds
4. **Given** a player has selected a custom buzzer sound, **When** they press the buzzer, **Then** their chosen sound plays instead of the default
5. **Given** the game master has not yet started a question (waiting state), **When** a player tries to press the buzzer, **Then** the buzzer is disabled and does not respond

---

### User Story 3 - Score Tracking and Display (Priority: P2)

Players want to see their current scores throughout the game. The game master assigns points (positive or negative) after each question based on correct or incorrect answers, and players can see their scores update in real-time.

**Why this priority**: Score tracking adds competitive fun and helps track progress throughout the game, but the basic buzzer mechanic (P1) could work without it for casual play.

**Independent Test**: Can be tested by creating a session, having players join, and having the game master award/deduct points after questions. Players should see their scores update. This delivers value for competitive gameplay and progress tracking.

**Acceptance Scenarios**:

1. **Given** players have joined a game session, **When** they view the player interface, **Then** they see their current score (starting at 0)
2. **Given** a question has been answered, **When** the game master assigns points (positive or negative) to specific players, **Then** those players' scores update accordingly
3. **Given** scores have been updated, **When** players view their interface, **Then** they see their updated scores in real-time
4. **Given** multiple players are in the same session, **When** viewing the game master interface, **Then** the game master can see all players' scores

---

### User Story 4 - Player Identification and Customization (Priority: P2)

When joining a game, players want to enter their name or nickname so everyone knows who is playing. They also set a simple personal password to enable reconnection if they get disconnected or refresh their browser. This makes the game more personal and helps identify who buzzed in or scored points, while ensuring players can rejoin mid-game without losing their progress.

**Why this priority**: While helpful for identification, players could technically play with system-generated identifiers. However, this significantly improves the user experience and social aspect of the game. The reconnection capability is important for handling network issues or accidental disconnections during gameplay.

**Independent Test**: Can be tested by having players join, enter custom names and passwords, disconnect, and successfully rejoin with preserved scores. These names should appear throughout the interface when referencing players. Delivers value for personalization, clear identification, and resilience during gameplay.

**Acceptance Scenarios**:

1. **Given** a player has entered a join code, **When** they join the session, **Then** they are prompted to enter their name/nickname and set a personal password
2. **Given** a player attempts to proceed without entering a nickname, **When** they try to join, **Then** the system prevents them and displays a validation message requiring a nickname
3. **Given** a player has entered their name and password, **When** they interact with the game (buzzing, scoring), **Then** their name is displayed instead of a generic identifier
4. **Given** multiple players have joined, **When** the game master views the player list, **Then** they see each player's chosen name
5. **Given** a player has disconnected (network issue or browser refresh), **When** they re-enter the join code, nickname, and password, **Then** they rejoin the same session with their score preserved
6. **Given** a player attempts to rejoin with incorrect password, **When** they submit credentials, **Then** the system rejects the reconnection and displays an authentication error

---

### User Story 5 - Question Flow Management (Priority: P1)

The game master controls the flow of each question through distinct stages: waiting (players cannot buzz), question active (players can buzz to answer), and scoring (game master assigns points, players cannot buzz). The game master can move through unlimited questions and end the game whenever desired.

**Why this priority**: This is essential for maintaining game control and preventing chaos. Without stage management, players could buzz at any time, making the game unmanageable.

**Independent Test**: Can be tested by having the game master transition through different question stages and verifying that player buzzer access is controlled appropriately. Delivers value for structured, organized gameplay.

**Acceptance Scenarios**:

1. **Given** the game master is on the game master interface, **When** they start a new question, **Then** the game enters "question active" state and players can buzz in
2. **Given** a question is in "question active" state and at least one player has buzzed, **When** the game master transitions to scoring, **Then** players can no longer buzz and the game master can assign points
3. **Given** a question is in "question active" state and no players have buzzed, **When** the game master attempts to transition to scoring, **Then** the system prevents the transition and displays a message
4. **Given** a question is in "question active" state and no players have buzzed, **When** the game master chooses to skip the question, **Then** the system returns to waiting state and allows starting a new question
5. **Given** the game master is in scoring state, **When** they finish assigning points, **Then** they can start a new question (returning to "question active" state)
6. **Given** the game is running, **When** the game master decides to end it, **Then** they can end the session at any time without restriction on question count
7. **Given** the game master has not started a question, **When** the system is in waiting state, **Then** players see an indicator that they should wait and their buzzers are disabled

---

### User Story 6 - Auto-Fill Credentials for Reconnection (Priority: P3)

When players close their browser tab and reopen the app, they want their join code, nickname, and password to be automatically filled so they can quickly rejoin without manually re-entering credentials. This is a convenience feature that reduces friction when players accidentally close the tab or take a break.

**Why this priority**: This is a nice-to-have enhancement that improves user experience but is not essential for core gameplay. Players can always manually re-enter credentials, so this is a polish feature that can be added after core functionality is working.

**Independent Test**: Can be tested by having a player join a session, close the browser tab completely, reopen the app, and verify that their credentials are pre-filled. They should be able to rejoin with a single click. Delivers value for convenience and reduced friction.

**Acceptance Scenarios**:

1. **Given** a player has successfully joined a session with credentials, **When** the app stores their join code, nickname, and password in browser localStorage, **Then** these credentials persist even after closing the tab
2. **Given** a player has previously joined and their credentials are in localStorage, **When** they reopen the app, **Then** the join form is pre-filled with their saved credentials
3. **Given** credentials are pre-filled from localStorage, **When** the player clicks "Rejoin", **Then** they automatically reconnect to the session (if still active) without manually typing anything
4. **Given** a player wants to clear saved credentials, **When** they access a "Clear Saved Data" option, **Then** localStorage is cleared and the form appears empty on next visit
5. **Given** the session has ended or is no longer active, **When** the player tries to rejoin with auto-filled credentials, **Then** the system displays an appropriate error message

---

### Edge Cases

- **Player disconnection/refresh**: When a player loses connection mid-game, they should be able to rejoin with the same name and score. To enable this, players will set a simple password when joining (in addition to their nickname). When reconnecting, they use the join code + nickname + password to restore their session.

- **Simultaneous buzzer presses**: When two or more players buzz in at exactly the same millisecond (timestamp collision), the system will randomly select one as "first" from those who tied.

- **Game master disconnection**: If the game master disconnects, they can rejoin and resume the session using the game master password. The session persists as long as at least one player remains connected.

- **Session cleanup**: Old/inactive sessions will be automatically cleaned up after a period of inactivity (e.g., 2 hours with no connections) to free up resources.

- **Exceeding player limit**: If more than 5 players attempt to join using the same code, the 6th and subsequent players will receive an error message that the session is full.

- **Missing player nickname**: Players must enter a nickname - it is mandatory. The interface will not allow proceeding without entering a name on the join screen.

- **No buzzer presses during question**: The game master cannot transition to scoring if no players have buzzed in. At least one player must buzz before scoring can begin (or the game master can skip to the next question).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support two distinct user roles: Game Master and Player
- **FR-002**: System MUST protect game master access with a password
- **FR-003**: Game Master MUST be able to create a new game session that generates a unique join code
- **FR-004**: Players MUST be able to join a game session using a join code
- **FR-005**: System MUST support 3-5 players per game session
- **FR-006**: Players MUST be able to enter and display their name/nickname when joining
- **FR-007**: System MUST provide a buzzer button for each player
- **FR-008**: System MUST play a sound when a player presses their buzzer
- **FR-009**: System MUST identify and display which player pressed their buzzer first when multiple players buzz in
- **FR-010**: Players MUST be able to select their buzzer sound from a predefined list
- **FR-011**: System MUST track each player's score throughout the game session
- **FR-012**: Players MUST be able to view their current score
- **FR-013**: Game Master MUST be able to view all players' scores
- **FR-014**: Game Master MUST be able to assign positive or negative points to players after each question
- **FR-015**: System MUST manage three distinct question states: waiting (buzzers disabled), question active (buzzers enabled), and scoring (buzzers disabled, points assignable)
- **FR-016**: Game Master MUST be able to transition between question states
- **FR-017**: System MUST disable player buzzers when not in "question active" state
- **FR-018**: System MUST enable player buzzers only when in "question active" state
- **FR-019**: Game Master MUST be able to start unlimited questions without restriction
- **FR-020**: Game Master MUST be able to end the game session at any time
- **FR-021**: System MUST synchronize game state (question stage, buzzer presses, scores) in real-time across all connected devices
- **FR-022**: Players MUST set a personal password when joining a session to enable reconnection
- **FR-023**: System MUST allow disconnected players to rejoin using their join code, nickname, and password while preserving their score
- **FR-024**: System MUST enforce nickname entry - players cannot proceed without entering a valid nickname
- **FR-025**: System MUST reject join attempts when a session already has 5 players and display a "session full" error
- **FR-026**: System MUST prevent game master from transitioning to scoring state unless at least one player has buzzed in
- **FR-027**: Game Master MUST be able to skip to the next question without scoring if no players buzzed
- **FR-028**: When multiple players buzz at exactly the same timestamp, system MUST randomly select one as "first"
- **FR-029** *(Optional - P3)*: System MAY store player credentials (join code, nickname, password) in browser localStorage after successful join
- **FR-030** *(Optional - P3)*: System MAY automatically pre-fill join form with stored credentials when player reopens the app
- **FR-031** *(Optional - P3)*: Players MAY be able to clear saved credentials from localStorage through a "Clear Saved Data" option

### Key Entities

- **Game Session**: Represents a single trivia game instance, identified by a unique join code, containing 3-5 players, current question state, and session status (active/ended)
- **Player**: A participant in the game session, characterized by chosen name/nickname, personal password (for reconnection), current score, selected buzzer sound, buzzer press timestamp, and connection status
- **Question State**: The current stage of gameplay, can be waiting (initial/between questions), active (players can buzz), or scoring (game master assigns points)
- **Buzzer Event**: A record of a player pressing their buzzer, containing player identity, timestamp, and audio to play

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can successfully join a game session in under 30 seconds from receiving the join code
- **SC-002**: System accurately identifies which player buzzed first with timestamp precision sufficient to resolve near-simultaneous buzzes
- **SC-003**: Buzzer sounds play within 100 milliseconds of button press for responsive gameplay
- **SC-004**: All connected players see score updates within 1 second of game master assigning points
- **SC-005**: Game master can control question flow (start, transition to scoring, start new question) with immediate response
- **SC-006**: System supports 3-5 concurrent players in a single session without performance degradation
- **SC-007**: Players can complete sound customization in under 15 seconds
- **SC-008**: 95% of players successfully enter their name and join game on first attempt

## Assumptions *(include when making informed guesses)*

1. **Data Persistence**: Since the user emphasized simplicity and free-tier hosting, we assume game sessions are ephemeral and do not need to persist after the session ends. Once the game master or all players disconnect, the session data can be discarded.

2. **Hosting Platform**: **Fly.io free tier is the recommended hosting platform** for this application. It provides native WebSocket support with no spin-down behavior, perfect for long-lived connections during 1-2 hour trivia games. The free tier includes 3 shared-cpu-1x VMs with 256MB RAM each, allowing a single-platform deployment without needing separate services. Unlike Render.com (which spins down after 15min inactivity and kills WebSocket connections), Fly.io maintains persistent connections throughout gameplay.

3. **Real-time Communication & Architecture**: The app uses WebSocket technology for real-time synchronization. The architecture follows a centralized model where:
   - **Server (Fly.io VM)** is the single source of truth, storing all game session data in server-side RAM (in-memory storage)
   - **Clients (player/game master browsers)** are "viewers" that display data and send actions to the server
   - When any action occurs (buzzer press, score update, state change), the server updates its RAM and broadcasts the new state to ALL connected clients via WebSocket
   - Clients do not persistently store game state - they only reflect what the server tells them
   - This ensures all players see synchronized updates in real-time (within ~1 second latency)

4. **Audio Assets**: A predefined list of 5-10 buzzer sounds will be provided as part of the application, stored as static audio files.

5. **Join Code Format**: Join codes will be short (4-6 alphanumeric characters) for easy verbal sharing and manual entry.

6. **Session Cleanup**: Game sessions will automatically clean up after a period of inactivity (e.g., 2 hours) or when explicitly ended by the game master. If the server restarts (Render.com spin-down or maintenance), all session data is lost since it's stored in RAM, not a database. This is acceptable for casual trivia games.

7. **Password Security**: Since this is a casual friends game, a single hardcoded password for game master access is acceptable (no need for encrypted storage or individual accounts). Player passwords for reconnection are simple text strings stored in the active session's server-side memory only.

8. **Browser Compatibility**: The app will target modern browsers (Chrome, Firefox, Safari, Edge) on both desktop and mobile devices.

9. **Network Reliability**: The app assumes reasonably stable internet connections. When players disconnect (due to network issues, browser refresh, or closing the tab), they can reconnect using their join code, nickname, and personal password to restore their session with preserved score. The session persists on the server as long as at least one player or the game master remains connected.

10. **Credential Convenience (Optional)**: To improve user experience, the app may optionally store join code, nickname, and password in browser localStorage. This allows automatic credential filling when players reopen the app, eliminating the need to manually re-enter credentials after closing the tab. This is purely a convenience feature and does not affect the core reconnection functionality.

11. **Concurrent Sessions**: Multiple independent game sessions can run simultaneously (different groups of friends), each isolated by their unique join codes.

12. **No Question Content**: The app does not manage trivia questions themselves. The game master reads questions verbally or from another source; the app only handles buzzer mechanics and scoring.

## Constraints *(include when relevant)*

1. **Player Limit**: Maximum 5 players per session (hard limit to keep interface manageable and suitable for small friend groups)
2. **Cost**: Must operate within Vercel free tier limits (serverless function execution time, bandwidth, etc.)
3. **Infrastructure**: No paid database services - must use free-tier options or ephemeral in-memory storage
4. **Single Game Master**: Each session has exactly one game master (no co-host or game master transfer functionality)
5. **No Historical Data**: No session history, analytics, or past game retrieval (keeps infrastructure simple)
6. **Single Device per Player**: Each player is expected to use one device; multiple devices per player are not supported
7. **Real-time Requirement**: All interactions must feel instantaneous (< 1 second latency) for competitive buzzer gameplay
8. **Sound Library Size**: Limited to 5-10 pre-provided buzzer sounds to keep asset size small

## Out of Scope *(include when relevant)*

1. **Question Management**: The app does not store, display, or manage trivia questions. Game masters handle questions externally.
2. **User Accounts**: No user registration, login, or persistent user profiles
3. **Historical Session Data**: No ability to view past games, statistics, or leaderboards across sessions
4. **Multiple Game Masters**: No support for co-hosting or transferring game master control
5. **Advanced Scoring**: No support for different point values per question, multipliers, or complex scoring rules beyond basic addition/subtraction
6. **Team Play**: No team-based gameplay - all players compete individually
7. **Voice/Video Chat**: No integrated communication features - players are expected to be in the same physical location or use external chat tools
8. **Custom Sound Upload**: Players can only select from predefined sounds, not upload their own
9. **Mobile App**: Web-only experience, no native iOS/Android apps
10. **Accessibility Features**: No screen reader support, high-contrast modes, or keyboard-only navigation in initial version
11. **Internationalization**: English-only interface in initial version
12. **Session Replay**: No ability to review or replay past questions/buzzes
13. **Spectator Mode**: No read-only observer role for non-players
