# PulsAI Beyond the Dashboard — Playwright QA

This is a separate QA repository, not the production PulsAI EHR.

## Run locally
```bash
npm install
npx playwright install chromium
PULSAI_TEST_URL="https://pulsai-beyond-the.hatchable.site/explore.html?_preview=YOUR_VALID_TOKEN" npm test
```

Set a valid authorized Hatchable preview URL; its token expires after 30 minutes. Never commit the token.

## GitHub Actions
Repository Settings → Secrets and variables → Actions → New repository secret.
Set `PULSAI_TEST_URL` to an authorized current preview URL or approved permanent test-access URL.
Then Actions → PulsAI 3D Playwright QA → Run workflow.

The test visits all 16 worlds on desktop and Samsung S24 Ultra-sized emulated mobile viewports, saving 32 screenshots, per-world GLB load results, JSON report, and browser errors.

## Limitations
Hatchable project visibility is personal/private; the ordinary URL is blocked by a platform sign-in wall. A 30-minute preview token is unsuitable for recurring unattended runs. Use a durable authorized access solution for recurring CI. Emulated mobile is not physical-device testing.
