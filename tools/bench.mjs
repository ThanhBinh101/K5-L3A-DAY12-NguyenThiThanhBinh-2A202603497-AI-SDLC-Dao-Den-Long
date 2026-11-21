#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { arch, cpus, platform } from 'node:os';
import { performance } from 'node:perf_hooks';
import { runScenario } from '../src/scenario.mjs';

const scenario = JSON.parse(await readFile(new URL('../tests/scenarios/island.json', import.meta.url)));
const iterations = Number(process.argv[2] ?? 5_000);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100_000) {
  throw new RangeError('usage: node tools/bench.mjs [1..100000]');
}
for (let index = 0; index < 200; index += 1) runScenario(scenario);
let simulatedTicks = 0;
const start = performance.now();
for (let index = 0; index < iterations; index += 1) {
  const result = runScenario(scenario);
  assert.equal(result.mode, 'won');
  simulatedTicks += result.ticks;
}
const elapsed = performance.now() - start;
const report = {
  workload: 'default-island winning route, includes setup and snapshot, excludes file I/O',
  node: process.version,
  platform: platform(),
  arch: arch(),
  cpu: cpus()[0]?.model,
  iterations,
  simulatedTicks,
  totalMs: Number(elapsed.toFixed(2)),
  ticksPerSecond: Math.round(simulatedTicks * 1_000 / elapsed),
};
console.log(JSON.stringify(report, null, 2));
