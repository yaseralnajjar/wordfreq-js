import { check } from './checks.js';
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'wordfreq-test') {
    try { respond(check()); } catch (error) { respond({ passed: false, error: error.message }); }
  }
});
