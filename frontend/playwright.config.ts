import { defineConfig, devices } from '@playwright/test'

const CI = Boolean(process.env.CI)

/** End-to-end against the real API + UI. Runs on a phone and a desktop viewport. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: [
    {
      command:
        'uv run --directory ../backend uvicorn my_path.main:create_app --factory --port 8000',
      url: 'http://localhost:8000/readyz',
      reuseExistingServer: !CI,
      env: { MY_PATH_DATABASE_URL: 'sqlite+aiosqlite:///./e2e.db', MY_PATH_ENVIRONMENT: 'test' },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !CI,
    },
  ],
})
