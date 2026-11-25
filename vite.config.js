import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend solo admite CORS desde http://localhost:5173, por eso strictPort.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
});
