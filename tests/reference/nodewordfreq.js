// src/core/wordfreq.ts
import fs4 from "fs";
import path2 from "path";
import { LRUCache } from "lru-cache";

// src/data/dataPath.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var DATA_ENV_KEY = "WORDFREQ_DATA";
var moduleDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
var defaultDataDir = path.resolve(moduleDir, "../data");
var sourceDataDir = path.resolve(moduleDir, "../../data");
function getDataDir() {
  const override = process.env[DATA_ENV_KEY];
  const candidates = [
    override && override.trim().length > 0 ? path.resolve(override) : null,
    sourceDataDir,
    defaultDataDir,
    path.resolve(process.cwd(), "node_modules", "nodewordfreq", "data"),
    path.resolve(process.cwd(), "data")
  ].filter((p) => Boolean(p));
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  throw new Error(
    `\u65E0\u6CD5\u627E\u5230\u8BCD\u9891\u6570\u636E\u76EE\u5F55\uFF0C\u8BF7\u8BBE\u7F6E ${DATA_ENV_KEY} \u6307\u5411\u542B\u6709 msgpack.gz \u6570\u636E\u7684\u8DEF\u5F84`
  );
}
function getDataPath(filename) {
  return path.resolve(getDataDir(), filename);
}

// src/data/readCBPack.ts
import fs2 from "fs";
import { gunzipSync } from "zlib";
import { Unpackr } from "msgpackr";
function readCBPack(filePath) {
  const packed = fs2.readFileSync(filePath);
  const uncompressed = gunzipSync(packed);
  const unpackr = new Unpackr({ useRecords: false });
  const decoded = unpackr.unpack(uncompressed);
  const [header, ...buckets] = decoded;
  if (!header || typeof header !== "object" || header.format !== "cB" || header.version !== 1) {
    throw new Error(`\u975E\u6CD5\u7684 cBpack \u5934\u90E8: ${JSON.stringify(header)}`);
  }
  return buckets;
}

// src/numbers/index.ts
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

// src/tokenize/index.ts
import { createRequire } from "module";

// src/data/chinese.ts
import fs3 from "fs";
import { gunzipSync as gunzipSync2 } from "zlib";
import { Unpackr as Unpackr2 } from "msgpackr";
var cachedSimplifiedMap = null;
function loadSimplifiedMap() {
  if (cachedSimplifiedMap) {
    return cachedSimplifiedMap;
  }
  const buffer = fs3.readFileSync(getDataPath("_chinese_mapping.msgpack.gz"));
  const uncompressed = gunzipSync2(buffer);
  const unpackr = new Unpackr2({ useRecords: false });
  const rawMap = unpackr.unpack(uncompressed);
  const mapping = {};
  for (const [codepoint, target] of Object.entries(rawMap)) {
    const char = String.fromCodePoint(Number.parseInt(codepoint, 10));
    mapping[char] = target;
  }
  cachedSimplifiedMap = mapping;
  return mapping;
}
function simplifyChinese(text) {
  const mapping = loadSimplifiedMap();
  const simplified = Array.from(text, (char) => mapping[char] ?? char).join("");
  return simplified.toLocaleLowerCase("zh");
}
function getJiebaMainDictPath() {
  return getDataPath("jieba_zh.txt");
}
function getJiebaOrigDictPath() {
  return getDataPath("jieba_zh_orig.txt");
}

// src/utils/languageInfo.ts
var SPACELESS_SCRIPTS = [
  "Hira",
  "Kana",
  "Thai",
  "Khmr",
  "Laoo",
  "Mymr",
  "Tale",
  "Talu",
  "Lana"
];
function normalizeLocale(tag) {
  const safeTag = tag.replace(/_/g, "-");
  try {
    return new Intl.Locale(safeTag);
  } catch {
    return null;
  }
}
function normalizeLanguageTag(tag) {
  const locale = normalizeLocale(tag);
  if (!locale) {
    return tag.toLowerCase();
  }
  return locale.toString().toLowerCase();
}
function isLanguageInList(language, targets) {
  return targets.some((target) => {
    const targetLocale = normalizeLocale(target);
    return targetLocale?.language === language.language;
  });
}
function getLanguageInfo(tag) {
  const locale = normalizeLocale(tag) ?? new Intl.Locale("und");
  const maximized = locale.maximize();
  const info = {
    script: maximized.script,
    tokenizer: "regex",
    normalForm: "NFKC",
    removeMarks: false,
    dotlessI: false,
    diacriticsUnder: null,
    transliteration: null,
    lookupTransliteration: null
  };
  if (isLanguageInList(locale, ["ja", "ko"])) {
    info.tokenizer = "mecab";
  } else if (isLanguageInList(locale, ["zh", "yue"])) {
    info.tokenizer = "jieba";
  } else if (info.script && SPACELESS_SCRIPTS.includes(info.script)) {
    info.tokenizer = null;
  }
  if (info.script && ["Latn", "Grek", "Cyrl"].includes(info.script)) {
    info.normalForm = "NFC";
  }
  if (info.script && ["Arab", "Hebr"].includes(info.script)) {
    info.removeMarks = true;
  }
  if (isLanguageInList(locale, ["tr", "az", "kk"])) {
    info.dotlessI = true;
    info.diacriticsUnder = "cedillas";
  } else if (isLanguageInList(locale, ["ro"])) {
    info.diacriticsUnder = "commas";
  }
  if (isLanguageInList(locale, ["sr"])) {
    info.transliteration = "sr-Latn";
  } else if (isLanguageInList(locale, ["az"])) {
    info.transliteration = "az-Latn";
  }
  if (locale.language === "zh" && maximized.script !== "Hant") {
    info.lookupTransliteration = "zh-Hans";
  }
  return info;
}

// src/utils/transliterate.ts
var CYRILLIC_TO_LATIN = {
  \u0430: "a",
  \u0431: "b",
  \u0432: "v",
  \u0433: "g",
  \u0434: "d",
  \u0452: "\u0111",
  \u0435: "e",
  \u0436: "\u017E",
  \u0437: "z",
  \u0438: "i",
  \u0458: "j",
  \u043A: "k",
  \u043B: "l",
  \u0459: "lj",
  \u043C: "m",
  \u043D: "n",
  \u045A: "nj",
  \u043E: "o",
  \u043F: "p",
  \u0440: "r",
  \u0441: "s",
  \u0442: "t",
  \u045B: "\u0107",
  \u0443: "u",
  \u0444: "f",
  \u0445: "h",
  \u0446: "c",
  \u0447: "\u010D",
  \u045F: "d\u017E",
  \u0448: "\u0161"
};
function preserveCase(source, target) {
  if (source.toUpperCase() === source) {
    return target.toUpperCase();
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}
function transliterate(transliteration, text) {
  if (transliteration !== "sr-Latn" && transliteration !== "az-Latn") {
    return text;
  }
  return Array.from(text).map((char) => {
    const lower = char.toLowerCase();
    const mapped = CYRILLIC_TO_LATIN[lower];
    if (!mapped) {
      return char;
    }
    return preserveCase(char, mapped);
  }).join("");
}

// src/utils/preprocess.ts
var MARK_RE = new RegExp("\\p{Mn}|\\u0640", "gu");
function removeMarks(text) {
  return text.replace(MARK_RE, "");
}
function casefoldWithIDots(text) {
  const normalized = text.normalize("NFC").replace(/İ/g, "i").replace(/I/g, "\u0131");
  return normalized.toLocaleLowerCase("tr");
}
function commasToCedillas(text) {
  return text.replace(/\u0219/g, "\u015F").replace(/\u021b/g, "\u0163");
}
function cedillasToCommas(text) {
  return text.replace(/\u015f/g, "\u0219").replace(/\u0163/g, "\u021B");
}
function preprocessText(text, languageTag) {
  const info = getLanguageInfo(languageTag);
  let normalized = text.normalize(info.normalForm);
  if (info.transliteration) {
    normalized = transliterate(info.transliteration, normalized);
  }
  if (info.removeMarks) {
    normalized = removeMarks(normalized);
  }
  normalized = info.dotlessI ? casefoldWithIDots(normalized) : normalized.toLocaleLowerCase();
  if (info.diacriticsUnder === "commas") {
    normalized = cedillasToCommas(normalized);
  } else if (info.diacriticsUnder === "cedillas") {
    normalized = commasToCedillas(normalized);
  }
  return normalized;
}

// src/utils/quotes.ts
function uncurlQuotes(text) {
  return text.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"');
}

// src/tokenize/index.ts
var PUNCT_RE = /[\p{P}\p{S}]+/u;
var segmenterCache = /* @__PURE__ */ new Map();
var requireFromEsm = typeof __dirname !== "undefined" ? createRequire(`${__dirname}/`) : createRequire(import.meta.url);
var nodeJieba = null;
var jiebaMainLoaded = false;
var jiebaOrigLoaded = false;
function loadNodeJieba(externalWordlist) {
  let jieba = nodeJieba;
  if (!jieba) {
    try {
      jieba = requireFromEsm("nodejieba");
      nodeJieba = jieba;
    } catch {
      return null;
    }
  }
  if (!jieba) {
    return null;
  }
  if (externalWordlist && !jiebaOrigLoaded) {
    jieba.load({ dict: getJiebaOrigDictPath() });
    jiebaOrigLoaded = true;
  } else if (!externalWordlist && !jiebaMainLoaded) {
    jieba.load({ userDict: getJiebaMainDictPath() });
    jiebaMainLoaded = true;
  }
  return jieba;
}
function getSegmenter(lang) {
  const key = lang ?? "und";
  const cached = segmenterCache.get(key);
  if (cached) {
    return cached;
  }
  const segmenter = new Intl.Segmenter(lang, { granularity: "word" });
  segmenterCache.set(key, segmenter);
  return segmenter;
}
function segmentWithIntl(text, lang, includePunctuation = false) {
  const segmenter = getSegmenter(lang);
  const tokens = [];
  for (const item of segmenter.segment(text)) {
    const segment = item.segment.trim();
    if (!segment) {
      continue;
    }
    if (!includePunctuation && item.isWordLike === false) {
      continue;
    }
    tokens.push(segment.toLocaleLowerCase());
  }
  return tokens;
}
function tokenizeWithOptionalJieba(text, includePunctuation, externalWordlist) {
  const jieba = loadNodeJieba(externalWordlist);
  if (!jieba) {
    return segmentWithIntl(text, "zh", includePunctuation);
  }
  const result = externalWordlist ? jieba.cut(text, false) : jieba.cut(text, false);
  const lowered = result.map((token) => token.toLocaleLowerCase("zh"));
  if (includePunctuation) {
    return lowered;
  }
  return lowered.filter((token) => !PUNCT_RE.test(token));
}
function tokenizeByKind(text, tokenizer, includePunctuation, externalWordlist, lang) {
  if (tokenizer === "jieba") {
    return tokenizeWithOptionalJieba(text, includePunctuation, externalWordlist);
  }
  if (tokenizer === "mecab") {
    return segmentWithIntl(text, lang, includePunctuation);
  }
  return segmentWithIntl(text, lang, includePunctuation);
}
function simpleTokenize(text, includePunctuation = false) {
  const normalized = text.normalize("NFC");
  return segmentWithIntl(normalized, void 0, includePunctuation);
}
function tokenize(text, lang, includePunctuation = false, externalWordlist = false) {
  const info = getLanguageInfo(lang);
  const normalized = preprocessText(text, lang);
  return tokenizeByKind(normalized, info.tokenizer, includePunctuation, externalWordlist, lang);
}
function lossyTokenize(text, lang, includePunctuation = false, externalWordlist = false) {
  const info = getLanguageInfo(lang);
  let tokens = tokenize(text, lang, includePunctuation, externalWordlist);
  if (info.lookupTransliteration === "zh-Hans") {
    tokens = tokens.map((token) => simplifyChinese(token));
  }
  return tokens.map((token) => uncurlQuotes(token));
}

// src/core/constants.ts
var CACHE_SIZE = 1e5;
var INFERRED_SPACE_FACTOR = 10;
var DEFAULT_WORDLIST = "best";
var CHAR_COMBINATION_PENALTY = 3;

// src/core/frequency.ts
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

// src/core/wordfreq.ts
var frequencyListCache = /* @__PURE__ */ new Map();
var frequencyDictCache = /* @__PURE__ */ new Map();
var wordFrequencyCache = new LRUCache({ max: CACHE_SIZE });
function normalizeWordlist(wordlist) {
  if (wordlist === "combined") {
    return "small";
  }
  return wordlist;
}
function buildAvailableIndex() {
  const dataDir = getDataDir();
  const files = fs4.readdirSync(dataDir);
  const index = {};
  files.filter((name) => name.endsWith(".msgpack.gz") && !name.startsWith("_")).forEach((name) => {
    const [listName, lang] = name.replace(".msgpack.gz", "").split("_");
    if (!index[listName]) {
      index[listName] = {};
    }
    index[listName][lang] = path2.join(dataDir, name);
  });
  return index;
}
var availableIndex = buildAvailableIndex();
function availableLanguages(wordlist = DEFAULT_WORDLIST) {
  const normalized = normalizeWordlist(wordlist);
  if (normalized === "best") {
    const small = availableLanguages("small");
    const large = availableLanguages("large");
    return { ...small, ...large };
  }
  return { ...availableIndex[normalized] ?? {} };
}
function closestLanguage(requested, available) {
  const normalized = normalizeLanguageTag(requested);
  if (available.includes(normalized)) {
    return normalized;
  }
  const base = normalized.split(/[-_]/)[0];
  if (available.includes(base)) {
    return base;
  }
  const candidate = available.find((lang) => lang.startsWith(base));
  return candidate ?? null;
}
function getFrequencyList(lang, wordlist = DEFAULT_WORDLIST) {
  const normalizedList = normalizeWordlist(wordlist);
  const available = availableLanguages(normalizedList);
  const languages = Object.keys(available);
  const best = closestLanguage(lang, languages);
  if (!best) {
    throw new Error(`\u6CA1\u6709\u627E\u5230\u8BED\u8A00 ${lang} \u7684\u8BCD\u8868 ${normalizedList}`);
  }
  const cacheKey = `${best}:${normalizedList}`;
  const cached = frequencyListCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const filePath = available[best];
  const buckets = readCBPack(filePath);
  frequencyListCache.set(cacheKey, buckets);
  return buckets;
}
function getFrequencyDict(lang, wordlist = DEFAULT_WORDLIST) {
  const normalizedList = normalizeWordlist(wordlist);
  const cacheKey = `${lang}:${normalizedList}`;
  const cached = frequencyDictCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const freqs = /* @__PURE__ */ new Map();
  const pack = getFrequencyList(lang, normalizedList);
  pack.forEach((bucket, index) => {
    const freq = cBToFreq(-index);
    bucket.forEach((word) => freqs.set(word, freq));
  });
  frequencyDictCache.set(cacheKey, freqs);
  return freqs;
}
function* iterWordlist(lang, wordlist = DEFAULT_WORDLIST) {
  const pack = getFrequencyList(lang, wordlist);
  for (const bucket of pack) {
    for (const word of bucket) {
      yield word;
    }
  }
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
function estimateChineseWordFrequency(word, freqs) {
  if (word.length <= 1) {
    return null;
  }
  const chars = [...word];
  let oneOverResult = 0;
  for (const char of chars) {
    const freq = freqs.get(char);
    if (freq === void 0) {
      return null;
    }
    oneOverResult += 1 / freq;
  }
  const baseFreq = 1 / oneOverResult;
  const penalty = CHAR_COMBINATION_PENALTY ** (chars.length - 1);
  return baseFreq / penalty;
}
function wordFrequency(word, lang, wordlist = DEFAULT_WORDLIST, minimum = 0) {
  const cacheKey = `${word}|${lang}|${wordlist}|${minimum}`;
  const cached = wordFrequencyCache.get(cacheKey);
  if (cached !== void 0) {
    return cached;
  }
  const info = getLanguageInfo(lang);
  const tokens = lossyTokenize(word, lang);
  if (tokens.length === 0) {
    wordFrequencyCache.set(cacheKey, minimum);
    return minimum;
  }
  const freqs = getFrequencyDict(lang, wordlist);
  const isChineseTokenizer = info.tokenizer === "jieba";
  let oneOverResult = 0;
  for (const token of tokens) {
    const smashed = smashNumbers(token);
    let freq = freqs.get(smashed);
    if (freq === void 0) {
      if (isChineseTokenizer) {
        const estimated = estimateChineseWordFrequency(smashed, freqs);
        if (estimated !== null) {
          freq = estimated;
        }
      }
      if (freq === void 0) {
        wordFrequencyCache.set(cacheKey, minimum);
        return minimum;
      }
    }
    const adjusted = smashed === token ? freq : freq * digitFreq(token);
    oneOverResult += 1 / adjusted;
  }
  let result = 1 / oneOverResult;
  if (isChineseTokenizer && tokens.length > 1) {
    result *= INFERRED_SPACE_FACTOR ** -(tokens.length - 1);
  }
  result = roundToSignificantDigits(result, minimum);
  wordFrequencyCache.set(cacheKey, result);
  return result;
}
function zipfFrequency(word, lang, wordlist = DEFAULT_WORDLIST, minimum = 0) {
  const freqMin = zipfToFreq(minimum);
  const freq = wordFrequency(word, lang, wordlist, freqMin);
  return Number(freqToZipf(freq).toFixed(2));
}
function topNList(lang, n, wordlist = DEFAULT_WORDLIST, asciiOnly = false) {
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
function randomWords(lang = "en", wordlist = DEFAULT_WORDLIST, nwords = 5, bitsPerWord = 12, asciiOnly = false) {
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
function randomAsciiWords(lang = "en", wordlist = DEFAULT_WORDLIST, nwords = 5, bitsPerWord = 12) {
  return randomWords(lang, wordlist, nwords, bitsPerWord, true);
}
export {
  availableLanguages,
  benfordFreq,
  cBToFreq,
  cBToZipf,
  digitFreq,
  freqToZipf,
  getDataDir,
  getDataPath,
  getFrequencyDict,
  getFrequencyList,
  hasDigitSequence,
  iterWordlist,
  lossyTokenize,
  randomAsciiWords,
  randomWords,
  simpleTokenize,
  smashNumbers,
  tokenize,
  topNList,
  wordFrequency,
  yearFreq,
  zipfFrequency,
  zipfToFreq
};
//# sourceMappingURL=index.js.map