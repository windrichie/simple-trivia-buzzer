# Quickstart: Game End & Leaderboard

**Feature**: 003-game-end-leaderboard
**Date**: 2026-01-14

This guide demonstrates how to use the game end and leaderboard feature as a Game Master or Player.

---

## For Game Masters

### 1. End the Game

Once you've finished all trivia questions and are ready to conclude the game:

1. Click the **"End Game"** button (visible in all game states: waiting, active, scoring)
2. Confirmation dialog appears if a question is currently active
3. All players and the GM see the leaderboard simultaneously

**What happens**:
- Game state transitions to `ENDED`
- Leaderboard is calculated with final rankings
- All buzzers are disabled
- Confetti animation plays for celebration 🎉

---

### 2. Review the Leaderboard

The leaderboard displays:
- **Top 3**: Highlighted with podium visualization (🥇 1st, 🥈 2nd, 🥉 3rd)
- **All players**: Ranked by score (highest to lowest)
- **Ties**: Players with identical scores share the same rank
  - Example: Two players with 30 points → both ranked **1st (tie)**
  - Next player ranked **3rd** (rank 2 is skipped)
- **Alphabetical order**: Tied players sorted alphabetically by name

**Example Leaderboard**:
```
🥇 1st (tie): Alice (30 pts)
🥇 1st (tie): Charlie (30 pts)
🥉 3rd: Eve (25 pts)
   4th: Bob (20 pts)
   5th: David (10 pts)
```

---

### 3. Options After Game Ends

You have two options:

#### Option A: Start New Game (with same players)

Click **"Start New Game"** to:
- Reset all player scores to 0
- Clear the leaderboard
- Return to WAITING state
- Keep all current players in the session

**Use Case**: Running multiple rounds with the same group.

**What happens**:
- Leaderboard disappears
- Players see "New game starting..." message
- Question counter resets to 0
- Buzzers remain disabled until you start the first question

---

#### Option B: Close Session (end completely)

Click **"Close Session"** to:
- Disconnect all players
- Remove the session from memory
- Invalidate the join code

**Use Case**: Ending the trivia night completely.

**What happens**:
- All players see "Session closed by host" message
- Players are disconnected from the WebSocket
- Session is deleted immediately (no 10-minute grace period)

---

## For Players

### 1. Game Ends

When the Game Master ends the game:

1. You see a **celebratory animation** (confetti 🎊)
2. The **leaderboard appears** showing your final rank and score
3. Your **buzzer button is disabled**

---

### 2. View Your Ranking

The leaderboard shows:
- Your rank (e.g., 1st, 2nd, 3rd, etc.)
- Your final score
- Other players' rankings and scores

**Tie Indicator**:
- If you tied with others, you'll see **(tie)** next to your rank
- Example: **1st (tie)** means multiple players have the same top score

---

### 3. What Happens Next

**If GM starts a new game**:
- Leaderboard clears
- Your score resets to 0
- You stay in the session (no need to rejoin)
- Wait for GM to start the first question

**If GM closes the session**:
- You see "Session closed by host" message
- You're disconnected from the game
- Join code becomes invalid
- You can start a new session or join a different one

---

## Edge Cases & FAQs

### Q: What if I refresh the page during the leaderboard?
**A**: If the session is still active (within 10 minutes), you can rejoin and see the leaderboard again. If the GM closed the session, you'll see "Session not found."

### Q: What if the GM disconnects after ending the game?
**A**: The session persists in memory for 10 minutes. Players can still see the leaderboard. If the GM reconnects (Feature 002), they can resume control.

### Q: Can I buzz after the game ends?
**A**: No, buzzer is disabled in ENDED state. You'll see an error if you try.

### Q: What if everyone has the same score?
**A**: All players are ranked **1st (tie)**. It's a perfect tie!

### Q: What if no one played (0 players)?
**A**: GM sees "No players participated" message with option to close session.

### Q: What if only one player played?
**A**: That player is ranked **1st** (not marked as tied). Still gets confetti! 🎉

---

## Ranking Examples

### Example 1: No Ties
```
Players: Alice (30), Bob (25), Charlie (20)
Leaderboard:
1st: Alice (30)
2nd: Bob (25)
3rd: Charlie (20)
```

### Example 2: Two-Way Tie at Top
```
Players: Alice (30), Bob (30), Charlie (20)
Leaderboard:
1st (tie): Alice (30)  ← Alphabetically first
1st (tie): Bob (30)
3rd: Charlie (20)      ← Rank 2 skipped
```

### Example 3: Three-Way Tie at Top
```
Players: Alice (30), Bob (30), Charlie (30), David (20)
Leaderboard:
1st (tie): Alice (30)
1st (tie): Bob (30)
1st (tie): Charlie (30)
4th: David (20)        ← Ranks 2 and 3 skipped
```

### Example 4: Multiple Tie Groups
```
Players: Alice (30), Bob (30), Charlie (25), David (25), Eve (20)
Leaderboard:
1st (tie): Alice (30)
1st (tie): Bob (30)
3rd (tie): Charlie (25)
3rd (tie): David (25)
5th: Eve (20)
```

### Example 5: All Tied
```
Players: Alice (25), Bob (25), Charlie (25)
Leaderboard:
1st (tie): Alice (25)
1st (tie): Bob (25)
1st (tie): Charlie (25)
```

---

## Technical Notes (for Developers)

### WebSocket Events Flow

**Ending the Game**:
```
1. GM clicks "End Game"
2. Frontend emits: gm:endGame { joinCode }
3. Backend validates, calculates leaderboard
4. Backend broadcasts: game:ended { joinCode, leaderboard, timestamp }
5. All clients receive event and display leaderboard
```

**Starting New Game**:
```
1. GM clicks "Start New Game"
2. Frontend emits: gm:startNewGame { joinCode }
3. Backend validates (only in ENDED state), resets scores
4. Backend broadcasts: game:newGameStarted { joinCode, session }
5. All clients clear leaderboard, show waiting state
```

**Closing Session**:
```
1. GM clicks "Close Session"
2. Frontend emits: gm:closeSession { joinCode }
3. Backend broadcasts: session:closed { joinCode, reason }
4. Backend disconnects all sockets
5. Backend deletes session from memory
```

---

## Testing Checklist

- [ ] End game from WAITING state (no questions played)
- [ ] End game from ACTIVE state (during question)
- [ ] End game from SCORING state (after scoring)
- [ ] Leaderboard displays correctly with no ties
- [ ] Leaderboard displays correctly with 2-way tie
- [ ] Leaderboard displays correctly with 3+ way tie
- [ ] Alphabetical ordering within tied ranks
- [ ] Confetti animation plays on game end
- [ ] "Start New Game" resets scores and returns to WAITING
- [ ] "Close Session" disconnects all players
- [ ] Buzzer disabled in ENDED state
- [ ] Mobile leaderboard display is readable and responsive
- [ ] Animations perform smoothly (60fps) on mobile devices

---

**Ready to implement!** See `data-model.md` and `contracts/` for technical details.
