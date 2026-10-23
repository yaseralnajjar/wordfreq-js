import * as api from './wordfreq.js';
export function check() {
  const initializedBefore = api.isInitialized();
  const started = performance.now();
  const scores = Object.fromEntries(['the', 'unreadable', 'indented', 'overlay', 'sesquipedalian', 'quuxzzzz'].map(word => [word, api.zipfFrequency(word, 'en')]));
  const firstBatchMs = performance.now() - started;
  if (scores.the !== 7.73 || scores.quuxzzzz !== 0 || api.hasWord('quuxzzzz')) throw new Error('Unexpected frequency output');
  return { passed: true, initializedBefore, initializedAfter: api.isInitialized(), firstBatchMs, scores };
}
