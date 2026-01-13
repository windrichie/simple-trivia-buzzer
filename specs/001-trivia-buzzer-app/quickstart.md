# Quickstart Guide: Trivia Buzzer App

**Feature**: 001-trivia-buzzer-app
**Purpose**: Get the trivia buzzer app running locally in < 5 minutes

## Prerequisites

- Node.js 20 LTS installed
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, or Edge)

---

## Quick Start (Development)

### 1. Install Dependencies

```bash
# Install all dependencies
npm install
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
# Game Master password (change this!)
GM_PASSWORD=trivia2024

# Server port
PORT=3000

# Node environment
NODE_ENV=development
```

### 3. Run Development Server

```bash
# Start both frontend and backend in dev mode
npm run dev
```

This starts:
- **Backend**: `http://localhost:3001` (Express + WebSocket server)
- **Frontend**: `http://localhost:3000` (Next.js dev server with Fast Refresh)

### 4. Open the App

**Game Master**: `http://localhost:3000/gamemaster`
**Players**: `http://localhost:3000/player`

---

## Project Structure

```
trivia-buzzer-app/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express + Socket.IO server
│   │   ├── session-manager.ts  # In-memory session storage
│   │   ├── event-handlers/     # WebSocket event handlers
│   │   └── utils/              # Helpers (join code generation, etc.)
│   └── tests/
│       ├── unit/               # Unit tests
│       └── integration/        # WebSocket integration tests
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── gamemaster/
│   │   │   └── page.tsx        # Game Master interface
│   │   ├── player/
│   │   │   └── page.tsx        # Player interface
│   │   ├── globals.css         # Tailwind + shadcn styles
│   │   └── providers.tsx       # Socket.IO provider
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── buzzer-button.tsx   # Custom components
│   ├── lib/
│   │   ├── socket.ts           # Socket.IO client
│   │   └── utils.ts            # Utilities
│   ├── hooks/
│   │   └── use-socket.ts       # Socket hooks
│   ├── public/
│   │   └── sounds/             # Buzzer sound files (MP3)
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── components.json         # shadcn config
│
├── specs/001-trivia-buzzer-app/
│   ├── spec.md                 # Feature specification
│   ├── plan.md                 # Implementation plan (this came from /speckit.plan)
│   ├── research.md             # Technical decisions
│   ├── data-model.md           # Data structures
│   ├── contracts/              # WebSocket event contracts
│   └── quickstart.md           # This file
│
├── package.json                # Root package (workspaces)
├── tsconfig.json               # Root TypeScript config
└── .env                        # Environment variables (create this)
```

---

## Development Workflow

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Output:
# - backend/dist/ (compiled TypeScript)
# - frontend/dist/ (bundled assets)
```

### Start Production Server

```bash
# Run production build
npm start

# Server runs on PORT from .env (default: 3000)
# Frontend served at http://localhost:3000
```

---

## Common Tasks

### Add a New Buzzer Sound

1. Add MP3 file to `frontend/public/sounds/buzzer-newname.mp3`
2. Add OGG file to `frontend/public/sounds/buzzer-newname.ogg`
3. Update `BuzzerSound` enum in `specs/001-trivia-buzzer-app/contracts/websocket-events.ts`
4. Rebuild and restart server

### Change Game Master Password

1. Update `GM_PASSWORD` in `.env` file
2. Restart server (password loaded on startup)

### Adjust Session Cleanup Time

1. Open `backend/src/session-manager.ts`
2. Find `CLEANUP_INTERVAL` and `INACTIVE_THRESHOLD` constants
3. Modify values (currently 10min cleanup interval, 2hr inactivity threshold)
4. Rebuild and restart

### Debug WebSocket Events

```bash
# Enable Socket.IO debug logging
DEBUG=socket.io:* npm run dev
```

---

## Testing the App Locally

### Scenario 1: Single Device (Localhost)

1. Open browser tab 1: `http://localhost:3000/gamemaster`
2. Enter GM password from `.env`
3. Click "Create Session" → Note the join code

4. Open browser tab 2: `http://localhost:3000/player`
5. Enter join code, nickname "Alice", password "test1"
6. Click "Join"

7. Open browser tab 3: `http://localhost:3000/player`
8. Enter same join code, nickname "Bob", password "test2"
9. Click "Join"

10. Go back to GM tab → Start question → Players can buzz!

### Scenario 2: Multiple Devices (Same Network)

1. Find your local IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. Update Next.js config to allow network access:
   ```javascript
   // next.config.js
   module.exports = {
     // Already allows network access by default
   }
   ```

3. Restart dev server
4. On other devices, navigate to: `http://<YOUR_IP>:3000/player`
5. Join the same session!

### Scenario 3: Test Reconnection

1. Join as a player with nickname and password
2. Note your current score
3. Close browser tab or refresh page
4. Reopen player page
5. Enter same join code, nickname, and password
6. Click "Rejoin" → Your score should be restored!

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port in .env
PORT=3001
```

### WebSocket Connection Refused

- Check backend server is running (`npm run dev`)
- Check firewall settings
- Verify `http://localhost:3001` is accessible (backend port)

### Players Can't Join

- Verify join code is correct (case-sensitive)
- Check session hasn't ended
- Ensure < 5 players already in session
- Check browser console for errors

### Buzzer Not Working

- Verify game state is "ACTIVE" (GM must start question first)
- Check browser console for errors
- Ensure audio files exist in `frontend/public/sounds/`
- Some browsers block autoplay audio - user interaction required
- **Mobile**: Ensure browser has permission to play audio

### TypeScript Errors

```bash
# Regenerate type definitions
npm run build

# Check for type errors
npx tsc --noEmit
```

---

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GM_PASSWORD` | Game master password | - | Yes |
| `PORT` | Backend server port | `3001` | No |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for frontend | `http://localhost:3001` | No |
| `NODE_ENV` | Environment | `development` | No |
| `SESSION_CLEANUP_INTERVAL` | Cleanup check frequency (ms) | `600000` (10min) | No |
| `SESSION_INACTIVE_THRESHOLD` | Inactivity timeout (ms) | `7200000` (2hr) | No |

---

## Package Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development servers (frontend + backend) |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run E2E tests with Playwright |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

---

## Next Steps

1. **Read the spec**: [`spec.md`](./spec.md) for full feature requirements
2. **Check contracts**: [`contracts/websocket-events.ts`](./contracts/websocket-events.ts) for WebSocket API
3. **Review data model**: [`data-model.md`](./data-model.md) for entity structures
4. **Implementation plan**: [`plan.md`](./plan.md) for architecture details

---

## Production Deployment (Fly.io)

### 1. Install Fly.io CLI

```bash
# Mac/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Verify installation
flyctl version
```

### 2. Create Fly.io Account and Login

```bash
# Sign up (opens browser)
flyctl auth signup

# Or login if you have an account
flyctl auth login
```

### 3. Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

### 4. Create fly.toml Configuration

Create `fly.toml` in project root:

```toml
app = "trivia-buzzer-app"
primary_region = "sin"  # Singapore - change to your preferred region

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false  # Keep running for WebSocket
  auto_start_machines = true

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### 5. Set Secret Environment Variables

```bash
# Set GM password
flyctl secrets set GM_PASSWORD=<your-secure-password>
```

### 6. Deploy Application

```bash
# Launch app (first time)
flyctl launch

# Follow prompts:
# - Choose app name
# - Select region (closest to your users)
# - Don't add PostgreSQL/Redis
# - Deploy now? Yes

# Future deploys
flyctl deploy
```

### 7. Test Deployment

```bash
# Get your app URL
flyctl info

# Open app
flyctl open
```

Visit your app at `https://trivia-buzzer-app.fly.dev/gamemaster`

**Benefits of Fly.io**:
- ✅ No spin-down on free tier - WebSocket connections stay alive during 1-2 hour games
- ✅ Persistent connections - no 15-minute timeout like Render.com
- ✅ Global edge network - low latency worldwide
- ✅ Free tier: 3 VMs with 256MB RAM each

---

## Getting Help

- **Spec Questions**: See [`spec.md`](./spec.md)
- **API Reference**: See [`contracts/README.md`](./contracts/README.md)
- **Architecture**: See [`plan.md`](./plan.md)
- **Data Model**: See [`data-model.md`](./data-model.md)
- **Technical Decisions**: See [`research.md`](./research.md)

---

**Happy Trivia Night! 🎉🎯🔔**
