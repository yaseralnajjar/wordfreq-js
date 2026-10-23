// English subset of nodewordfreq 0.2.1 tokenization (Apache-2.0).
import { assertEnglish } from './data.js';
const segmenters = new Map();
function segment(text, lang, includePunctuation) {
  if (typeof text !== 'string') throw new TypeError('Text must be a string');
  const key = lang ?? 'default';
  if (!segmenters.has(key)) segmenters.set(key, new Intl.Segmenter(lang, { granularity: 'word' }));
  const tokens = [];
  for (const item of segmenters.get(key).segment(text)) {
    const token = item.segment.trim();
    if (token && (includePunctuation || item.isWordLike !== false)) tokens.push(token.toLocaleLowerCase());
  }
  return tokens;
}
export function simpleTokenize(text, includePunctuation = false) {
  return segment(text.normalize('NFC'), undefined, includePunctuation);
}
export function tokenize(text, lang, includePunctuation = false, externalWordlist = false) {
  assertEnglish(lang);
  // externalWordlist only changes Chinese tokenization upstream; no effect for English.
  return segment(text.normalize('NFC').toLocaleLowerCase(), lang.replaceAll('_', '-'), includePunctuation);
}
export function lossyTokenize(text, lang, includePunctuation = false, externalWordlist = false) {
  return tokenize(text, lang, includePunctuation, externalWordlist)
    .map(token => token.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"'));
}
