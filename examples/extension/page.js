import { check } from './checks.js';
try {
  const before = performance.getEntriesByType('resource').length;
  const first = check();
  const second = check();
  const result = { first, second, lookupResourceRequests: performance.getEntriesByType('resource').length - before };
  if (globalThis.chrome?.runtime?.id) result.serviceWorker = await chrome.runtime.sendMessage({ type: 'wordfreq-test' });
  globalThis.wordfreqVerification = result;
  document.getElementById('output').textContent = JSON.stringify(result, null, 2);
} catch (error) {
  globalThis.wordfreqVerification = { passed: false, error: error.stack };
  document.getElementById('output').textContent = error.stack;
}
