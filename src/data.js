import { gunzipSync } from 'fflate';
import { decode } from '@msgpack/msgpack';
import large from '../data/large_en.msgpack.gz';
import small from '../data/small_en.msgpack.gz';

const loaded = new Map();
export function resolveList(wordlist = 'best') {
  if (wordlist === 'best') return 'large';
  if (wordlist === 'combined') return 'small';
  if (wordlist !== 'small' && wordlist !== 'large') throw new RangeError(`Unsupported wordlist: ${wordlist}`);
  return wordlist;
}
export function assertEnglish(lang) {
  if (typeof lang !== 'string') throw new TypeError('Language must be an English language tag');
  let locale;
  try { locale = new Intl.Locale(lang.replaceAll('_', '-')); } catch { /* Report a stable error below. */ }
  if (locale?.language !== 'en') throw new RangeError(`Only English is bundled; unsupported language: ${lang}`);
}
export function getData(lang, wordlist = 'best') {
  assertEnglish(lang);
  const list = resolveList(wordlist);
  if (loaded.has(list)) return loaded.get(list);
  const binary = atob(list === 'large' ? large : small);
  const packed = Uint8Array.from(binary, char => char.charCodeAt(0));
  const [header, ...buckets] = decode(gunzipSync(packed));
  if (header?.format !== 'cB' || header.version !== 1) throw new Error('Invalid embedded frequency data');
  const frequencies = new Map();
  buckets.forEach((bucket, index) => {
    const frequency = 10 ** (-index / 100);
    for (const word of bucket) frequencies.set(word, frequency);
  });
  const data = { buckets, frequencies };
  loaded.set(list, data);
  return data;
}
export function initialize(lang = 'en', wordlist = 'best') {
  getData(lang, wordlist);
}
export function isInitialized(wordlist = 'best') {
  return loaded.has(resolveList(wordlist));
}
