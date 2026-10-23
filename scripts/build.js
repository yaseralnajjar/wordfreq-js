import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const provenance = JSON.parse(readFileSync('data/provenance.json', 'utf8'));
for (const [name, expected] of Object.entries(provenance.sha256)) {
  const actual = createHash('sha256').update(readFileSync(name)).digest('hex');
  if (actual !== expected) throw new Error(`Upstream data changed: ${name}`);
}
mkdirSync('dist', { recursive: true });
for (const [format, outfile] of [['esm', 'dist/index.js'], ['cjs', 'dist/index.cjs'], ['iife', 'dist/wordfreq.global.js']]) {
  const result = await build({ entryPoints: ['src/index.js'], bundle: true, platform: 'browser',
    target: ['chrome120', 'node22'], format, outfile, globalName: format === 'iife' ? 'Wordfreq' : undefined,
    loader: { '.gz': 'base64' }, minify: true, legalComments: 'inline', metafile: true,
    banner: { js: '/*! wordfreq-js: Apache-2.0 code; embedded data CC-BY-SA-4.0 and upstream terms. See NOTICE.md. */' } });
  if (result.metafile.outputs[outfile].imports.length) throw new Error('Bundle must be self-contained');
}
copyFileSync('src/index.d.ts', 'dist/index.d.ts');
copyFileSync('node_modules/fflate/LICENSE', 'licenses/fflate-LICENSE.txt');
copyFileSync('node_modules/@msgpack/msgpack/LICENSE', 'licenses/msgpack-LICENSE.txt');
// The fixture uses the exact shipped bundle, with no source maps or runtime assets.
copyFileSync('dist/index.js', 'examples/extension/wordfreq.js');
console.log('Built self-contained ESM, CommonJS and browser-global bundles.');
