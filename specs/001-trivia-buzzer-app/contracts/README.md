# WebSocket Event Contracts

This directory contains the typed contracts for all WebSocket communication between client and server.

## Files

### `websocket-events.ts`

Defines the complete contract for Socket.IO events:

- **Client → Server Events** (`ClientToServerEvents`): Actions initiated by clients
- **Server → Client Events** (`ServerToClientEvents`): Broadcasts from server
- **Shared Types**: `Player`, `GameSession`, `BuzzerPress`, enums
- **Error Codes**: Standardized error codes with messages
- **Validation**: Constants and helper functions

## Usage

### Server-side (TypeScript)

```typescript
import { Server } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  GameState,
  ErrorCode,
} from '../specs/001-trivia-buzzer-app/contracts/websocket-events';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

io.on('connection', (socket) => {
  // Type-safe event handlers
  socket.on('player:join', (data, callback) => {
    // data is typed: { joinCode: string, nickname: string, password: string }
    // callback is typed: (response: { success: boolean, ... }) => void
  });

  // Type-safe event emission
  socket.emit('session:updated', {
    session: { /* GameSession object */ },
  });
});
```

### Client-side (TypeScript)

```typescript
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Player,
} from './contracts/websocket-events';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');

// Type-safe event listening
socket.on('player:joined', (data) => {
  // data is typed: { player: Player }
  console.log(`${data.player.nickname} joined!`);
});

// Type-safe event emission with callback
socket.emit('player:join', {
  joinCode: 'ABC123',
  nickname: 'Alice',
  password: 'secret',
}, (response) => {
  if (response.success) {
    console.log('Joined!', response.player);
  } else {
    console.error('Join failed:', response.error);
  }
});
```

## Event Flow Diagrams

### Game Master Creates Session

```
┌─────────┐                      ┌─────────┐
│   GM    │                      │  Server │
└────┬────┘                      └────┬────┘
     │                                │
     │ gm:createSession               │
     │ { gmPassword }                 │
     ├───────────────────────────────>│
     │                                │
     │                                │ Validate password
     │                                │ Generate join code
     │                                │ Create session in memory
     │                                │
     │ callback:                      │
     │ { success, joinCode }          │
     │<───────────────────────────────┤
     │                                │
     │ session:created                │
     │ { joinCode, session }          │
     │<───────────────────────────────┤
     │                                │
```

### Player Joins Session

```
┌─────────┐                      ┌─────────┐                     ┌───────────┐
│ Player  │                      │  Server │                     │ All Clients│
└────┬────┘                      └────┬────┘                     └─────┬─────┘
     │                                │                                │
     │ player:join                    │                                │
     │ { joinCode, nick, pass }       │                                │
     ├───────────────────────────────>│                                │
     │                                │                                │
     │                                │ Validate session exists        │
     │                                │ Check < 5 players              │
     │                                │ Check nickname unique          │
     │                                │ Add player to session          │
     │                                │ Join Socket.IO room            │
     │                                │                                │
     │ callback:                      │                                │
     │ { success, player, session }   │                                │
     │<───────────────────────────────┤                                │
     │                                │                                │
     │                                │ player:joined                  │
     │                                │ { player }                     │
     │                                ├───────────────────────────────>│
     │                                │                                │
```

### Buzzer Press Flow

```
┌─────────┐                      ┌─────────┐                     ┌───────────┐
│ Player  │                      │  Server │                     │ All Clients│
└────┬────┘                      └────┬────┘                     └─────┬─────┘
     │                                │                                │
     │ player:pressBuzzer             │                                │
     │ { joinCode, playerId }         │                                │
     ├───────────────────────────────>│                                │
     │                                │                                │
     │ (Client plays sound locally)   │ Check state == ACTIVE          │
     │                                │ Timestamp: Date.now()          │
     │                                │ Record in buzzer presses       │
     │                                │ Determine if first             │
     │                                │                                │
     │ callback: { success, ts }      │                                │
     │<───────────────────────────────┤                                │
     │                                │                                │
     │                                │ buzzer:pressed                 │
     │                                │ { playerId, timestamp, ... }   │
     │                                ├───────────────────────────────>│
     │                                │                                │
     │                                │ buzzer:first (if first)        │
     │                                │ { playerId, playerName, ts }   │
     │                                ├───────────────────────────────>│
     │                                │                                │
```

### Score Assignment

```
┌─────────┐                      ┌─────────┐                     ┌───────────┐
│   GM    │                      │  Server │                     │ All Clients│
└────┬────┘                      └────┬────┘                     └─────┬─────┘
     │                                │                                │
     │ gm:assignPoints                │                                │
     │ { joinCode, playerId, pts }    │                                │
     ├───────────────────────────────>│                                │
     │                                │                                │
     │                                │ Check state == SCORING         │
     │                                │ Update player.score            │
     │                                │                                │
     │ callback:                      │                                │
     │ { success, newScore }          │                                │
     │<───────────────────────────────┤                                │
     │                                │                                │
     │                                │ player:scoreUpdated            │
     │                                │ { playerId, newScore, pts }    │
     │                                ├───────────────────────────────>│
     │                                │                                │
```

## Error Handling

All client-initiated events use the callback pattern for synchronous error responses:

```typescript
socket.emit('player:join', data, (response) => {
  if (!response.success) {
    // Handle error
    console.error(response.error); // Human-readable message
    // response.error maps to ErrorCode enum
  }
});
```

For async errors (e.g., player disconnected during game), the server emits dedicated error events:

```typescript
socket.on('error', (data) => {
  console.error(`Error: ${data.message} (Code: ${data.code})`);
  // data.code is an ErrorCode enum value
});
```

## Validation

All input validation happens server-side using the `VALIDATION` constants and type guards:

```typescript
import { isValidNickname, isValidJoinCode, VALIDATION } from './contracts/websocket-events';

// Validate nickname
if (!isValidNickname(nickname)) {
  return callback({
    success: false,
    error: ERROR_MESSAGES[ErrorCode.INVALID_NICKNAME],
  });
}

// Validate join code format
if (!isValidJoinCode(joinCode)) {
  return callback({
    success: false,
    error: ERROR_MESSAGES[ErrorCode.INVALID_JOIN_CODE],
  });
}
```

## Testing

These contracts should be used in integration tests to ensure client-server compatibility:

```typescript
import { io as ioClient } from 'socket.io-client';
import { describe, it, expect } from 'vitest';

describe('WebSocket Contracts', () => {
  it('should allow player to join session', (done) => {
    const client = ioClient('http://localhost:3000');

    client.emit('player:join', {
      joinCode: 'TEST01',
      nickname: 'TestPlayer',
      password: 'test123',
    }, (response) => {
      expect(response.success).toBe(true);
      expect(response.player).toBeDefined();
      expect(response.player?.nickname).toBe('TestPlayer');
      done();
    });
  });
});
```

## Design Decisions

### Why Socket.IO over native WebSocket?

1. **Automatic reconnection**: Handles network issues gracefully
2. **Room support**: Perfect for session isolation
3. **Fallback mechanisms**: Works even if WebSocket blocked
4. **TypeScript support**: First-class type definitions

### Why callback pattern instead of acknowledgements?

The callback pattern provides type-safe, synchronous responses for all client actions, making error handling more predictable and easier to test.

### Why separate error events?

- **Callback errors**: Immediate validation failures (wrong input, invalid state)
- **Error events**: Async errors during game (disconnections, server issues)

This separation makes error handling clearer and more predictable for clients.
