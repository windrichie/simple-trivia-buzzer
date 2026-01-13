'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { socket } from '@/lib/socket';
import { ClientToServerEvents, ServerToClientEvents } from '@/lib/websocket-events';

type SocketContextType = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
