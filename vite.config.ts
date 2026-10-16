import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  server: {
    allowedHosts: ['192.168.1.13', 'localhost', '127.0.0.1']
  },
  preview: {
    allowedHosts: ['192.168.1.13', 'localhost', '127.0.0.1']
  },
});
