import { io, Socket } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function createSocket(token?: string | null): Socket {
  return io(socketUrl, {
    auth: { token: token || undefined },
    transports: ['websocket'],
    forceNew: true,
    reconnection: true,
  });
}
