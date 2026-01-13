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
GM_PASSWORD=changeme123
PORT=3001
NODE_ENV=development
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

## ✅ MVP Features (Completed)

- ✅ Game Master can create sessions with shareable join codes
- ✅ Players can join sessions (3-5 players max)
- ✅ Real-time synchronization via WebSocket
- ✅ Player list display with connection status
- ✅ Session management (create/end)
- ✅ Mobile-first responsive design

## 🚧 Coming Soon

- Buzzer mechanics with sound playback
- Question flow management (waiting/active/scoring states)
- Score tracking and display
- Player reconnection after disconnect
- Auto-fill credentials with localStorage
- Production deployment to Fly.io

## 🏗️ Tech Stack

- **Backend**: Node.js 22, TypeScript, Express.js, Socket.IO
- **Frontend**: Next.js 14, React 18, shadcn/ui, Tailwind CSS
- **Storage**: In-memory (no database)
- **Hosting**: Fly.io (planned)

## 📁 Project Structure

```
trivia-buzzer-app/
├── backend/          # Express + Socket.IO server
├── frontend/         # Next.js application
├── specs/            # Feature specifications and documentation
└── package.json      # Root workspace configuration
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

## 📖 Documentation

See `specs/001-trivia-buzzer-app/` for detailed documentation:
- `spec.md` - Feature specification
- `plan.md` - Implementation plan
- `tasks.md` - Task breakdown
- `quickstart.md` - Setup guide
- `contracts/` - WebSocket event contracts

## 📝 License

MIT
