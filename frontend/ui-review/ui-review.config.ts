import { defineConfig, devices } from '@playwright/test';

// Screenshot review (not a test suite): `npm run ui:review`.
// Output: ui-review/out/shots/*.png + ui-review/out/summary.json.
const PORT = 4173;

export default defineConfig({
  testDir: '.',
  testMatch: /screens\.ts$/,
  fullyParallel: true,
  reporter: 'line',
  timeout: 300_000,
  use: { baseURL: `http://localhost:${PORT}`, reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_API_BASE_URL: 'http://localhost:3000/api/v1' },
  },
});
