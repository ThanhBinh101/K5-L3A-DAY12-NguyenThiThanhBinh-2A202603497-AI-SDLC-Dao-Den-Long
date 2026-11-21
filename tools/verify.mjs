#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const proof = process.env.DAY12_PROOF_DIR
  ? pathToFileURL(resolve(process.env.DAY12_PROOF_DIR) + sep)
  : new URL('docs/proof/', root);
const names = ['island', 'contact', 'empty-lantern'];
const runtimeOptions = { cwd: fileURLToPath(root), encoding: 'utf8' };

function node(args) {
  const result = spawnSync(process.execPath, args, runtimeOptions);
  if (result.error) throw result.error;
  return result;
}

async function fingerprint() {
  const hash = createHash('sha256');
  for (const file of ['package.json', 'tools/headless.mjs', 'tools/serve.mjs', 'tools/verify.mjs']) {
    hash.update(file + '\0');
    hash.update(await readFile(new URL(file, root)));
  }
  for (const folder of ['src/', 'web/', 'tests/', 'tests/scenarios/']) {
    const base = new URL(folder, root);
    for (const entry of (await readdir(base, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (!entry.isFile()) continue;
      hash.update(folder + entry.name + '\0');
      hash.update(await readFile(new URL(entry.name, base)));
    }
  }
  return hash.digest('hex');
}

await mkdir(proof, { recursive: true });
const previousOutputs = ['run.json', ...names.map(name => name + '.json')];
await Promise.all(previousOutputs.map(name => rm(new URL(name, proof), { force: true })));
const tests = node(['--test', 'tests/game.test.mjs', 'tests/headless.test.mjs']);
const output = tests.stdout + tests.stderr;
process.stdout.write(output);
await writeFile(new URL('node-test.txt', proof), output);
if (tests.status !== 0) {
  process.exit(tests.status ?? 1);
}

const results = [];
for (const name of names) {
  const args = ['tools/headless.mjs', `tests/scenarios/${name}.json`];
  const run = node(args);
  const replay = node(args);
  if (run.status !== 0 || replay.status !== 0 || run.stdout !== replay.stdout) {
    throw new Error(`scenario ${name} failed or produced different replay output`);
  }
  await writeFile(new URL(name + '.json', proof), run.stdout);
  const result = JSON.parse(run.stdout);
  results.push({
    scenario: name, repeatedIdentically: true, mode: result.mode,
    ticks: result.ticks, lit: result.lit.length, hits: result.hits,
  });
}

const evidence = {
  node: process.version,
  platform: platform(), architecture: arch(), osRelease: release(), cpu: cpus()[0]?.model,
  sourceAndTestsSha256: await fingerprint(),
  results,
};
await writeFile(new URL('run.json', proof), JSON.stringify(evidence, null, 2) + '\n');
for (const result of results) {
  console.log(`${result.scenario}: ${result.mode} · ${result.ticks} ticks · ${result.lit} lit · ${result.hits} hits · replay identical`);
}
