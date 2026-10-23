import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import * as api from '../dist/index.js';
process.env.WORDFREQ_DATA = resolve('data');
const upstream = await import('./reference/nodewordfreq.js');

test('English large/small dictionaries match every upstream word and frequency', () => {
  for (const list of ['large', 'small']) {
    const expected = upstream.getFrequencyDict('en', list);
    assert.deepEqual(api.getFrequencyDict('en', list), expected);
    assert.deepEqual(api.getFrequencyList('en', list), upstream.getFrequencyList('en', list));
  }
});

test('lookup and tokenization agree with nodewordfreq across ordinary and difficult inputs', () => {
  const samples = ['the', 'unreadable', 'indented', 'bounded', 'overlay', 'sesquipedalian',
    'quuxzzzz-not-a-word', '', '!!!', "don't", 'can’t', '“quoted words”', 'well-known',
    'state-of-the-art', 'NASA', 'CAFÉ', 'cafe\u0301', 'foo_bar', '3.14', '12345', '2026',
    'two words', 'English 中文', 'file.js', '☀️', 'constructor', '__proto__', 'prototype'];
  const all = [...upstream.iterWordlist('en')];
  for (let i = 0; i < all.length; i += 137) samples.push(all[i]);
  for (const list of ['best', 'large', 'small', 'combined']) {
    for (const word of samples) {
      assert.equal(api.wordFrequency(word, 'en', list), upstream.wordFrequency(word, 'en', list), `${list}: ${word}`);
      assert.equal(api.zipfFrequency(word, 'en', list), upstream.zipfFrequency(word, 'en', list), `${list}: ${word}`);
    }
  }
  for (const lang of ['en', 'en-US', 'en-GB']) for (const word of samples.slice(0, 28)) {
    for (const punctuation of [false, true]) for (const method of ['tokenize', 'lossyTokenize']) {
      assert.deepEqual(api[method](word, lang, punctuation), upstream[method](word, lang, punctuation), word);
    }
    assert.equal(api.zipfFrequency(word, lang), upstream.zipfFrequency(word, lang));
  }
  for (const minimum of [0, 1, 3, 5]) {
    assert.equal(api.zipfFrequency('quuxzzzz-not-a-word', 'en', 'best', minimum), minimum);
  }
});

test('supported utility methods preserve upstream English behavior', () => {
  for (const list of ['large', 'small', 'best', 'combined']) {
    assert.deepEqual(api.topNList('en', 100, list), upstream.topNList('en', 100, list));
    assert.deepEqual(api.topNList('en', 100, list, true), upstream.topNList('en', 100, list, true));
  }
  for (const text of ['2026', '1800', '123', '1.5', '42,001', 'the cat']) {
    for (const method of ['digitFreq', 'hasDigitSequence', 'smashNumbers']) assert.equal(api[method](text), upstream[method](text));
    assert.deepEqual(api.simpleTokenize(text), upstream.simpleTokenize(text));
  }
  const random = api.randomAsciiWords('en', 'best', 10, 8).split(' ');
  assert.equal(random.length, 10);
  assert(random.every(w => api.topNList('en', 256, 'best', true).includes(w)));
  assert.equal(api.cBToZipf(-600), 3);
  assert.equal(api.freqToZipf(0.000001), 3);
});

test('unknowns, explicit language limits and defensive dictionary copies', () => {
  assert(api.hasWord('unreadable'));
  assert(!api.hasWord('quuxzzzz-not-a-word'));
  assert(!api.hasWord(''));
  assert.equal(api.zipfFrequency('quuxzzzz-not-a-word', 'en'), 0);
  assert.throws(() => api.zipfFrequency('bonjour', 'fr'), /Only English/);
  assert.throws(() => api.zipfFrequency('the', 'en', 'missing'), /Unsupported wordlist/);
  assert.throws(() => api.wordFrequency(3, 'en'), TypeError);
  assert.throws(() => api.wordFrequency('the', 'en', 'best', NaN), RangeError);
  const expected = api.zipfFrequency('the', 'en');
  api.getFrequencyDict('en').clear();
  api.getFrequencyList('en').forEach(bucket => { bucket.length = 0; });
  assert.equal(api.zipfFrequency('the', 'en'), expected);
});

test('CommonJS and isolated browser-global bundles need no imports, network, eval or Node APIs', () => {
  const required = createRequire(import.meta.url)('../dist/index.cjs');
  assert.equal(required.zipfFrequency('unreadable', 'en'), api.zipfFrequency('unreadable', 'en'));
  const code = readFileSync('dist/wordfreq.global.js', 'utf8');
  for (let restart = 0; restart < 2; restart++) {
    let requests = 0;
    const forbidden = () => { requests++; throw new Error('Runtime I/O forbidden'); };
    const context = vm.createContext({ TextDecoder, TextEncoder, atob, Intl,
      fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden, Worker: forbidden },
      { codeGeneration: { strings: false, wasm: false } });
    vm.runInContext(code, context);
    assert.equal(context.Wordfreq.isInitialized(), false);
    assert.equal(context.Wordfreq.zipfFrequency('unreadable', 'en'), api.zipfFrequency('unreadable', 'en'));
    assert.equal(context.Wordfreq.isInitialized(), true);
    assert.equal(context.Wordfreq.isInitialized('small'), false);
    context.Wordfreq.initialize('en', 'small');
    assert.equal(context.Wordfreq.isInitialized('small'), true);
    assert.equal(requests, 0);
  }
});
