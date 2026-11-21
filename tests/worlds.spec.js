const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const WORLD_NAMES = [
 'Connected Care City','Neural Intelligence Core','Digital Health Campus','Intelligent Triage Command',
 'Holographic Anatomy Theater','Clinical Monitoring Center','Hospital Digital Twin Atrium',
 'Nexus Health Exterior','AI Bedside Intelligence','Smart Emergency District',
 'Healthcare Network Skyline','Robotic Clinical Laboratory','Digital Twin Diagnostic Studio',
 'AI Intelligence Sphere','Integrated Clinical Workstations','Emergency Operations Campus'
];
const GLB_WORLDS = new Set([4,8,11,12,14]);

const timeout = 12000;

function targetUrl() {
  const value = process.env.PULSAI_TEST_URL;
  if (!value) throw new Error('PULSAI_TEST_URL is missing');
  const url = new URL(value);
  if (url.origin !== 'https://pulsai-beyond-the.hatchable.site') {
    throw new Error('PULSAI_TEST_URL must use the authorized PulsAI 3D origin');
  }
  // Preserve the complete preview URL, including any authentication path.
  return url;
}

function assetUrl(value) {
  const url = new URL(value);
  return url.origin + url.pathname;
}

async function openScene(page) {
  const url = targetUrl();
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response?.ok() || new URL(page.url()).origin !== url.origin) {
    throw new Error('Preview access failed (HTTP ' + (response?.status() ?? 'unknown') + ')');
  }
  if (new URL(page.url()).pathname === '/') {
    const explore = new URL('/explore.html', url.origin);
    explore.search = url.search;
    const scene = await page.goto(explore.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!scene?.ok() || new URL(page.url()).origin !== url.origin) {
      throw new Error('Explorer access failed (HTTP ' + (scene?.status() ?? 'unknown') + ')');
    }
  }
  await page.locator('#stage').waitFor({ state: 'visible', timeout });
  await page.waitForFunction(() => window.__PULSAI_QA__?.ready, null, { timeout: 25000 });
}

async function activate(locator, touch) {
  if (touch) await locator.tap({ timeout });
  else await locator.click({ timeout });
}

test('inspect all 16 environments', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(18 * 60 * 1000);
  let world;
  const diagnostics = [];
  const network = new Map();
  const results = [];
  const report = { device: testInfo.project.name, results, diagnostics };
  const writeReport = () => fs.writeFileSync(
    testInfo.outputPath('asset-report.json'), JSON.stringify(report, null, 2)
  );

  page.on('pageerror', error => diagnostics.push({ world, type: 'runtime', message: error.message }));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) {
      diagnostics.push({ world, type: message.type(), message: message.text() });
    }
  });
  const record = (request, outcome) => {
    const url = new URL(request.url());
    if (!/\.(glb|gltf|bin)$/i.test(url.pathname)) return;
    const entry = network.get(request) ?? { world, url: assetUrl(request.url()) };
    Object.assign(entry, outcome);
    network.set(request, entry);
  };
  page.on('request', request => record(request, { status: 'pending' }));
  page.on('response', response => record(response.request(), { status: response.status() }));
  page.on('requestfailed', request => record(request, { status: request.failure()?.errorText }));

  try {
    await openScene(page);
  } catch (error) {
    report.preflight = error.message;
    writeReport();
    throw new Error('Explorer preflight failed. See the private QA report for details.');
  }

  const title = page.locator('#worldTitle');
  const menu = page.locator('#worlds');
  const items = page.locator('#worldList button');
  let verifiedIndex = 0;
  for (const [index, name] of WORLD_NAMES.entries()) {
    world = index + 1;
    const result = { world, name, navigation: false, screenshot: false, problems: [] };
    results.push(result);
    try {
      if (index > 0 && verifiedIndex === index - 1) {
        try {
          await activate(page.locator('#next'), isMobile);
          await expect(title).toHaveText(name, { timeout });
          result.navigation = true;
        } catch (error) {
          result.problems.push('Next control: ' + error.message);
        }
      }
      if (index > 0 && !result.navigation) {
        if (!(await menu.evaluate(element => element.classList.contains('open')))) {
          await activate(page.locator('#menuBtn'), isMobile);
        }
        await expect(items).toHaveCount(16, { timeout });
        await activate(items.nth(index), isMobile);
        result.recoveredThroughMenu = true;
      }
      await expect(title).toHaveText(name, { timeout });
      if (index === 0) result.navigation = true;
      verifiedIndex = index;

      try {
        await page.waitForFunction(index => {
          const qa = window.__PULSAI_QA__;
          return qa?.worldIndex === index && qa.requested === qa.loaded + qa.failed;
        }, index, { timeout: 20000, polling: 250 });
      } catch {
        result.problems.push('Asset loading timed out');
      }

      const { qa, webgl } = await page.evaluate(() => {
        const canvas = document.querySelector('#stage');
        const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
        return {
          qa: structuredClone(window.__PULSAI_QA__),
          webgl: !!context && !context.isContextLost() && context.drawingBufferWidth > 0
        };
      });
      Object.assign(result, { webgl, assets: qa });
      if (!webgl) result.problems.push('WebGL drawing buffer is unavailable');
      if (GLB_WORLDS.has(index) && (!qa.requested || !qa.loaded)) {
        result.problems.push('Expected imported model did not load');
      }
      if (qa.failed) result.problems.push(qa.failed + ' model imports failed');
      const screenshot = String(world).padStart(2, '0') + '-' + testInfo.project.name + '.png';
      await page.screenshot({ path: testInfo.outputPath(screenshot), scale: 'css', timeout: 18000 });
      result.screenshot = true;
      await testInfo.attach(screenshot, { path: testInfo.outputPath(screenshot), contentType: 'image/png' });
    } catch (error) {
      result.problems.push(error.message);
    }
    result.assetRequests = [...network.values()].filter(entry => entry.world === world);
    result.browserErrors = diagnostics.filter(entry => entry.world === world);
    result.pass = result.problems.length === 0 &&
      !result.browserErrors.some(entry => ['error', 'runtime'].includes(entry.type));
    writeReport();
  }

  expect(results.filter(result => !result.pass).map(result => result.world)).toEqual([]);
  expect(diagnostics.filter(entry => !entry.world && ['error', 'runtime'].includes(entry.type)).length).toBe(0);
});

test('world menu and previous control accept device input', async ({ page, isMobile }) => {
  await openScene(page);
  await activate(page.locator('#menuBtn'), isMobile);
  const items = page.locator('#worldList button');
  await expect(items).toHaveCount(16);
  await activate(items.nth(12), isMobile);
  await expect(page.locator('#worldTitle')).toHaveText(WORLD_NAMES[12]);
  await expect(page.locator('#worlds')).not.toHaveClass(/\bopen\b/);
  await activate(page.locator('#prev'), isMobile);
  await expect(page.locator('#worldTitle')).toHaveText(WORLD_NAMES[11]);
});
