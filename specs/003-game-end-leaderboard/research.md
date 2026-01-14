# Research: Game End & Leaderboard

**Feature**: 003-game-end-leaderboard
**Date**: 2026-01-14
**Status**: Complete

This document consolidates research findings for technical decisions required by the Game End & Leaderboard feature.

---

## 1. Ranking Algorithm with Tie Handling

### Decision
Use **Standard Competition Ranking** (also known as "1224" ranking).

### Rationale
- Matches spec requirements (FR-006, FR-007):
  - Tied players share the same rank number
  - Next rank skips appropriately (e.g., two 1st place → next is 3rd)
  - Alphabetical sorting within tied ranks
- Most intuitive for trivia/quiz games (used by Kahoot, Quizizz, Jeopardy)
- Simple algorithm: Sort by score descending, then alphabetically ascending

### Alternatives Considered
- **Dense Ranking** ("1223"): No rank gaps after ties, but less intuitive for competitive games
- **Ordinal Ranking** ("1234"): No ties allowed, would require tiebreaker logic (timestamp, etc.)

### Implementation Algorithm
```typescript
function calculateLeaderboard(players: Player[]): LeaderboardEntry[] {
  // 1. Sort by score (descending), then by name (ascending for ties)
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.nickname.localeCompare(b.nickname);
  });

  // 2. Assign ranks with tie handling
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    const prevPlayer = i > 0 ? sorted[i - 1] : null;

    // If same score as previous, share rank
    if (prevPlayer && player.score === prevPlayer.score) {
      entries.push({
        playerId: player.playerId,
        nickname: player.nickname,
        score: player.score,
        rank: entries[i - 1].rank,
        isTied: true,
      });
      // Mark previous entry as tied too
      entries[i - 1].isTied = true;
    } else {
      entries.push({
        playerId: player.playerId,
        nickname: player.nickname,
        score: player.score,
        rank: currentRank,
        isTied: false,
      });
    }

    currentRank++;
  }

  return entries;
}
```

### Implementation Notes
- Service layer: `backend/src/services/leaderboard-service.ts`
- Unit tests must cover: no ties, 2-way tie, 3-way tie, multiple tie groups, zero players, single player
- Edge case: All players have same score → all ranked 1st (tied)

---

## 2. Leaderboard Animation Libraries

### Decision
Use **canvas-confetti** library for confetti effects, **Tailwind CSS animations** for podium/trophy effects.

### Rationale
- **canvas-confetti**:
  - Lightweight (13KB minified)
  - Canvas-based (GPU-accelerated, performs well on mobile)
  - Highly customizable (colors, shapes, origins)
  - No React wrapper needed (works with useEffect)
  - Used by production apps (Slack, GitHub)
- **Tailwind CSS animations**:
  - Already in stack, zero bundle size increase
  - CSS animations are GPU-accelerated (transform, opacity)
  - Sufficient for podium slide-ins, trophy pulse effects
  - Mobile-optimized by default

### Alternatives Considered
- **react-confetti**: React-specific, but uses canvas element for rendering (14KB). Similar performance, but canvas-confetti has better customization.
- **react-rewards**: Includes confetti + balloons + emoji, but heavier (25KB) and more than we need.
- **Pure CSS confetti**: Possible but complex, harder to control timing/density.

### Implementation Pattern
```typescript
// Confetti trigger
import confetti from 'canvas-confetti';

useEffect(() => {
  if (gameState === GameState.ENDED && leaderboard) {
    // Fire confetti for top 3
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#C0C0C0', '#CD7F32'], // Gold, silver, bronze
    });
  }
}, [gameState, leaderboard]);
```

```css
/* Podium animation (Tailwind) */
@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.podium-enter {
  @apply animate-[slideInUp_0.6s_ease-out];
}
```

### Implementation Notes
- Install: `npm install canvas-confetti` + `npm install -D @types/canvas-confetti`
- Confetti fires once on game end (not looping)
- Top 3 players get podium visualization with staggered animations (0ms, 100ms, 200ms delays)
- Trophy icons from existing assets or Unicode: 🏆 (1st), 🥈 (2nd), 🥉 (3rd)

---

## 3. WebSocket Broadcast Patterns for Game End

### Decision
Use **Socket.IO room broadcast** (`io.to(joinCode).emit()`) for single `game:ended` event containing full leaderboard data.

### Rationale
- Room broadcasts ensure all connected clients in session receive event atomically
- Single event with complete data prevents race conditions (vs separate state + data events)
- Matches existing pattern from `session:updated` broadcasts
- Server is source of truth: leaderboard calculated server-side, broadcast to all

### Event Sequence
1. GM calls `gm:endGame`
2. Backend validates session and GM authority
3. Backend calculates leaderboard (via leaderboard-service)
4. Backend updates session: `gameState = ENDED`, `leaderboard = data`
5. Backend broadcasts `game:ended` event to room with leaderboard
6. All clients (GM + players) receive event simultaneously
7. Clients render leaderboard UI

### Disconnection Handling
- **Player disconnects after game ends**: No impact, leaderboard already shown. Player can rejoin session (if not closed) to see leaderboard again.
- **GM disconnects during ENDED state**: Session persists in memory. GM can reconnect (Feature 002 will handle this). Players still see leaderboard.
- **Session closed by GM**: `gm:closeSession` emits `session:closed` to all, then disconnects all sockets, then deletes session from memory.

### Implementation Notes
- Broadcast: `io.to(joinCode).emit('game:ended', { joinCode, leaderboard, timestamp })`
- Frontend: Listen for `game:ended`, store leaderboard in component state, render UI
- No persistence: If player refreshes after game ends, leaderboard may not be visible (session might be closed or cleaned up). This is acceptable for MVP.

---

## 4. Mobile Animation Performance

### Decision
Use **CSS animations with GPU acceleration** (transform, opacity) for podium effects. Use **canvas-confetti** (canvas-based, GPU-accelerated) for confetti.

### Rationale
- **CSS animations** (via Tailwind `@keyframes`):
  - GPU-accelerated when using `transform` and `opacity` properties
  - Avoids main thread blocking
  - Declarative, easy to test
  - Performs well on iOS Safari and Chrome Mobile (60fps achievable)
- **canvas-confetti**:
  - Uses `<canvas>` element, which is GPU-accelerated
  - Runs off main thread (Web Workers compatible)
  - Tested on mobile browsers, achieves 60fps on modern devices

### Techniques for 60fps Target
1. **Use `transform` instead of `top`/`left`**: Triggers GPU compositing, not layout reflow
2. **Use `opacity` instead of `display` or `visibility`**: Avoids repaints
3. **Avoid animating `width`/`height`/`margin`/`padding`**: These trigger layout recalculation
4. **Use `will-change: transform` for complex animations**: Hints browser to optimize
5. **Stagger animations**: Animate top 3 podiums with delays (0ms, 100ms, 200ms) to reduce simultaneous GPU load
6. **Limit confetti particle count on mobile**: Use `window.innerWidth < 768 ? 50 : 100` particles

### Implementation Example
```tsx
// Leaderboard component
<div className={cn(
  "transform transition-all duration-600 ease-out",
  "hover:scale-105", // Subtle hover effect
  rank <= 3 && "animate-slideInUp" // Podium animation
)}
style={{
  animationDelay: rank === 1 ? '0ms' : rank === 2 ? '100ms' : '200ms',
  willChange: 'transform'
}}>
  {/* Player card */}
</div>
```

### Testing Strategy
- Test on iOS Safari (notorious for animation performance issues)
- Use Chrome DevTools "Performance" tab → record → check for dropped frames
- Use `requestAnimationFrame` callback to measure actual FPS if needed

### Implementation Notes
- Mobile-first: Base animations work on mobile, desktop can have enhanced effects (more confetti, more complex animations)
- Fallback: If `prefers-reduced-motion` is set, disable animations completely (accessibility)

---

## 5. Session Cleanup Timing

### Decision
ENDED sessions use **existing 10-minute inactivity cleanup**, with immediate cleanup only on explicit "Close Session" action.

### Rationale
- **User Experience**: Players should be able to see leaderboard for a reasonable time (10 minutes is generous)
- **Resource Management**: 10-minute window is acceptable for in-memory sessions (minimal memory footprint: ~5KB per session)
- **Reconnection Support**: If player or GM refreshes during ENDED state, they can still access the leaderboard within the 10-minute window
- **Explicit Control**: GM has "Close Session" button for immediate cleanup if desired

### Session Lifecycle for ENDED State
- Game ends (state → ENDED) → session persists in memory
- Session lastActivity updated on any socket event (including GM/player heartbeats)
- Cleanup interval runs every 5 minutes (existing), checks `lastActivity + 10 minutes < now`
- If GM clicks "Close Session":
  - Emit `session:closed` to all clients
  - Disconnect all sockets
  - **Immediately remove from session Map** (bypass inactivity timer)

### Edge Cases
- **GM closes session while players viewing leaderboard**: Players receive `session:closed` event, see "Session closed by host" message, socket disconnects
- **Session times out (10min) during ENDED state**: Players get standard `disconnect` event, can rejoin if session still exists (race condition edge case, acceptable)
- **GM starts new game**: Session transitions from ENDED → WAITING, leaderboard cleared, players see updated session state

### Implementation Notes
- No new cleanup logic needed for ENDED state (uses existing `session-manager` cleanup interval)
- `gm:closeSession` handler must call `sessionManager.deleteSession(joinCode)` directly (not wait for interval)
- Frontend should handle `session:closed` event gracefully: show modal, clear session state, redirect to home or show "rejoin" option

---

## Summary of Decisions

| Research Area | Decision | Key Benefit |
|---------------|----------|-------------|
| Ranking Algorithm | Standard Competition Ranking (1224) | Intuitive for trivia, handles ties correctly |
| Animation Library | canvas-confetti + Tailwind CSS | Lightweight, mobile-performant, GPU-accelerated |
| WebSocket Pattern | Room broadcast with single `game:ended` event | Atomic delivery, simple state sync |
| Mobile Performance | CSS transform/opacity + canvas | 60fps achievable, GPU-accelerated |
| Session Cleanup | 10-minute window + explicit close | Good UX, minimal resource impact |

---

**Status**: All research complete. Ready for Phase 1 (Design & Contracts).
