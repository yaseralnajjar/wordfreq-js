# Attribution and licensing

wordfreq-js is an English browser adaptation of nodewordfreq 0.2.1 by chendahuang
(https://github.com/realchendahuang/nodewordfreq), which ports wordfreq 3.1.1 by
Robyn Speer (https://github.com/rspeer/wordfreq). Frequency, numeric-estimation and
English-tokenization code is adapted from nodewordfreq, under Apache-2.0.
Modifications replace Node filesystem/native loaders with embedded data, restrict
supported languages to English, add initialization/membership helpers, and return
defensive dictionary copies. No affiliation or endorsement is implied.

The English data files are unchanged from nodewordfreq 0.2.1 and match the
wordfreq 3.1.1 files byte for byte. Bundles base64-encode those original gzip files;
they do not change the word frequencies. Data reflects language through about 2021.
See data/provenance.json for source and SHA-256 fingerprints.

The code is Apache-2.0 (LICENSE). The frequency data is distributed under
CC BY-SA 4.0 and the additional source attribution terms reproduced in
licenses/wordfreq-NOTICE.md. Data terms apply to the embedded dataset; the npm
license field describes the code. Retain these notices when redistributing.
Robyn Speer and the SUBTLEX authors, including Marc Brysbaert and colleagues, are
credited here. SUBTLEX is freely available data. The complete upstream notices
also credit Google Books Ngrams, Leeds Internet Corpus, Wikipedia, ParaCrawl,
OPUS/OpenSubtitles and other contributing sources.

The browser bundles include fflate by Arjun Barrett (MIT) and
@msgpack/msgpack by The MessagePack Community (ISC). Their license texts
are included in licenses/. No native or external runtime dependencies are needed.
The pinned unmodified nodewordfreq build in tests/reference/ is for local
conformance testing only and is not included in the distributed package.
