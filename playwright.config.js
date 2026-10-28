import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    channel: 'chrome',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  webServer: [
    {
      command: 'node server/src/server.js',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      cwd: '.',
    },
    {
      command: 'npm run preview --workspace=client -- --port 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      cwd: '.',
    },
  ],
});
