import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('packed package installs offline without runtime dependencies or source files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'wordfreq-consumer-'));
  try {
    const output = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { encoding: 'utf8' }));
    const packed = (Array.isArray(output) ? output : Object.values(output))[0];
    assert(packed.files.some(f => f.path === 'dist/index.js'));
    assert(packed.files.some(f => f.path === 'licenses/wordfreq-NOTICE.md'));
    assert(!packed.files.some(f => /^(src|tests|node_modules)\//.test(f.path)));
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    execFileSync('npm', ['install', join(directory, packed.filename), '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory });
    const value = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { zipfFrequency, isInitialized } from '@yaseralnajjar/wordfreq-js';
      if (isInitialized()) throw new Error('Initialization must be lazy');
      globalThis.fetch = () => { throw new Error('Network is forbidden'); };
      process.stdout.write(String(zipfFrequency('the', 'en')));
    `], { cwd: directory, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } });
    assert.equal(value, '7.73');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
