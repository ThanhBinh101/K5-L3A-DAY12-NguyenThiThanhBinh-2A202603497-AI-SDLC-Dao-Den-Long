#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { arch, cpus, platform, release } from 'node:os';
import { RULE_VERSION } from '../src/rules.mjs';

const version = RULE_VERSION / 10;
const path = resolve(process.env.DAY12_PROOF_DIR ?? `docs/proof/phase-${RULE_VERSION - 9}`);
await mkdir(path, { recursive: true });
await rm(join(path, 'run.json'), { force: true });
const cmd = (args, options = {}) => {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return result;
};
const run = cmd(['--test', 'tests/core.test.mjs', 'tests/contract.test.mjs']);
const log = run.stdout + run.stderr;
process.stdout.write(log);
await writeFile(join(path, 'node-test.txt'), log);
if (run.status !== 0) process.exit(run.status ?? 1);
for (const night of RULE_VERSION === 10 ? [1] : [1, 2, 3]) {
  const first = join(path, `night-${night}.jsonl`);
  const second = join(path, `night-${night}-repeat.tmp`);
  const args = ['tools/headless.mjs', '--seed', '42', '--night', String(night),
    '--scenario', 'tests/fixtures/static-scenario.json', '--inputs', 'tests/fixtures/static-inputs.json',
    '--ticks', '150', '--snapshot-every', '10', '--out'];
  try {
    for (const file of [first, second]) {
      const result = cmd([...args, file]);
      assert.equal(result.status, 0, result.stderr);
    }
    const jsonl = await readFile(first);
    assert.deepEqual(jsonl, await readFile(second), `night ${night} replay mismatch`);
    console.log(`Đêm ${night}: kiểm tra lặp cho JSONL trùng byte`);
  } finally { await rm(second, { force: true }); }
}
await writeFile(join(path, 'run.json'), JSON.stringify({
  version: version.toFixed(1), node: process.version, os: platform(), arch: arch(), release: release(),
  cpu: cpus()[0]?.model, repeatedIdentically: true,
}, null, 2) + '\n');
