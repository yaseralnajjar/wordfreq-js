export type Wordlist = 'best' | 'large' | 'small' | 'combined';
/** English only; unsupported languages throw. Synchronous, lazy, no I/O. */
export function wordFrequency(word: string, lang: string, wordlist?: Wordlist, minimum?: number): number;
export function zipfFrequency(word: string, lang: string, wordlist?: Wordlist, minimum?: number): number;
export function tokenize(text: string, lang: string, includePunctuation?: boolean, externalWordlist?: boolean): string[];
export function lossyTokenize(text: string, lang: string, includePunctuation?: boolean, externalWordlist?: boolean): string[];
export function simpleTokenize(text: string, includePunctuation?: boolean): string[];
/** Returns a defensive copy. */
export function getFrequencyDict(lang: string, wordlist?: Wordlist): Map<string, number>;
/** Returns defensive copies of the centibel buckets. */
export function getFrequencyList(lang: string, wordlist?: Wordlist): string[][];
export function iterWordlist(lang: string, wordlist?: Wordlist): Generator<string>;
/** Values are embedded asset identifiers, not filesystem paths. */
export function availableLanguages(wordlist?: Wordlist): { en: string };
export function topNList(lang: string, n: number, wordlist?: Wordlist, asciiOnly?: boolean): string[];
export function randomWords(lang?: string, wordlist?: Wordlist, nwords?: number, bitsPerWord?: number, asciiOnly?: boolean): string;
export function randomAsciiWords(lang?: string, wordlist?: Wordlist, nwords?: number, bitsPerWord?: number): string;
export function initialize(lang?: string, wordlist?: Wordlist): void;
export function isInitialized(wordlist?: Wordlist): boolean;
/** False for unknown tokens even when frequency lookup returns its minimum. */
export function hasWord(word: string, lang?: string, wordlist?: Wordlist): boolean;
export function cBToFreq(cB: number): number;
export function cBToZipf(cB: number): number;
export function zipfToFreq(zipf: number): number;
export function freqToZipf(frequency: number): number;
export function benfordFreq(text: string): number;
export function yearFreq(text: string): number;
export function digitFreq(text: string): number;
export function hasDigitSequence(text: string): boolean;
export function smashNumbers(text: string): string;
