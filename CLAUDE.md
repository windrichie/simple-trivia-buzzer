# trivia-simple-app Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-12

## Active Technologies

**Runtime & Language**:
- Node.js 22 LTS (active support until April 2027)
- TypeScript 5.x

**Backend**:
- Express.js 4.x (HTTP server)
- Socket.IO 4.x (WebSocket/real-time communication)
- In-memory storage (Map/Object structures, no database)

**Frontend**:
- Next.js 14.x (App Router)
- React 18.x
- shadcn/ui (component library)
- Tailwind CSS 3.x (utility-first CSS, mobile-first)
- Socket.IO Client 4.x

**Testing**:
- Vitest 1.x (unit/integration tests)
- Playwright 1.x (E2E tests)

**Utilities**:
- nanoid 5.x (join code generation)

## Project Structure

```text
trivia-buzzer-app/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express + Socket.IO server
│   │   ├── session-manager.ts     # In-memory session storage
│   │   ├── event-handlers/        # WebSocket event handlers
│   │   └── utils/                 # Helpers (join code gen, validation)
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── frontend/                       # Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── gamemaster/page.tsx    # GM interface
│   │   ├── player/page.tsx        # Player interface
│   │   └── globals.css            # Tailwind + shadcn
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   └── buzzer-button.tsx      # Custom components
│   ├── lib/
│   │   ├── socket.ts              # Socket.IO client
│   │   └── utils.ts
│   ├── hooks/
│   │   └── use-socket.ts
│   ├── public/sounds/             # Buzzer audio files
│   ├── next.config.js
│   └── tailwind.config.ts
│
└── specs/001-trivia-buzzer-app/   # Feature documentation
```

## Commands

```bash
# Development
npm run dev          # Start dev servers (frontend + backend)
npm run build        # Build for production
npm start            # Run production build

# Testing
npm test             # Run all tests
npm run test:watch   # Tests in watch mode
npm run test:e2e     # E2E tests (Playwright)

# Linting & Type-checking
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Code Style

**TypeScript**:
- Strict mode enabled
- Prefer interfaces over types for object shapes
- Use enums for fixed sets of values (GameState, BuzzerSound)
- Explicit return types for functions

**Next.js / React**:
- Use App Router (not Pages Router)
- Server Components by default, Client Components when needed (`'use client'`)
- Mobile-first responsive design with Tailwind breakpoints
- shadcn/ui components for consistent UI

**Tailwind CSS**:
- Mobile-first: Write base styles for mobile, use `sm:`, `md:`, `lg:` for larger screens
- Minimum 44x44px tap targets for buttons (especially buzzer)
- Use shadcn/ui component variants (e.g., `<Button size="lg">`)

**WebSocket Events**:
- All events typed via `ClientToServerEvents` and `ServerToClientEvents`
- Use callback pattern for synchronous responses
- Emit dedicated events for async broadcasts

**State Management**:
- Server is single source of truth (in-memory Map storage)
- React hooks for client state (useState, useSocket custom hook)
- Never store game state in client localStorage (except credentials for convenience)

**Error Handling**:
- Use ErrorCode enum for all errors
- Provide human-readable messages via ERROR_MESSAGES map
- Validate all inputs server-side before processing
- Use Next.js error.tsx for error boundaries

## Recent Changes

- 001-trivia-buzzer-app: Added

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
