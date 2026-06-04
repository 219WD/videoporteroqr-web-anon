import React, { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { createLogger } from '../utils/logger';

const log = createLogger('socket-bridge');

export function WebSocketBridge() {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      log.info('connect', { socketId: socket.id || null });
    });
    socket.on('disconnect', (reason) => {
      log.info('disconnect', { socketId: socket.id || null, reason: reason || null });
    });

    return () => {
      socketRef.current?.disconnect();
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  return null;
}
