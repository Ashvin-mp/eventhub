import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: isCI ? 60_000 : 30_000,       // CI runners are slower — double the timeout
  expect: { timeout: isCI ? 10_000 : 5_000 },
  fullyParallel: false,
  retries: isCI ? 1 : 0,                 // retry once on CI to handle transient flakiness
  reporter: isCI
    ? [['html'], ['list']]               // list gives visible output in Actions logs
    : 'html',

  use: {
    baseURL: 'https://eventhub.rahulshettyacademy.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: isCI ? 15_000 : 0,   // cap individual actions (click, fill) in CI
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
