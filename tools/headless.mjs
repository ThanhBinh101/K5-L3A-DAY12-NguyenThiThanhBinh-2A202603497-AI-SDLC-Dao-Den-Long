#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createGame, snapshot, stepGame } from '../src/game.mjs';
import { RULE_VERSION } from '../src/rules.mjs';
import { validateInputs, validateScenario } from '../src/scenario.mjs';

const string = { type: 'string' };
const options = { seed: string, night: string, scenario: string, inputs: string, ticks: string,
  out: string, 'snapshot-every': { type: 'string', default: '10' } };

function whole(raw, name, min, max = Number.MAX_SAFE_INTEGER) {
  if (!raw || !/^-?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) ||
      Number(raw) < min || Number(raw) > max) throw new RangeError(`invalid --${name}`);
  return Number(raw);
}

async function json(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

async function main() {
  const { values } = parseArgs({ options });
  const seed = whole(values.seed, 'seed', Number.MIN_SAFE_INTEGER);
  const night = whole(values.night, 'night', 1, RULE_VERSION === 10 ? 1 : 3);
  const ticks = whole(values.ticks, 'ticks', 0);
  const every = whole(values['snapshot-every'], 'snapshot-every', 1);
  if (!values.out) throw new Error('missing --out');
  let scenario = {};
  let frames = [];
  try {
    if (values.scenario) scenario = validateScenario(await json(values.scenario), night);
    if (values.inputs) frames = validateInputs(await json(values.inputs));
  } catch (error) {
    process.exitCode = 2;
    throw error;
  }
  const game = createGame({ night, seed, scenario });
  const output = [JSON.stringify(snapshot(game))];
  const input = {};
  let frame = 0;
  for (let tick = 0; tick < ticks && !['won', 'lost'].includes(game.mode); tick += 1) {
    if (frames[frame]?.tick === tick) Object.assign(input, frames[frame++]);
    const eventIndex = game.events.length;
    stepGame(game, input);
    for (let index = eventIndex; index < game.events.length; index += 1) output.push(JSON.stringify(game.events[index]));
    if (game.tick % every === 0) output.push(JSON.stringify(snapshot(game)));
  }
  output.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.mode, score: game.score }));
  await writeFile(values.out, output.join('\n') + '\n');
}

try {
  await main();
} catch (error) {
  process.stderr.write(`headless: ${error.message}\n`);
  process.exitCode ??= (error.code === "EACCES" || error.code === "ENOSPC") ? 1 : 2;
}
