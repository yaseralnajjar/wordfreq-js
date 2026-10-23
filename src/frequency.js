// English frequency/number algorithms adapted from nodewordfreq 0.2.1 (Apache-2.0).
// Original wordfreq by Robyn Speer. See NOTICE.md and licenses/.
import { getData, assertEnglish, resolveList } from './data.js';
import { lossyTokenize } from './tokenize.js';
function cBToFreq(cB) {
  if (cB > 0) {
    throw new Error("\u9891\u7387\u4E0D\u53EF\u80FD\u662F\u6B63\u7684\u5206\u8D1D\u6570\u503C");
  }
  return 10 ** (cB / 100);
}
function cBToZipf(cB) {
  return (cB + 900) / 100;
}
function zipfToFreq(zipf) {
  return 10 ** zipf / 1e9;
}
function freqToZipf(freq) {
  return Math.log10(freq) + 9;
}


const DEFAULT_WORDLIST = 'best';

var DIGIT_FREQS = [9e-3, 0.3, 0.175, 0.124, 0.096, 0.078, 0.066, 0.057, 0.05, 0.045];
var YEAR_LOG_PEAK = -1.9185;
var NOT_YEAR_PROB = 0.1;
var REFERENCE_YEAR = 2019;
var PLATEAU_WIDTH = 20;
var DIGIT_RE = /\d/g;
var MULTI_DIGIT_RE_GLOBAL = /\d[\d.,]+/g;
var MULTI_DIGIT_RE = /\d[\d.,]+/;
var PURE_DIGIT_RE_GLOBAL = /\d+/g;
function benfordFreq(text) {
  const firstDigit = Number.parseInt(text[0] ?? "0", 10);
  return DIGIT_FREQS[firstDigit] / 10 ** (text.length - 1);
}
function yearFreq(text) {
  const year = Number.parseInt(text, 10);
  let yearLogFreq = YEAR_LOG_PEAK;
  if (year <= REFERENCE_YEAR) {
    yearLogFreq = YEAR_LOG_PEAK - 83e-4 * (REFERENCE_YEAR - year);
  } else if (year <= REFERENCE_YEAR + PLATEAU_WIDTH) {
    yearLogFreq = YEAR_LOG_PEAK;
  } else {
    yearLogFreq = YEAR_LOG_PEAK - 0.2 * (year - (REFERENCE_YEAR + PLATEAU_WIDTH));
  }
  const yearProb = 10 ** yearLogFreq;
  const notYearProb = NOT_YEAR_PROB * benfordFreq(text);
  return yearProb + notYearProb;
}
function digitFreq(text) {
  let freq = 1;
  const matches = text.matchAll(MULTI_DIGIT_RE_GLOBAL);
  for (const match of matches) {
    const sub = match[0];
    const pureDigits = sub.matchAll(PURE_DIGIT_RE_GLOBAL);
    for (const digitMatch of pureDigits) {
      const digits = digitMatch[0];
      if (digits.length === 4) {
        freq *= yearFreq(digits);
      } else {
        freq *= benfordFreq(digits);
      }
    }
  }
  return freq;
}
function hasDigitSequence(text) {
  return MULTI_DIGIT_RE.test(text);
}
function smashNumbers(text) {
  return text.replace(MULTI_DIGIT_RE_GLOBAL, (match) => match.replace(DIGIT_RE, "0"));
}



function roundToSignificantDigits(value, minimum) {
  const unrounded = Math.max(value, minimum);
  if (unrounded === 0) {
    return 0;
  }
  const leadingZeroes = Math.floor(-Math.log10(unrounded));
  const places = Math.max(0, leadingZeroes + 3);
  const factor = 10 ** places;
  return Math.round(unrounded * factor) / factor;
}

function validateLookup(word, lang, wordlist, minimum) {
  if (typeof word !== 'string') throw new TypeError('Word must be a string');
  assertEnglish(lang);
  resolveList(wordlist);
  if (!Number.isFinite(minimum) || minimum < 0) throw new RangeError('Minimum must be a finite nonnegative number');
}
export function wordFrequency(word, lang, wordlist = 'best', minimum = 0) {
  validateLookup(word, lang, wordlist, minimum);
  const tokens = lossyTokenize(word, lang);
  if (!tokens.length) return minimum;
  const freqs = getData(lang, wordlist).frequencies;
  let oneOverResult = 0;
  for (const token of tokens) {
    const smashed = smashNumbers(token);
    const freq = freqs.get(smashed);
    if (freq === undefined) return minimum;
    const adjusted = smashed === token ? freq : freq * digitFreq(token);
    oneOverResult += 1 / adjusted;
  }
  return roundToSignificantDigits(1 / oneOverResult, minimum);
}

export function zipfFrequency(word, lang, wordlist = DEFAULT_WORDLIST, minimum = 0) {
  const freqMin = zipfToFreq(minimum);
  const freq = wordFrequency(word, lang, wordlist, freqMin);
  return Number(freqToZipf(freq).toFixed(2));
}

export function getFrequencyDict(lang, wordlist = 'best') {
  return new Map(getData(lang, wordlist).frequencies);
}
export function getFrequencyList(lang, wordlist = 'best') {
  return getData(lang, wordlist).buckets.map(bucket => [...bucket]);
}
export function* iterWordlist(lang, wordlist = 'best') {
  for (const bucket of getData(lang, wordlist).buckets) yield* bucket;
}
// Embedded IDs replace the filesystem paths returned by the Node-only library.
export function availableLanguages(wordlist = 'best') {
  return { en: 'embedded:' + resolveList(wordlist) + '_en' };
}
// Membership is intentionally separate from minimum-clamped frequency lookup.
export function hasWord(word, lang = 'en', wordlist = 'best') {
  validateLookup(word, lang, wordlist, 0);
  const tokens = lossyTokenize(word, lang);
  const freqs = getData(lang, wordlist).frequencies;
  return tokens.length > 0 && tokens.every(token => freqs.has(smashNumbers(token)));
}
export function topNList(lang, n, wordlist = DEFAULT_WORDLIST, asciiOnly = false) {
  const results = [];
  for (const word of iterWordlist(lang, wordlist)) {
    if (!asciiOnly || word <= "~") {
      if (!hasDigitSequence(word)) {
        results.push(word);
        if (results.length >= n) {
          break;
        }
      }
    }
  }
  return results;
}
export function randomWords(lang = "en", wordlist = DEFAULT_WORDLIST, nwords = 5, bitsPerWord = 12, asciiOnly = false) {
  const nChoices = 2 ** bitsPerWord;
  const choices = topNList(lang, nChoices, wordlist, asciiOnly);
  if (choices.length < nChoices) {
    throw new Error(`\u8BCD\u8868\u4E0D\u8DB3\u4EE5\u63D0\u4F9B ${bitsPerWord} bits \u7684\u71B5\u503C`);
  }
  const tokens = [];
  for (let i = 0; i < nwords; i += 1) {
    const idx = Math.floor(Math.random() * nChoices);
    tokens.push(choices[idx]);
  }
  return tokens.join(" ");
}
export function randomAsciiWords(lang = "en", wordlist = DEFAULT_WORDLIST, nwords = 5, bitsPerWord = 12) {
  return randomWords(lang, wordlist, nwords, bitsPerWord, true);
}

export { cBToFreq, cBToZipf, zipfToFreq, freqToZipf, benfordFreq, yearFreq, digitFreq, hasDigitSequence, smashNumbers };
