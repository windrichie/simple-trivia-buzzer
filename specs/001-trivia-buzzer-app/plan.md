# Implementation Plan: Trivia Buzzer App

**Branch**: `001-trivia-buzzer-app` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-trivia-buzzer-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A real-time trivia buzzer application for casual trivia nights with friends (3-5 players). The system enables competitive gameplay with a buzzer mechanic that identifies who pressed first, real-time score tracking, and game flow management. Key requirements include: Game Master creates sessions with shareable join codes, players join and buzz in during questions, automatic first-press detection with <100ms sound playback, real-time score synchronization across all devices, and player reconnection support.

**Technical Approach**: Web-based application using WebSocket for real-time communication, hosted on Render.com free tier with server-side in-memory session storage. Centralized architecture where server is the single source of truth, broadcasting state changes to all connected clients.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 22 LTS (active support until April 2027)
**Primary Dependencies**:
- Backend: Express.js 4.x + Socket.IO 4.x (WebSocket), nanoid 5.x (join codes)
- Frontend: Next.js 14.x (App Router) + shadcn/ui + Tailwind CSS 3.x + Socket.IO Client 4.x
**Storage**: In-memory only (no database) - sessions stored in server RAM with Map/Object structures
**Testing**: Vitest 1.x (unit/integration) + Playwright 1.x (E2E)
**Target Platform**: Web browsers (mobile-first: iOS Safari 14+, Chrome 90+, Firefox 88+, Edge 90+); Fly.io free tier for hosting
**Project Type**: Web application (Next.js frontend + Express backend with WebSocket server)
**Performance Goals**:
- Buzzer sound playback within 100ms of button press
- Real-time state synchronization within 1 second across all clients
- Support 3-5 concurrent players per session
- Handle multiple concurrent sessions (different trivia groups)
- Mobile-first responsive design (players and GM primarily on mobile devices)
**Constraints**:
- Must operate within Fly.io free tier (3 shared-cpu-1x VMs with 256MB RAM each)
- No paid services or databases
- < 1 second latency for all real-time interactions
- Sound asset library limited to 5-10 files to minimize bundle size
**Scale/Scope**:
- Small-scale casual use (3-5 players per session)
- Multiple concurrent sessions supported but no specific target (likely <100 concurrent sessions realistically)
- Simple 2-page UI (Game Master view + Player view)
- ~10-15 core API operations (create session, join, buzz, score, state transitions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No constitution file found (template only). Proceeding without constitutional constraints.

**Note**: The `.specify/memory/constitution.md` file contains only a template structure with no actual project principles defined. This is expected for a new project. Constitution can be established later via `/speckit.constitution` if needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
trivia-buzzer-app/
│
├── backend/                      # Node.js + Express + Socket.IO server
│   ├── src/
│   │   ├── server.ts             # Main entry point, Express + Socket.IO setup
│   │   ├── session-manager.ts   # In-memory session storage (Map-based)
│   │   ├── event-handlers/      # WebSocket event handlers
│   │   │   ├── gm-handlers.ts   # Game Master events (create, start, score, end)
│   │   │   └── player-handlers.ts # Player events (join, buzz, rejoin)
│   │   ├── models/              # TypeScript interfaces/types
│   │   │   ├── session.ts       # GameSession interface
│   │   │   ├── player.ts        # Player interface
│   │   │   └── question.ts      # Question interface
│   │   └── utils/               # Helper functions
│   │       ├── join-code.ts     # nanoid-based code generation
│   │       ├── validation.ts    # Input validation functions
│   │       └── cleanup.ts       # Session cleanup logic
│   │
│   ├── tests/
│   │   ├── unit/                # Unit tests (Vitest)
│   │   │   ├── session-manager.test.ts
│   │   │   ├── join-code.test.ts
│   │   │   └── validation.test.ts
│   │   └── integration/         # Integration tests (Vitest + Socket.IO)
│   │       ├── gm-flow.test.ts  # GM session lifecycle
│   │       ├── player-flow.test.ts # Player join/reconnect
│   │       └── buzzer.test.ts   # Buzzer race conditions
│   │
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                     # Next.js 14 (App Router) + shadcn/ui
│   ├── app/
│   │   ├── layout.tsx           # Root layout (font, providers)
│   │   ├── page.tsx             # Home page (join/create options)
│   │   ├── gamemaster/
│   │   │   └── page.tsx         # Game Master interface
│   │   ├── player/
│   │   │   └── page.tsx         # Player interface
│   │   ├── globals.css          # Tailwind CSS + shadcn theme
│   │   └── providers.tsx        # Socket.IO provider, Toast provider
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── badge.tsx
│   │   │   └── select.tsx
│   │   ├── buzzer-button.tsx    # Custom buzzer component
│   │   ├── player-list.tsx      # Player scores display
│   │   └── game-state-indicator.tsx
│   │
│   ├── lib/
│   │   ├── socket.ts            # Socket.IO client setup
│   │   ├── audio.ts             # HTML5 Audio preloading
│   │   ├── utils.ts             # General utilities
│   │   └── cn.ts                # Tailwind class merger (shadcn)
│   │
│   ├── hooks/
│   │   ├── use-socket.ts        # Socket.IO React hook
│   │   ├── use-audio.ts         # Audio playback hook
│   │   └── use-local-storage.ts # Credentials persistence (P3)
│   │
│   ├── public/
│   │   ├── sounds/              # Buzzer audio assets
│   │   │   ├── buzzer-classic.mp3
│   │   │   ├── buzzer-horn.mp3
│   │   │   └── ... (10 sounds total)
│   │   └── favicon.ico
│   │
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── components.json          # shadcn/ui config
│   ├── tsconfig.json
│   └── package.json
│
├── specs/001-trivia-buzzer-app/ # Feature documentation (already exists)
│   ├── spec.md
│   ├── plan.md                  # This file
│   ├── research.md
│   ├── data-model.md
│   ├── quickstart.md
│   └── contracts/
│       ├── websocket-events.ts  # Shared TypeScript contract
│       └── README.md
│
├── tests/                       # E2E tests (Playwright)
│   └── e2e/
│       ├── gm-create-session.spec.ts
│       ├── player-join.spec.ts
│       ├── buzzer-race.spec.ts
│       └── reconnection.spec.ts
│
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json                 # Root package.json (workspaces)
├── tsconfig.json                # Root TypeScript config
└── README.md                    # Project readme
```

**Structure Decision**: Web application structure with separate backend and frontend directories.

**Rationale**:
- **Separation of concerns**: Backend (Express + Socket.IO server) and frontend (Next.js app) have distinct responsibilities
- **Independent builds**: Next.js builds frontend, tsc compiles backend separately
- **Shared contracts**: `specs/001-trivia-buzzer-app/contracts/` contains TypeScript types used by both
- **Monorepo via npm workspaces**: Simplified dependency management while keeping code organized
- **Testing isolation**: Backend unit/integration tests separate from E2E browser tests
- **Mobile-first**: Next.js + Tailwind CSS with shadcn/ui provides responsive design out-of-the-box

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No complexity violations**: No constitution constraints defined. All architectural decisions follow standard web application patterns appropriate for the project scope.

---

## Phase 0: Research Summary

**Completed**: All NEEDS CLARIFICATION items from Technical Context resolved.

**Key Decisions**:
1. **TypeScript + Node.js 22 LTS**: Type safety for complex real-time state, active support until 2027
2. **Socket.IO v4**: Automatic reconnection, room support, fallback mechanisms
3. **Express.js v4**: Minimal HTTP server + Next.js integration
4. **Next.js 14 + shadcn/ui**: Beautiful, responsive UI components for mobile-first design
5. **Tailwind CSS**: Utility-first CSS, mobile-first breakpoints, rapid development
6. **Vitest + Playwright**: Modern testing stack
7. **nanoid**: Secure, customizable join code generation
8. **In-memory Map storage**: O(1) lookups, TTL-based cleanup

See [`research.md`](./research.md) for detailed rationale and alternatives considered.

---

## Phase 1: Design Summary

### Data Model

**Core Entities**:
- **GameSession**: Join code, players map, game state, timestamps
- **Player**: ID, nickname, password, score, buzzer sound, connection status
- **Question**: Question number, state, buzzer presses, first buzzer ID
- **BuzzerEvent**: Player ID, timestamp, isFirst flag

**State Machines**:
- Session lifecycle: Created → Active → Ended
- Question flow: WAITING → ACTIVE ⇄ SCORING → WAITING

See [`data-model.md`](./data-model.md) for full entity definitions and validation rules.

### Contracts

**WebSocket Events**: 13 client → server events, 14 server → client events

**Key Patterns**:
- Callback pattern for synchronous responses
- Event-based broadcasts for async updates
- Typed contracts via Socket.IO TypeScript support
- Standardized error codes and messages

See [`contracts/websocket-events.ts`](./contracts/websocket-events.ts) and [`contracts/README.md`](./contracts/README.md) for full API specification.

### Quickstart

Development setup: `npm install` → create `.env` → `npm run dev`

See [`quickstart.md`](./quickstart.md) for complete setup instructions and troubleshooting.

---

## Post-Design Constitution Re-evaluation

**Status**: No constitution violations. Proceeding to Phase 2 (Task Generation).

**Architecture Alignment**:
- Simple, focused design (no over-engineering)
- Standard web application patterns
- Clear separation of concerns (backend/frontend)
- Appropriate technology choices for scope

---

## Next Steps

Run `/speckit.tasks` to generate the implementation task breakdown (`tasks.md`).
