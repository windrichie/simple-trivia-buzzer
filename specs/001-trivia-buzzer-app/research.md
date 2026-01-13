# Technical Research: Trivia Buzzer App

**Feature**: 001-trivia-buzzer-app
**Date**: 2026-01-11
**Purpose**: Resolve technical unknowns from Technical Context and establish technology stack decisions

## Research Questions

### 1. Language & Type Safety

**Decision**: TypeScript with Node.js 22 LTS

**Rationale**:
- **TypeScript**: Provides type safety for complex real-time state management (sessions, players, game states)
- **Node.js 22 LTS**: Current LTS with active support until April 2027, latest features and performance improvements
- Type safety critical for WebSocket event handling where client-server contract must be strict
- Better IDE support and refactoring safety for a growing codebase
- Minimal overhead compared to JavaScript for this scale

**Alternatives Considered**:
- **Plain JavaScript**: Simpler but prone to runtime errors in WebSocket event handlers and state management
- **Node.js 20 LTS**: Still supported but Node 22 is the current LTS with longer support window
- **Bun**: Faster but less mature ecosystem, potential deployment issues on Render.com
- **Deno**: Better security model but less library support for WebSocket frameworks

---

### 2. WebSocket Library

**Decision**: Socket.IO v4.x

**Rationale**:
- **Automatic reconnection**: Built-in reconnection logic critical for handling network issues and Render.com spin-down/wake-up
- **Room support**: Native concept of "rooms" maps perfectly to game sessions
- **Fallback mechanisms**: Automatically falls back to long-polling if WebSocket unavailable
- **Established ecosystem**: Battle-tested in production, extensive documentation
- **Event-based API**: Clean abstraction for different game events (join, buzz, score, state change)
- **TypeScript support**: First-class TypeScript definitions

**Alternatives Considered**:
- **Native WebSocket (ws library)**: More lightweight but requires manual reconnection logic, room management, and fallback handling
- **Pusher/Ably/Supabase Realtime**: Third-party services add unnecessary complexity and potential cost as app scales beyond free tier
- **Server-Sent Events (SSE)**: One-way only, would need separate HTTP endpoints for client actions

---

### 3. Backend Framework

**Decision**: Express.js v4.x + Socket.IO

**Rationale**:
- **Minimal footprint**: Lightweight, perfect for small-scale app with few HTTP endpoints
- **Socket.IO integration**: Seamless integration via `socket.io` npm package
- **Static file serving**: Built-in support for serving frontend assets
- **Middleware ecosystem**: Easy to add CORS, compression, security headers
- **Mature and stable**: Well-documented, predictable behavior

**Alternatives Considered**:
- **Fastify**: Faster but overkill for this scale; learning curve not justified
- **Vanilla Node.js HTTP server**: More manual work for static serving and request routing
- **Next.js/Remix**: Full-stack frameworks too heavy for this simple use case

---

### 4. Frontend Framework

**Decision**: Next.js 14 (App Router) + shadcn/ui + Tailwind CSS

**Rationale**:
- **Next.js 14**: Modern React framework with App Router, perfect for 2-page apps
- **shadcn/ui**: Beautiful, accessible components out-of-the-box (buttons, cards, dialogs, toasts)
- **Tailwind CSS**: Utility-first CSS, mobile-first responsive design built-in
- **Mobile-first design**: Players and game master will primarily use mobile devices - Tailwind's responsive utilities make this trivial
- **Development speed**: Pre-built components mean faster development than vanilla DOM manipulation
- **Type safety**: Full TypeScript support throughout
- **Socket.IO integration**: Works seamlessly with client-side WebSocket connections
- **Render.com compatible**: Static export or SSR both work on Render.com

**Alternatives Considered**:
- **Vanilla TypeScript**: Would work but requires custom CSS and DOM manipulation for nice UI - slower development
- **React + Vite**: Lighter than Next.js but missing App Router conveniences and would need custom routing
- **Vue/Svelte**: Great frameworks but shadcn/ui is React-based, losing the component library benefit
- **Next.js 13 Pages Router**: Older pattern, App Router is more modern and simpler for new projects

---

### 5. Testing Framework

**Decision**: Vitest for unit/integration tests + Playwright for E2E

**Rationale**:
- **Vitest**: Vite-native testing, fast, TypeScript support out-of-box, Jest-compatible API
- **Playwright**: Excellent for testing WebSocket interactions in real browser environments
- **Node.js native test runner**: Considered but Vitest has better TypeScript support and mocking
- **E2E critical**: Need to test multi-client WebSocket scenarios (buzzer race conditions, reconnection)

**Alternatives Considered**:
- **Jest**: Slower with TypeScript, requires additional configuration for ESM
- **Mocha+Chai**: More configuration, older ecosystem
- **Cypress**: Good but heavier than Playwright, slower for WebSocket testing

---

### 6. Join Code Generation

**Decision**: Custom nanoid-based generator with 6-character alphanumeric codes

**Rationale**:
- **nanoid**: Cryptographically secure, URL-safe, customizable alphabet
- **6 characters**: Provides ~2 billion unique codes (36^6), more than sufficient
- **Uppercase only**: Easier to communicate verbally (A-Z, 0-9 excluding ambiguous chars like O/0, I/1)
- **Collision detection**: Check existing sessions before assigning code

**Implementation**:
```typescript
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
// Excludes: I, O, 0, 1 to avoid confusion
```

**Alternatives Considered**:
- **UUIDv4**: Too long (36 chars), not user-friendly for verbal communication
- **Random 4-digit numbers**: Too few combinations (10,000), higher collision risk
- **Words-based (like Wordle)**: Fun but requires word list, potential for inappropriate combinations

---

### 7. Session Storage & Cleanup

**Decision**: In-memory Map with TTL-based cleanup

**Rationale**:
- **JavaScript Map**: O(1) lookups by join code, native support, simple API
- **Structure**:
  ```typescript
  interface SessionStore {
    sessions: Map<JoinCode, GameSession>;
    lastActivity: Map<JoinCode, timestamp>;
  }
  ```
- **Cleanup strategy**: Interval-based sweep (every 10 minutes) to remove sessions inactive > 2 hours
- **Memory efficient**: Sessions are small (<5KB each), 100 concurrent sessions = ~500KB

**Alternatives Considered**:
- **Redis**: Overkill, adds deployment complexity, free tiers limited
- **Plain object**: No native cleanup, requires more manual management
- **LRU cache**: Unnecessary complexity, we have explicit TTL requirements

---

### 8. Timestamp Synchronization for Buzzer

**Decision**: Server-authoritative timestamps with `Date.now()`

**Rationale**:
- **Server authority**: Only server timestamps matter, eliminates client clock skew issues
- **Process**:
  1. Client presses buzzer → sends event
  2. Server receives → immediately timestamps with `Date.now()`
  3. Server compares all received timestamps for that question
  4. Lowest timestamp wins (first buzzer)
- **Tie-breaking**: If timestamps identical (rare), use random selection per spec

**Alternatives Considered**:
- **Client-side timestamps**: Vulnerable to clock skew and manipulation
- **High-resolution timestamps (process.hrtime)**: Unnecessary precision, Date.now() sufficient for human reaction times (>100ms)

---

### 9. Audio Playback Strategy

**Decision**: Client-side HTML5 Audio API with preloaded assets

**Rationale**:
- **HTML5 Audio**: Native browser support, works on mobile
- **Preloading**: Load all sound files on page load to minimize playback latency
- **Asset format**: MP3 (broad compatibility) with OGG fallback
- **Size target**: 5-10 sounds @ ~20-50KB each = 100-500KB total
- **Playback trigger**: Client plays sound locally when they press buzzer (immediate feedback), server confirms to all

**Alternatives Considered**:
- **Web Audio API**: More powerful but overkill, higher complexity
- **Server-side streaming**: Adds latency, unnecessary bandwidth
- **On-demand loading**: Introduces latency on first play

---

### 10. Fly.io Deployment

**Decision**: Single Node.js web service with Next.js production build on Fly.io

**Rationale**:
- **Persistent connections**: Fly.io free tier has no spin-down behavior, perfect for long WebSocket sessions (1-2 hour trivia games)
- **No timeout disconnects**: Unlike Render.com (15min inactivity spin-down), Fly.io maintains connections continuously
- **Single service**: Backend (Express + Socket.IO) runs alongside Next.js
- **Build process**: `next build` creates optimized production build
- **Deployment options**:
  - **Option A (Recommended)**: Next.js standalone mode - backend serves both WebSocket and Next.js pages
  - **Option B**: Static export (`next export`) if no SSR needed - Express serves static files
- **WebSocket compatibility**: Full WebSocket support with no artificial timeouts
- **Environment variables**: Use fly.toml for configuration (GM password, environment detection)
- **Health check**: Add `/health` endpoint for Fly.io monitoring
- **Free tier**: 3 shared-cpu-1x VMs with 256MB RAM each, sufficient for multiple concurrent sessions

**Configuration**:
- Build command: `npm run build` (builds Next.js + backend TypeScript)
- Start command: `npm start` (runs backend server)
- Dockerfile: Simple Node.js 22 image
- fly.toml: Configure app name, region, port mapping, environment variables
- Auto-deploy: Via `flyctl deploy` or GitHub Actions

**Why Not Render.com**:
- **Spin-down issue**: Render.com free tier spins down after 15 minutes of inactivity
- **WebSocket termination**: All active WebSocket connections terminated during spin-down
- **Workaround complexity**: Would require HTTP keep-alive pings or paid tier
- **User experience**: Trivia games last 1-2 hours, spin-down would interrupt gameplay

**Alternatives Considered**:
- **Render.com**: Great platform but free tier spin-down kills WebSocket connections mid-game
- **Vercel + separate WebSocket server**: Complicates deployment, requires two services
- **Railway**: Good alternative but Fly.io has better documented WebSocket support and free tier
- **Separate frontend/backend deploys**: Unnecessary complexity, CORS issues

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 22 LTS |
| Language | TypeScript | 5.x |
| Backend Framework | Express.js | 4.x |
| WebSocket | Socket.IO | 4.x |
| Frontend Framework | Next.js (App Router) | 14.x |
| UI Components | shadcn/ui | Latest |
| CSS Framework | Tailwind CSS | 3.x |
| Testing (Unit) | Vitest | 1.x |
| Testing (E2E) | Playwright | 1.x |
| Join Code Gen | nanoid | 5.x |
| Hosting | Fly.io | Free tier |

---

## Best Practices Research

### Real-time WebSocket Patterns

**Pattern**: Event-driven architecture with typed events

```typescript
// Shared event types (used by both client and server)
interface ServerToClientEvents {
  'session:created': (data: { joinCode: string }) => void;
  'player:joined': (data: Player) => void;
  'buzzer:pressed': (data: { playerId: string; timestamp: number }) => void;
  'buzzer:first': (data: { playerId: string; playerName: string }) => void;
  'score:updated': (data: { playerId: string; newScore: number }) => void;
  'state:changed': (data: { newState: GameState }) => void;
}

interface ClientToServerEvents {
  'session:create': (callback: (joinCode: string) => void) => void;
  'session:join': (data: { joinCode: string; nickname: string; password: string }) => void;
  'buzzer:press': () => void;
  'score:assign': (data: { playerId: string; points: number }) => void;
  'state:transition': (data: { newState: GameState }) => void;
}
```

**Benefits**:
- Type safety across client-server boundary
- Self-documenting event contracts
- Prevents typos in event names

---

### Session Management Best Practices

1. **Immutable session IDs**: Join codes never change once created
2. **Player reconnection**: Match by (joinCode + nickname + password) triple
3. **Graceful degradation**: Handle disconnects without crashing server
4. **Memory limits**: Cap at 100 concurrent sessions (configurable)
5. **Activity tracking**: Update `lastActivity` on ANY event in session

---

### Security Considerations

1. **GM Password**: Store as environment variable, never expose to clients
2. **Input validation**: Sanitize nicknames (max length, no special chars)
3. **Rate limiting**: Prevent buzzer spam (debounce on client, validate on server)
4. **CORS**: Configure for production domain only
5. **Headers**: Security headers (helmet.js middleware)

---

### Mobile-First Design with Next.js + shadcn/ui

**Key Principles**:
1. **Tailwind Mobile-First Breakpoints**: Write base styles for mobile, use `sm:`, `md:`, `lg:` for larger screens
2. **Touch-Friendly Targets**: Minimum 44x44px tap targets for buttons (buzzer button especially)
3. **Responsive Typography**: Use Tailwind's responsive text utilities (`text-base sm:text-lg`)
4. **Viewport Meta Tag**: Already included in Next.js, ensures proper mobile scaling

**shadcn/ui Component Usage**:
- **Button**: Large variant for buzzer, default for GM controls
- **Card**: Container for player scores, game state
- **Dialog**: Confirmation modals (end game, skip question)
- **Toast**: Success/error feedback (joined session, buzzed in)
- **Badge**: Player status indicators (connected, disconnected)
- **Select**: Buzzer sound picker

**Mobile Optimizations**:
- **Prevent zoom on input focus**: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
- **Disable pull-to-refresh**: CSS `overscroll-behavior: none` on body
- **Fast tap**: Use `touchstart` for buzzer (no 300ms click delay)
- **Vibration feedback**: Use Vibration API on buzzer press for tactile feedback

**Layout Strategy**:
```tsx
// Player page - mobile-first
<div className="min-h-screen p-4 flex flex-col">
  {/* Score always visible */}
  <Card className="mb-4">
    <CardContent className="text-center">
      <h2 className="text-4xl font-bold">{score}</h2>
    </CardContent>
  </Card>

  {/* Buzzer takes center stage on mobile */}
  <div className="flex-1 flex items-center justify-center">
    <Button
      size="lg"
      className="h-48 w-48 rounded-full text-2xl"
      disabled={gameState !== 'active'}
    >
      BUZZ!
    </Button>
  </div>
</div>
```

---

## Performance Optimization

### Latency Targets

- **Buzzer press → sound**: <100ms (client-side audio, no server round-trip)
- **Buzzer press → server confirmation**: <200ms (network + processing)
- **State update → all clients**: <1000ms (as per spec)

### Optimization Strategies

1. **WebSocket compression**: Enable Socket.IO compression for large payloads
2. **Asset preloading**: Preload audio on page load
3. **Minimal payload**: Only send changed data, not entire state
4. **Connection pooling**: Reuse connections on reconnect

---

## Deployment Checklist

- [ ] Environment variables configured (GM_PASSWORD, NODE_ENV)
- [ ] Build script compiles both frontend and backend
- [ ] Static file serving configured in Express
- [ ] WebSocket CORS configured for production domain
- [ ] Health check endpoint (`/health`) implemented
- [ ] Session cleanup interval running
- [ ] Error logging configured (console.error for now, can add Sentry later)
- [ ] Create Dockerfile with Node.js 22 base image
- [ ] Create fly.toml configuration file (app name, region, internal port)
- [ ] Install flyctl CLI and authenticate
- [ ] Deploy command: `flyctl deploy`
- [ ] Set secrets: `flyctl secrets set GM_PASSWORD=<password>`

---

## Open Questions for Implementation Phase

1. **Audio files**: Where to source the 5-10 buzzer sounds? (Freesound.org, free game asset sites, or use built-in browser beeps)
2. **shadcn/ui theme**: Use default theme or customize colors? (Default is professional, can customize later)
3. **Next.js rendering**: Use SSR or static export? (Static export simpler for Render.com, SSR if need real-time SEO)
4. **Error boundaries**: React Error Boundary component or Next.js error.tsx? (Use Next.js error.tsx for App Router)
5. **Font loading**: Use next/font for optimized font loading? (Yes, significantly improves performance)

---

**Research Complete**: All NEEDS CLARIFICATION items resolved. Ready to proceed to Phase 1 (Design & Contracts).
