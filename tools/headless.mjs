#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { runScenario } from '../src/scenario.mjs';

async function main() {
  if (process.argv.length > 3) throw new Error('usage: node tools/headless.mjs [scenario.json|-]');
  const path = process.argv[2];
  let raw = '';
  if (path && path !== '-') raw = await readFile(path, 'utf8');
  else for await (const chunk of process.stdin.setEncoding('utf8')) raw += chunk;
  process.stdout.write(JSON.stringify(runScenario(JSON.parse(raw))) + '\n');
}

try {
  await main();
} catch (error) {
  process.stderr.write(`headless: ${error.message}\n`);
  process.exitCode = 1;
}
