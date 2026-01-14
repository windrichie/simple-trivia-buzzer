# Trivia Buzzer App

Real-time trivia buzzer application for casual game nights with friends (3-5 players).

## 🚀 Quick Start

### Prerequisites
- Node.js 22 LTS or higher
- npm 10 or higher

### Installation

```bash
# Install all dependencies
npm install
```

### Development

```bash
# Start both backend and frontend in development mode
npm run dev
```

This starts:
- **Backend**: `http://localhost:3001` (Express + Socket.IO server)
- **Frontend**: `http://localhost:3000` (Next.js dev server)

### Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```env
# Backend
GM_PASSWORD=changeme123
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000  # For CORS (use production URL in prod)

# Frontend
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## 📱 Usage

### Game Master

1. Open `http://localhost:3000`
2. Click "Create Game Session"
3. Enter the game master password (default: `changeme123`)
4. Share the join code with players

### Players

1. Open `http://localhost:3000` on your device
2. Click "Join Game"
3. Enter the join code from the game master
4. Enter your nickname and set a password (for reconnection)
5. Click "Join Game"

## ✨ Features

### Core Gameplay (Feature 001 - Completed)
- ✅ **Session Management**: Game Master creates sessions with shareable 6-character join codes
- ✅ **Player Join**: 3-5 players can join with unique nicknames
- ✅ **Buzzer Mechanics**: First-press detection with visual/audio feedback
- ✅ **Sound System**: Multiple buzzer sounds (Classic, Doorbell, Ding, Gong, Honk) with audio preloading
- ✅ **Question Flow**: Structured game states (Waiting → Active → Scoring)
- ✅ **Score Tracking**: Real-time score updates with quick point assignment buttons
- ✅ **Mobile-First Design**: Optimized for touch with 44px+ tap targets
- ✅ **Real-time Sync**: WebSocket-based instant updates for all clients

### Reconnection & Sessions (Feature 002 - Completed)
- ✅ **Player Reconnection**: Resume with password authentication (bcrypt hashed)
- ✅ **Game Master Reconnection**: Return to active sessions
- ✅ **Auto-fill Credentials**: localStorage remembers last session
- ✅ **Session Selector**: View and rejoin available sessions
- ✅ **Connection Status**: Visual indicators for online/offline players

### Game End & Leaderboard (Feature 003 - Completed)
- ✅ **Final Rankings**: Standard Competition Ranking (1224) with tie detection
- ✅ **Confetti Celebration**: GPU-accelerated animation on game end
- ✅ **Interim Leaderboard**: Top 3 players displayed during gameplay
- ✅ **Podium Display**: Medal emojis (🥇🥈🥉) for top performers
- ✅ **Score Summary**: Complete player standings with rank and points

## 🏗️ Tech Stack

- **Backend**: Node.js 22 LTS, TypeScript 5.x, Express.js 4.x, Socket.IO 4.x
- **Frontend**: Next.js 14, React 18, shadcn/ui, Tailwind CSS 3.x
- **Storage**: In-memory (Map structures, no database)
- **Security**: bcryptjs for password hashing
- **Animations**: canvas-confetti for celebrations
- **Deployment**: Fly.io (production) or Cloud VM

## 📁 Project Structure

```
trivia-buzzer-app/
├── backend/                    # Express + Socket.IO server
│   ├── src/
│   │   ├── server.ts          # Main server with WebSocket
│   │   ├── session-manager.ts # In-memory session storage
│   │   ├── event-handlers/    # WebSocket event handlers
│   │   ├── services/          # Business logic (leaderboard, etc.)
│   │   └── utils/             # Helpers (password, join codes)
│   └── Dockerfile             # Backend container
├── frontend/                   # Next.js 14 application
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── lib/                   # WebSocket client & utilities
│   ├── public/sounds/         # Buzzer audio files
│   └── Dockerfile             # Frontend container
├── docs/                       # Deployment guides
│   ├── FLY-IO-DEPLOYMENT.md
│   └── VM-DEPLOYMENT.md
├── specs/                      # Feature specifications
│   ├── 001-trivia-buzzer-app/
│   ├── 002-gm-session-reconnect/
│   └── 003-game-end-leaderboard/
├── CLAUDE.md                   # Architecture documentation
├── DEPLOYMENT.md               # Deployment entry point
└── package.json                # Root workspace
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Build for Production

```bash
# Build both backend and frontend
npm run build

# Start production server
npm start
```

## 🚀 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment guides:

- **Fly.io** - Deploy frontend and backend separately (recommended for most users)
- **Cloud VM** - Deploy both apps on same Ubuntu VM with Nginx reverse proxy

Both deployment options are production-ready with:
- HTTPS/TLS encryption
- WebSocket support
- Health checks
- Process management

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete architecture & development guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guides (Fly.io, Cloud VM)
- **[SOUND_SYSTEM.md](./SOUND_SYSTEM.md)** - Buzzer audio system documentation

### Feature Specifications

- **[Feature 001](./specs/001-trivia-buzzer-app/)** - Core buzzer gameplay (spec, plan, tasks, contracts)
- **[Feature 002](./specs/002-gm-session-reconnect/)** - Player & GM reconnection
- **[Feature 003](./specs/003-game-end-leaderboard/)** - Game end & leaderboard

## 📝 License

MIT
