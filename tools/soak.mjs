#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createGame, stepGame } from '../src/game.mjs';
import { makeRandom } from '../src/maps.mjs';

const arg = (name) => {
  const index = process.argv.indexOf('--' + name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const seed = Number(arg('seed') ?? 7);
const nights = Number(arg('nights') ?? 10);
const output = arg('out');
const maximumTicks = 60 * 60 * 15;

function memoryMB() {
  return process.memoryUsage.rss() / (1024 * 1024);
}

function runNight(game, inputSeed) {
  const random = makeRandom(inputSeed);
  const move = [0, 0];
  const input = { move, jump: false, dash: false, pulse: false, interact: false };
  for (let tick = 0; tick < maximumTicks; tick++) {
    if (tick % 30 === 0) {
      const angle = random() * 2 * Math.PI;
      move[0] = Math.cos(angle);
      move[1] = Math.sin(angle);
    }
    input.jump = random() < 0.05;
    input.dash = random() < 0.03;
    input.pulse = random() < 0.02;
    input.interact = random() < 0.10;
    stepGame(game, input);
    if (game.mode === 'won' || game.mode === 'lost') return game.mode;
  }
  throw new Error(`Night did not reach a terminal result within ${maximumTicks} simulated ticks.`);
}

async function main() {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(nights) || nights < 1 || !output) {
    throw new Error('Usage: node tools/soak.mjs --seed 7 --nights 10 --out soak.json');
  }
  const started = performance.now();
  const results = [];
  let crashes = 0;
  let game = createGame({ night: 1, seed });
  const memStart = memoryMB();
  for (let index = 0; index < nights; index++) {
    const night = index % 3 + 1;
    const nightSeed = seed + index;
    try {
      if (index > 0) game = createGame({ night, seed: nightSeed });
      results.push(runNight(game, nightSeed));
    } catch (error) {
      console.error(`Run ${index + 1}, Night ${night}:`, error);
      results.push('crash');
      crashes++;
    }
  }

  game = createGame({ night: 1, seed });
  const memEnd = memoryMB();
  const result = {
    nights,
    crashes,
    results,
    mem_start_mb: Number(memStart.toFixed(3)),
    mem_end_mb: Number(memEnd.toFixed(3)),
    duration_s: Number(((performance.now() - started) / 1000).toFixed(4)),
  };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  const growth = (memEnd / memStart - 1) * 100;
  console.log(`Soak · ${nights} đêm · ${crashes} lỗi · RSS tăng ${growth.toFixed(2)}%`);
  if (crashes !== 0 || growth > 20) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
