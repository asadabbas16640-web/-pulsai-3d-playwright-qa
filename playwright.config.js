const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', timeout: 180000, expect: { timeout: 20000 },
  retries: process.env.CI ? 1 : 0, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: { screenshot: 'on', trace: 'retain-on-failure', video: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 's24-ultra-viewport', use: { ...devices['Galaxy S9+'], viewport: { width: 412, height: 915 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } }
  ]
});