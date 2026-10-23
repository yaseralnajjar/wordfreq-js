# wordfreq-js

Synchronous English word-frequency and Zipf lookup for browsers, Chrome extensions,
and Node.js. Both English wordlists are embedded in each bundle. Lookup performs
no fetch, XHR, filesystem access, dynamic import, or remote-code loading.

This is an English adaptation of [nodewordfreq](https://github.com/realchendahuang/nodewordfreq),
using the original [wordfreq](https://github.com/rspeer/wordfreq) data. It is not a
multilingual drop-in replacement. No software-review heuristics or AI detection
rules are included.

## Install

This repository is private. Install with GitHub access over SSH:

```sh
npm install git+ssh://git@github.com/yaseralnajjar/wordfreq-js.git#v0.1.0
```

Built artifacts are committed, so installation does not compile native modules
or need a prepare script. For a project without GitHub access, create a portable
archive with `npm pack --ignore-scripts` and install that archive locally. The
package is not published to the public npm registry.

## Use

```js
import { zipfFrequency, wordFrequency, hasWord } from '@yaseralnajjar/wordfreq-js';

zipfFrequency('unreadable', 'en'); // synchronous numeric Zipf score
wordFrequency('unreadable', 'en'); // frequency as a probability
hasWord('quuxzzzz', 'en');         // false; distinguish absence from a low score
```

CommonJS: `const { zipfFrequency } = require('@yaseralnajjar/wordfreq-js')`.
Without a bundler, copy `dist/index.js` as an ES module, or load
`dist/wordfreq.global.js` as a local script exposing `Wordfreq`.

The first lookup synchronously decompresses and indexes only its requested
wordlist. Later lookups reuse that index. Importing the module alone does not
unpack either list. Optional warm-up: `initialize('en', 'best')`.
`isInitialized('best')` reports whether that list is ready. Each JS realm or
restarted extension service worker initializes independently. There are no
background tasks, caches on disk, or extension permissions.

Embedding avoids runtime requests but includes the dictionary bytes at initial
script load. The large list has about 1.5 MB of gzip data; base64 encoding and
bundled decoding code increase the shipped JS size. First use blocks its thread;
use an extension service worker or a worker you manage for latency-sensitive UI.
See `benchmarks.json` for a measured local run, not a performance guarantee.

## API compatibility

Supported signatures follow nodewordfreq 0.2.1:

- `wordFrequency(word, lang, wordlist = 'best', minimum = 0)`
- `zipfFrequency(word, lang, wordlist = 'best', minimum = 0)`
- `tokenize(text, lang, includePunctuation = false, externalWordlist = false)`
- `lossyTokenize(text, lang, includePunctuation = false, externalWordlist = false)`
- `simpleTokenize(text, includePunctuation = false)`
- `getFrequencyDict(lang, wordlist = 'best')`: `Map<string, number>`
- `getFrequencyList(lang, wordlist = 'best')`: centibel buckets
- `iterWordlist(lang, wordlist = 'best')`
- `topNList(lang, n, wordlist = 'best', asciiOnly = false)`
- `randomWords(lang = 'en', wordlist = 'best', nwords = 5, bitsPerWord = 12, asciiOnly = false)`
- `randomAsciiWords(lang = 'en', wordlist = 'best', nwords = 5, bitsPerWord = 12)`
- Frequency conversions and number helpers in `dist/index.d.ts`.

`en` and English locale tags are supported. Other languages throw explicitly.
`best` selects `large`; `combined` aliases `small`. The large list reaches Zipf 1;
the small list reaches Zipf 3. Unknown lookups return the supplied minimum, as
upstream does. An absent word is not evidence that its true frequency is zero.
The added `hasWord` checks all normalized lookup tokens for dictionary membership.

Intentional differences: returned dictionaries/buckets are defensive copies;
`availableLanguages()` returns embedded asset IDs instead of filesystem paths;
Node-specific `getDataDir` and `getDataPath` are omitted. Invalid languages,
wordlists, and invalid frequency minimums throw. No Chinese/native tokenizers
are bundled. `Intl.Segmenter` tokenization can differ between runtime versions;
this does not claim full equivalence to Python's tokenizer.

## Chrome extension verification

`examples/extension` is a minimal Manifest V3 extension using the exact built ESM
bundle. It has no permissions or host permissions, and `connect-src 'none'`.
Load it unpacked in `chrome://extensions`, then open its popup. It verifies
lookups in both the page and module service worker. Stop the worker in Chrome's
extension tooling and reopen the popup to verify fresh initialization.

The automated extension test uses a disposable profile and verifies the page,
service worker, and worker restart with network connections forbidden:

```sh
CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:extension
```

Use Chromium or Chrome for Testing with unpacked-extension flag support. The
browser is supplied locally; the test does not download it. A recorded successful
run is in `extension-verification.json`.

For a regular browser smoke check, run `npm run serve:example` and open
http://127.0.0.1:4317. Local script loading is expected; frequency operations
must create zero further resource requests.

## Local development

Node.js 22+ and Chrome 120+ are the current targets. No CI workflow is included.

```sh
npm ci --ignore-scripts
npm run verify
```

`build` verifies pinned input hashes and produces self-contained ESM, CJS and
browser-global bundles. `test` compares every stored word/frequency and sampled
full lookups against the vendored upstream build, tests mutation isolation, and
executes the global bundle with network and dynamic code execution disabled.
`bench` records initialization, repeated lookup, bundle size and heap measurements.

The frequency data is checked in; rebuilding needs no data downloads. The
upstream reference and data provenance are versioned together. Update and compare
them deliberately; do not silently replace the dictionaries.

## Attribution

Code: Apache-2.0. Embedded data: CC BY-SA 4.0 and upstream attribution terms.
Credit belongs to nodewordfreq's author chendahuang, original wordfreq author
Robyn Speer, the SUBTLEX authors, and the other sources listed in [NOTICE.md](NOTICE.md)
and [upstream notices](licenses/wordfreq-NOTICE.md). Keep these files with redistributed
bundles. Data is a snapshot through approximately 2021, not current language usage.
