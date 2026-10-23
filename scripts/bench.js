import { performance } from 'node:perf_hooks';
import { statSync, writeFileSync } from 'node:fs';
const before = process.memoryUsage().heapUsed;
const importStart = performance.now();
const api = await import('../dist/index.js');
const importMs = performance.now() - importStart;
const coldStart = performance.now();
const score = api.zipfFrequency('unreadable', 'en');
const coldMs = performance.now() - coldStart;
const warmStart = performance.now();
for (let i = 0; i < 10000; i++) api.zipfFrequency('unreadable', 'en');
const measured = { runtime: process.version, bundle_bytes: statSync('dist/index.js').size,
  import_ms: importMs, first_lookup_ms: coldMs, warm_10000_lookups_ms: performance.now() - warmStart,
  heap_growth_bytes: process.memoryUsage().heapUsed - before, example: { unreadable: score },
  note: 'One local run, not a performance guarantee; heap growth includes transient allocations before GC.' };
writeFileSync('benchmarks.json', JSON.stringify(measured, null, 2) + '\n');
console.log(JSON.stringify(measured, null, 2));
