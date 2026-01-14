# Quickstart: GM Session Reconnection

**Feature**: 002-gm-session-reconnect
**Date**: 2026-01-14

This guide demonstrates how to use the GM session reconnection feature as a Game Master.

---

## Overview

Previously, if you refreshed your browser or closed the tab, you had to create a new session when you came back. This left your players stranded in the old session.

Now, you can reconnect to your existing sessions! After entering your password, you'll see a list of all your active sessions and can choose to rejoin one or create a new session.

---

## For Game Masters

### 1. Enter Your GM Password

Navigate to the Game Master page and enter your GM password (same as always).

**What's different**: Instead of immediately creating a new session, the app now checks if you have any existing sessions with this password.

---

### 2. Choose Your Session

After entering your password, you'll see one of two screens:

#### Option A: You Have Existing Sessions

You'll see a **list of your active sessions** with details:
- **Join Code**: The session identifier (e.g., "ABC123")
- **Players**: Number of connected players vs total (e.g., "4/5 players online")
- **Game State**: Current state (Waiting, Active, Scoring, Ended)
- **Progress**: Current question number (e.g., "Question 5")
- **Timestamps**: When created and last active (e.g., "Created 10 minutes ago, Last active 2 minutes ago")

**Sessions are sorted by most recent activity** - your actively-used session appears at the top.

**Select a session** to reconnect, or click **"Create New Session"** to start fresh.

---

#### Option B: No Existing Sessions

If this is your first session or all previous sessions have expired (10+ minutes inactive), you'll see:

**"No active sessions found. Create a new session to get started!"**

Click **"Create New Session"** to begin.

---

### 3. Reconnect to Existing Session

When you click on a session from the list:

1. The app verifies your password matches the session
2. You're reconnected to the session
3. You see the full game state:
   - All players (with current scores)
   - Current game state (waiting/active/scoring)
   - Current question number
   - All existing buzzer presses (if in scoring state)

**What players see**: Optionally, players may see a notification "Game Master reconnected" (depending on implementation).

**Your actions continue seamlessly** - start questions, assign points, end questions, just like before.

---

### 4. Create New Session

When you click **"Create New Session"**:

1. A new session is created with a unique join code
2. You're immediately taken to the GM interface
3. The session is now listed under your password
4. Players can join using the new join code

**Old sessions remain active** (for 10 minutes) - you can have multiple parallel sessions with the same password.

---

## Common Scenarios

### Scenario 1: Accidental Page Refresh

**Problem**: You're running a trivia game with 5 players. You accidentally refresh the browser tab.

**Solution**:
1. Re-enter your GM password
2. See your active session in the list (e.g., "ABC123 - 5/5 players online, Question 3")
3. Click on the session to reconnect
4. Continue the game without missing a beat

**Benefit**: Players never knew you were gone. No need to tell them to rejoin a new session.

---

### Scenario 2: Switching Devices

**Problem**: You started the game on your laptop, but need to switch to your phone while moving to a different room.

**Solution**:
1. Open the Game Master page on your phone
2. Enter your GM password
3. See your active session in the list
4. Reconnect to the session from your phone
5. Continue running the game from your phone

**Benefit**: Seamless device switching during the game.

---

### Scenario 3: Managing Multiple Games

**Problem**: You're running two parallel trivia games (e.g., Room A and Room B).

**Solution**:
1. Create both sessions with the same GM password
2. If you need to check on Room B while Room A is active:
   - Enter your GM password
   - See both sessions in the list
   - Select the Room B session to switch to it
3. Both sessions remain active independently

**Benefit**: Easy session management for multiple concurrent games.

---

### Scenario 4: Session Expired

**Problem**: You left a game idle for more than 10 minutes (no player activity).

**Solution**:
- The session is automatically cleaned up
- When you enter your password, it won't appear in the session list
- Create a new session to continue

**Benefit**: Clean slate for new games, no need to manually delete old sessions.

---

## Security & Ownership

### Password Ownership

- **Sessions are tied to the GM password that created them**
- Only GMs with the correct password can reconnect to a session
- If you forget your password, you cannot recover the session (after 10 minutes it will auto-cleanup)

### Password Best Practices

- Use a strong, memorable password (minimum 4 characters, recommended 8+)
- Don't share your GM password with players
- If running multiple games, use the same password for easier session management

### Cannot Change Password

- Once a session is created, the password is permanently tied to it
- You cannot change the GM password for an existing session
- To use a different password, create a new session

---

## Technical Details (for Developers)

### Session Metadata Structure

When displaying the session list, the following metadata is shown:
```typescript
{
  joinCode: 'ABC123',
  playerCount: 5,                 // Total players
  connectedPlayerCount: 4,        // Currently online
  createdAt: 1705267200000,       // Unix timestamp
  lastActivity: 1705267800000,    // Unix timestamp
  gameState: GameState.ACTIVE,    // Waiting | Active | Scoring | Ended
  questionNumber: 3,              // Current question
}
```

### WebSocket Events Flow

**Getting Session List**:
```
1. GM enters password
2. Frontend emits: gm:getActiveSessions { gmPassword }
3. Backend hashes password, queries sessions
4. Backend returns: { success: true, sessions: [...], totalCount: N }
5. Frontend displays session list
```

**Reconnecting to Session**:
```
1. GM clicks on session card
2. Frontend emits: gm:reconnectToSession { joinCode, gmPassword }
3. Backend validates password, joins socket to room
4. Backend returns: { success: true, session: {...} }
5. Frontend displays GM interface with full session state
```

**Creating New Session**:
```
1. GM clicks "Create New Session"
2. Frontend emits: gm:createSession { gmPassword }
3. Backend hashes password, creates session
4. Backend returns: { success: true, joinCode, session: {...} }
5. Frontend displays GM interface with new session
```

---

## Troubleshooting

### "Incorrect GM password for this session"
**Problem**: You're trying to reconnect to a session, but the password doesn't match.

**Solution**: Verify you're entering the same password you used when creating the session. If you forgot the password, wait 10 minutes for the session to auto-cleanup and create a new one.

---

### "No active sessions found"
**Problem**: You expected to see a session in the list, but it's not there.

**Possible Reasons**:
1. **Session expired**: More than 10 minutes of inactivity → session auto-cleaned up
2. **Wrong password**: Using a different password than the one used to create the session
3. **Session closed**: You previously clicked "Close Session" on that session

**Solution**: Create a new session.

---

### Session list shows wrong player count
**Problem**: Session shows "0/5 players" but you know players are connected.

**Possible Reason**: Players disconnected (network issue, closed browser), but sessions weren't cleaned up yet.

**Solution**: Reconnect to the session and check the actual player list. Disconnected players will show `isConnected: false`.

---

## Testing Checklist

- [ ] Enter GM password → See existing sessions (if any)
- [ ] Enter GM password → See "No sessions found" (if no sessions exist)
- [ ] Click on session from list → Reconnect successfully
- [ ] Reconnected session shows correct game state (players, scores, question)
- [ ] Click "Create New Session" → New session created
- [ ] Refresh page mid-game → Reconnect to same session
- [ ] Create session, wait 10+ minutes inactive → Session auto-cleanup, no longer in list
- [ ] Try to reconnect with wrong password → "Password mismatch" error
- [ ] Reconnect from different device → Works seamlessly
- [ ] Multiple sessions with same password → All listed, sorted by activity
- [ ] Mobile display → Session cards readable, tap targets large enough (44x44px)

---

**Ready to use!** See `data-model.md` and `contracts/` for technical implementation details.
