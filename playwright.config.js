import { defineConfig } from '@playwright/test';

// Se usan los navegadores ya instalados (Chrome y Edge); no se descargan.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'es-EC',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chrome', use: { channel: 'chrome' } },
    { name: 'msedge', use: { channel: 'msedge' } },
  ],
  webServer: [
    {
      // Backend propio de pruebas: no toca el que corre en :3000 ni su límite de logins.
      command: 'node src/server.js',
      cwd: '../App_DistriGo_Backen',
      url: 'http://127.0.0.1:3100/api/salud',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PUERTO: '3100',
        HOST: '127.0.0.1',
        LOGIN_MAX_INTENTOS: '1000',
        CORS_ORIGENES: 'http://localhost:5174',
      },
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_URL: 'http://localhost:3100/api' },
    },
  ],
});
