'use client';

import { useEffect, useState } from 'react';
import { socket, connectSocket, disconnectSocket } from '@/lib/socket';

/**
 * Hook to manage Socket.IO connection state
 * Automatically connects on mount and disconnects on unmount
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState('N/A');

  useEffect(() => {
    // Connect socket when component mounts
    connectSocket();

    // Set up event listeners
    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on('upgrade', (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport('N/A');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Clean up on unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, []);

  return {
    socket,
    isConnected,
    transport,
  };
}
