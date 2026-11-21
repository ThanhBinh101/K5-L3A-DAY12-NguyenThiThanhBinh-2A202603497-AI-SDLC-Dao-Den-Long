import { createGame, snapshot, stepGame } from './game.mjs';

const controls = new Set(['up', 'down', 'left', 'right', 'light']);
const tickLimit = 100_000;

export function runScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || !Array.isArray(scenario.steps)) {
    throw new TypeError('scenario must have a steps array');
  }
  const game = createGame(scenario.layout);
  let total = 0;
  for (const step of scenario.steps) {
    if (!step || !Number.isSafeInteger(step.ticks) || step.ticks < 1 || step.ticks + total > tickLimit) {
      throw new RangeError(`each ticks value must be positive and the sum must not exceed ${tickLimit}`);
    }
    const keys = step.keys ?? [];
    if (!Array.isArray(keys) || keys.some(key => !controls.has(key))) {
      throw new TypeError('keys must list up, down, left, right or light');
    }
    const input = Object.fromEntries(keys.map(key => [key, true]));
    total += step.ticks;
    for (let index = 0; index < step.ticks; index += 1) {
      stepGame(game, input);
      input.light = false;
      if (game.mode !== 'playing') break;
    }
  }
  return snapshot(game);
}
