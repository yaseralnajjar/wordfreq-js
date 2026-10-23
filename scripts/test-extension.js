import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const executablePath = process.env.CHROMIUM_EXECUTABLE;
if (!executablePath) throw new Error('Set CHROMIUM_EXECUTABLE to a Chromium/Chrome for Testing executable with unpacked-extension support.');
const directory = resolve('examples/extension');
const profile = await mkdtemp(join(tmpdir(), 'wordfreq-extension-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, { executablePath, headless: true,
    args: [`--disable-extensions-except=${directory}`, `--load-extension=${directory}`] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).hostname;
  const page = await context.newPage();
  const failures = [];
  const externalRequests = [];
  page.on('pageerror', error => failures.push(error.message));
  context.on('request', request => {
    if (/^https?:/.test(request.url())) externalRequests.push(request.url());
  });
  await page.goto(`chrome-extension://${id}/index.html`);
  await page.waitForFunction(() => globalThis.wordfreqVerification?.serviceWorker);
  const initial = await page.evaluate(() => globalThis.wordfreqVerification);
  assert(initial.first.passed && initial.second.passed && initial.serviceWorker.passed);
  assert.equal(initial.first.initializedBefore, false);
  assert.equal(initial.second.initializedBefore, true);
  assert.equal(initial.serviceWorker.initializedBefore, false);
  assert.equal(initial.lookupResourceRequests, 0);
  const repeat = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'wordfreq-test' }));
  assert.equal(repeat.initializedBefore, true);

  const cdp = await context.newCDPSession(page);
  const versions = new Map();
  cdp.on('ServiceWorker.workerVersionUpdated', event => {
    for (const version of event.versions) versions.set(version.versionId, version);
  });
  await cdp.send('ServiceWorker.enable');
  // CDP sends the known versions when the domain is enabled.
  for (let tries = 0; tries < 20 && ![...versions.values()].some(v => v.scriptURL === worker.url()); tries++) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const version = [...versions.values()].find(v => v.scriptURL === worker.url() && v.runningStatus === 'running');
  assert(version, 'Extension service worker must be visible to CDP');
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  const restarted = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'wordfreq-test' }));
  assert(restarted.passed);
  assert.equal(restarted.initializedBefore, false);
  assert.deepEqual(restarted.scores, initial.serviceWorker.scores);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(failures, []);
  const result = { browser: context.browser()?.version() ?? await page.evaluate(() => navigator.userAgent),
    initial, repeatedWorker: repeat, restartedWorker: restarted, externalRequests, pageErrors: failures,
    csp: "script-src 'self'; connect-src 'none'", note: 'Local unpacked MV3 verification; no CI or remote requests.' };
  await writeFile('extension-verification.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
