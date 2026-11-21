import { performance } from 'node:perf_hooks';
import { createGame, stepGame } from '../src/game.mjs';

const started = performance.now();
const game = createGame();
while (game.mode === 'playing') stepGame(game);
console.log(JSON.stringify({ ticks: game.tick, state: game.mode, elapsed_ms: performance.now() - started }));
