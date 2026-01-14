# trivia-simple-app Development Guidelines

Comprehensive documentation for the Trivia Buzzer application. Last updated: 2026-01-14

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Features Implemented](#features-implemented)
5. [WebSocket Event System](#websocket-event-system)
6. [State Management](#state-management)
7. [Security & Authentication](#security--authentication)
8. [Development Guide](#development-guide)
9. [Deployment](#deployment)

---

## Technology Stack

**Runtime & Language**:
- Node.js 22 LTS (active support until April 2027)
- TypeScript 5.x with strict mode

**Backend**:
- Express.js 4.x (HTTP server)
- Socket.IO 4.x (WebSocket/real-time bidirectional communication)
- bcryptjs 3.x (password hashing with 10 salt rounds)
- nanoid 5.x (6-character join code generation)
- helmet (security headers)
- cors (Cross-Origin Resource Sharing)
- In-memory storage (Map/Object structures, no database)

**Frontend**:
- Next.js 14.x (App Router, React Server Components)
- React 18.x
- Socket.IO Client 4.x
- shadcn/ui (component library built on Radix UI)
- Tailwind CSS 3.x (utility-first CSS, mobile-first design)
- Lucide React (icon library)
- canvas-confetti 1.x (celebration animations)

**Testing**:
- Vitest 1.x (unit/integration tests)
- Playwright 1.x (E2E tests)

**Deployment**:
- Fly.io (container-based platform)
- Docker multi-stage builds
- Separate frontend and backend deployments

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   GM Page    │  │ Player Page  │  │  Home Page   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         └──────────┬───────┘                                │
│                    │                                        │
│            ┌───────▼────────┐                              │
│            │  Socket.IO     │                              │
│            │  Client Hook   │                              │
│            └───────┬────────┘                              │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ WebSocket (Socket.IO)
                     │ Events: typed interfaces
                     │
┌────────────────────▼───────────────────────────────────────┐
│                    Backend (Express + Socket.IO)           │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Socket.IO Server                       │   │
│  │  ┌──────────────────┐  ┌──────────────────┐       │   │
│  │  │  GM Handlers     │  │ Player Handlers  │       │   │
│  │  │  - Sessions      │  │ - Join/Rejoin    │       │   │
│  │  │  - Questions     │  │ - Buzzer Press   │       │   │
│  │  │  - Scoring       │  │ - Disconnect     │       │   │
│  │  └────────┬─────────┘  └────────┬─────────┘       │   │
│  └───────────┼─────────────────────┼──────────────────┘   │
│              │                     │                       │
│      ┌───────▼─────────────────────▼──────┐               │
│      │      Session Manager                │               │
│      │  (In-Memory Map Storage)            │               │
│      │  - Active sessions                  │               │
│      │  - Player data                      │               │
│      │  - Game state                       │               │
│      └─────────────────────────────────────┘               │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │            Utility Services                         │   │
│  │  - Password hashing (bcryptjs)                     │   │
│  │  - Join code generation (nanoid)                   │   │
│  │  - Leaderboard calculation                         │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Real-time Communication**: Socket.IO for bidirectional events
2. **Stateless Frontend**: All game state stored on backend
3. **In-Memory Storage**: Fast access, suitable for temporary game sessions
4. **Password Security**: Bcrypt hashing for GM and player passwords
5. **Mobile-First**: Touch-friendly UI with 44px minimum tap targets
6. **Reconnection Support**: Automatic reconnection with session restoration

---

## Project Structure

```text
trivia-simple-app/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Express + Socket.IO server entry
│   │   ├── session-manager.ts           # In-memory session storage & CRUD
│   │   ├── types/
│   │   │   └── websocket-events.ts      # Typed Socket.IO events & interfaces
│   │   ├── models/
│   │   │   ├── session.ts               # GameSession interface & factory
│   │   │   ├── player.ts                # Player interface & factory
│   │   │   └── question.ts              # Question interface & factory
│   │   ├── event-handlers/
│   │   │   ├── gm-handlers.ts           # GM WebSocket event handlers
│   │   │   └── player-handlers.ts       # Player WebSocket event handlers
│   │   ├── services/
│   │   │   └── leaderboard-service.ts   # Leaderboard calculation (1224 ranking)
│   │   └── utils/
│   │       ├── join-code.ts             # 6-char nanoid generation
│   │       └── password-utils.ts        # bcrypt hash/compare functions
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── Dockerfile                       # Multi-stage Docker build
│   ├── fly.toml                         # Fly.io backend config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout with font config
│   │   ├── page.tsx                     # Landing page (GM/Player choice)
│   │   ├── gamemaster/
│   │   │   └── page.tsx                 # GM interface (session control)
│   │   ├── player/
│   │   │   └── page.tsx                 # Player interface (buzzer)
│   │   └── globals.css                  # Tailwind + shadcn imports
│   ├── components/
│   │   ├── ui/                          # shadcn/ui base components
│   │   ├── buzzer-button.tsx            # Interactive buzzer component
│   │   ├── buzzer-sound-selector.tsx    # Sound preference dropdown
│   │   ├── game-state-indicator.tsx     # Visual state display
│   │   ├── session-card.tsx             # Session metadata card
│   │   ├── session-selector.tsx         # Session reconnection list
│   │   └── leaderboard.tsx              # Final rankings display
│   ├── lib/
│   │   ├── socket.ts                    # Socket.IO client singleton
│   │   ├── websocket-events.ts          # Typed events (mirrors backend)
│   │   └── utils.ts                     # Helper functions
│   ├── hooks/
│   │   ├── use-socket.ts                # Socket connection hook
│   │   └── use-local-storage.ts         # Credential persistence hook
│   ├── public/
│   │   └── sounds/                      # Buzzer audio files (.mp3)
│   ├── Dockerfile                       # Multi-stage Docker build
│   ├── fly.toml                         # Fly.io frontend config
│   ├── next.config.js                   # Next.js configuration
│   ├── tailwind.config.ts               # Tailwind + shadcn theming
│   ├── package.json
│   └── tsconfig.json
│
├── specs/                               # Feature specifications
│   ├── 001-trivia-buzzer-app/
│   ├── 002-gm-session-reconnect/
│   └── 003-game-end-leaderboard/
├── .env                                 # Environment variables (git-ignored)
├── package.json                         # Root workspace config
└── CLAUDE.md                            # This file
```

---

## Features Implemented

### Feature 001: Trivia Buzzer App (Core)
**Status**: ✅ Complete

**Functionality**:
- GM creates game session with password protection
- Players join using 6-character join code and nickname
- Real-time buzzer system with audio feedback
- Score tracking and assignment
- Question flow management (WAITING → ACTIVE → SCORING)

**Key Components**:
- Join code generation (nanoid)
- Session lifecycle management
- Buzzer press timestamps and ordering
- Player connection status tracking

### Feature 002: GM Session Reconnection
**Status**: ✅ Complete

**Functionality**:
- GM password hashing with bcryptjs (10 salt rounds)
- Session query by GM password
- Automatic reconnection to existing sessions
- Session metadata display (player count, state, last activity)
- localStorage-based auto-login

**Key Components**:
- `password-utils.ts`: Hash and compare functions
- `handleGetActiveSessions`: Query sessions by password hash
- `handleReconnectToSession`: Restore GM connection
- `SessionSelector`: UI for choosing existing sessions
- Auto-login flow on page refresh

**Security**:
- Passwords never stored in plaintext
- bcrypt with 10 salt rounds (2^10 = 1024 iterations)
- Timing-safe password comparison

### Feature 003: Game End & Leaderboard
**Status**: ✅ Complete

**Functionality**:
- End game and transition to ENDED state
- Final rankings with Standard Competition Ranking (1224)
- Celebratory confetti animation (canvas-confetti)
- Interim leaderboard (top 3) during gameplay for players
- Tie detection and indication

**Key Components**:
- `leaderboard-service.ts`: Ranking algorithm
- `Leaderboard`: Display component with podium medals
- `gm:endGame` event: Calculates and broadcasts leaderboard
- Visual flow indicator in Question Controls

**Ranking Algorithm**:
```
Standard Competition Ranking (1224):
- Players with same score share the same rank
- Next rank skips appropriately (e.g., two 1st → next is 3rd)
- Alphabetical sorting within tied groups
```

---

## WebSocket Event System

### Event Categories

**GM Events** (Game Master Control):
```typescript
gm:createSession        // Create new game session
gm:reconnectToSession   // Reconnect to existing session
gm:getActiveSessions    // Query sessions by password
gm:startQuestion        // Begin new question (WAITING → ACTIVE)
gm:moveToScoring        // Transition to scoring (ACTIVE → SCORING)
gm:skipQuestion         // Skip current question
gm:assignPoints         // Award points to player
gm:endQuestion          // Complete question (SCORING → WAITING)
gm:endGame              // End game and show leaderboard
gm:endSession           // Close session completely
```

**Player Events**:
```typescript
player:join             // Join session with join code
player:rejoin           // Reconnect existing player
player:pressBuzzer      // Press buzzer during ACTIVE state
player:changeBuzzerSound // Update sound preference
```

**Broadcast Events** (Server → All Clients):
```typescript
session:created         // New session created
session:ended           // Session closed
session:gmReconnected   // GM reconnected (optional notification)

game:stateChanged       // Game state transition
game:questionStarted    // New question began
game:scoringStarted     // Moved to scoring phase
game:questionSkipped    // Question skipped
game:questionEnded      // Question completed
game:ended              // Game ended (with leaderboard)

player:joined           // Player joined session
player:disconnected     // Player lost connection
player:reconnected      // Player reconnected
player:scoreUpdated     // Player's score changed
player:buzzerSoundChanged // Player changed sound

buzzer:pressed          // Buzzer pressed (with isFirst flag)
```

### Event Flow Examples

**Game Question Cycle**:
```
GM: gm:startQuestion
  → Server: game:questionStarted (broadcast)
  → Server: game:stateChanged (ACTIVE)

Player: player:pressBuzzer
  → Server: buzzer:pressed (broadcast with timestamp)

GM: gm:moveToScoring
  → Server: game:scoringStarted (broadcast)
  → Server: game:stateChanged (SCORING)

GM: gm:assignPoints
  → Server: player:scoreUpdated (broadcast)

GM: gm:endQuestion
  → Server: game:questionEnded (broadcast)
  → Server: game:stateChanged (WAITING)
```

**GM Reconnection**:
```
GM: gm:getActiveSessions (with password)
  ← Server: callback with sessions array

GM: gm:reconnectToSession (with joinCode + password)
  ← Server: callback with full session data
  → Server: session:gmReconnected (broadcast, optional)
```

---

## State Management

### Game State Machine

```
WAITING ──(gm:startQuestion)──> ACTIVE ──(gm:moveToScoring)──> SCORING
   ▲                               │                               │
   │                               │                               │
   └──────────────────────────────┴───────(gm:skipQuestion)───────┘
   │                                                               │
   └─────────────────────────────(gm:endQuestion)─────────────────┘

WAITING/ACTIVE/SCORING ──(gm:endGame)──> ENDED
```

**State Descriptions**:
- `WAITING`: No active question, GM can start next question
- `ACTIVE`: Question in progress, players can buzz
- `SCORING`: Buzzer closed, GM assigns points
- `ENDED`: Game finished, leaderboard displayed

**State Validations**:
- Buzzer only enabled in ACTIVE state
- Scoring only from ACTIVE state
- Questions only start from WAITING state
- Cannot transition from ENDED state

### Session Storage

**In-Memory Map Structure**:
```typescript
Map<joinCode, GameSession> {
  joinCode: string;              // 6-char unique identifier
  players: Map<playerId, Player>; // Connected players
  gameState: GameState;          // Current state
  currentQuestion: Question | null;
  lastQuestionNumber: number;    // Track question count
  gmPasswordHash: string;        // Bcrypt hash for ownership
  isActive: boolean;             // Session open/closed
  createdAt: number;             // Timestamp
  lastActivity: number;          // Last interaction timestamp
  leaderboard: LeaderboardData | null; // Final rankings
}
```

### Client-Side State

**GM Page State**:
- Connection status
- Session data (players, state, join code)
- Buzzer presses for current question
- Custom points input per player
- Loading states for async actions
- Error messages
- Leaderboard data (when game ends)

**Player Page State**:
- Connection status
- Player credentials (join code, player ID, password)
- Current player data (score, buzz status)
- All players list (for leaderboard)
- Game state and question number
- Has buzzed (current question)
- Is first buzzer (current question)

---

## Security & Authentication

### Password Security

**GM Password**:
- Environment variable `GM_PASSWORD` (plaintext on server only)
- Hashed with bcryptjs (10 salt rounds) before storing in session
- Hash stored in session for ownership verification
- Timing-safe comparison for reconnection

**Player Password**:
- User-chosen during join
- Hashed with bcryptjs (10 salt rounds) before storing
- Used for reconnection after disconnect
- Never transmitted in plaintext after initial join

**Implementation**:
```typescript
// backend/src/utils/password-utils.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10; // 2^10 = 1024 iterations

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### CORS Configuration

**Production**:
- Backend: `FRONTEND_URL` environment variable
- Frontend: `NEXT_PUBLIC_WS_URL` build argument

**Development**:
- Allows `localhost:3000` and `localhost:3001`
- Credentials enabled for cookie-based authentication (if needed)

### Security Headers (Helmet)

Applied via Express middleware:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HTTPS only)

---

## Development Guide

### Setup

```bash
# Clone repository
git clone <repository-url>
cd trivia-simple-app

# Install dependencies (root + workspaces)
npm install

# Create .env file
echo "GM_PASSWORD=your-secret-password" > .env

# Start development servers (frontend + backend)
npm run dev
```

### Development Workflow

**Backend Development**:
```bash
cd backend
npm run dev          # tsx watch mode (hot reload)
npm run type-check   # TypeScript validation
npm run build        # Compile to dist/
npm run lint         # ESLint
npm test            # Vitest unit tests
```

**Frontend Development**:
```bash
cd frontend
npm run dev          # Next.js dev server (hot reload)
npm run type-check   # TypeScript validation
npm run build        # Production build
npm run lint         # ESLint
```

### Testing

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
```

### Code Style Guidelines

**TypeScript**:
- Strict mode enabled (`tsconfig.json`)
- Explicit return types for functions
- Interfaces for object shapes (not types)
- Enums for fixed value sets (GameState, BuzzerSound, ErrorCode)

**React/Next.js**:
- Server Components by default
- Client Components (`'use client'`) only when needed
- App Router (not Pages Router)
- Mobile-first responsive design

**Tailwind CSS**:
- Mobile-first breakpoints (`sm:`, `md:`, `lg:`)
- Minimum 44x44px tap targets for touch
- Use shadcn/ui component variants

**Error Handling**:
- ErrorCode enum for all errors
- ERROR_MESSAGES map for human-readable text
- Server-side validation before processing
- Client-side error boundaries (error.tsx)

---

## Deployment

### Fly.io Deployment (Current)

**Prerequisites**:
- Fly.io account and CLI installed
- Docker installed locally

**Backend Deployment**:
```bash
cd backend

# Set environment secrets
flyctl secrets set GM_PASSWORD="your-password"
flyctl secrets set FRONTEND_URL="https://trivia-buzzer-frontend.fly.dev"
flyctl secrets set NODE_ENV="production"

# Deploy (builds automatically inside Docker)
flyctl deploy

# View logs
flyctl logs
```

**Frontend Deployment**:
```bash
cd frontend

# Deploy with WebSocket URL build arg
flyctl deploy

# Verify deployment
flyctl status
```

**Configuration Files**:
- `backend/fly.toml`: Backend app config (port 3001)
- `frontend/fly.toml`: Frontend app config (port 3000, WS URL build arg)
- `backend/Dockerfile`: Multi-stage build (builder + runner)
- `frontend/Dockerfile`: Multi-stage build with Next.js

**Important Notes**:
- Backend Dockerfile compiles TypeScript inside Docker (no pre-build needed)
- Frontend WS URL baked into build at Docker build time
- Secrets managed via `flyctl secrets set`
- Auto-scaling disabled (`auto_stop_machines = 'off'`)

### Cloud VM Deployment (AWS EC2, BytePlus ECS)

See [VM-DEPLOYMENT.md](./docs/VM-DEPLOYMENT.md) for comprehensive guide.

**Can both be deployed on same machine?**
Yes! The guide covers:
- Single-machine deployment with Nginx reverse proxy
- Backend on `localhost:3001`
- Frontend on `localhost:3000`
- Nginx routing based on domain/path
- SSL/TLS with Let's Encrypt
- Process management with PM2
- Automatic startup configuration

---

## Recent Changes

### 2026-01-14
- **Feature 003: Game End & Leaderboard** - Complete
  - Added ENDED game state
  - Leaderboard with Standard Competition Ranking (1224)
  - Confetti celebration animation
  - Interim top-3 leaderboard for players
  - Visual flow indicator in Question Controls

- **Deployment Fixes**:
  - Updated backend Dockerfile to build TypeScript inside Docker
  - Fixed bcryptjs import issues in production
  - Added comprehensive deployment documentation

### 2026-01-12
- **Feature 002: GM Session Reconnection** - Complete
  - GM password hashing with bcryptjs
  - Session query and reconnection
  - Auto-login with localStorage
  - Session selector UI

### 2026-01-11
- **Feature 001: Trivia Buzzer App** - Complete
  - Initial MVP implementation
  - Real-time buzzer system
  - Score tracking
  - Question flow management

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
