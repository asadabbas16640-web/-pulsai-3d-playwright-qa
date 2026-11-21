const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', timeout: 180000, expect: { timeout: 20000 },
  retries: 0, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: { trace: 'off', video: 'off', launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 's24-ultra-viewport', use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36', isMobile: true, hasTouch: true } }
  ]
});
