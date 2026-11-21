import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, HIT_DELAY_TICKS, SPEED, stepGame } from '../src/game.mjs';

function safeIsland(options = {}) {
  return createGame({ player: { x: 0, z: 0 }, fireflies: [], lanterns: [], enemies: [], ...options });
}

test('cardinal and diagonal movement both travel at the configured speed', () => {
  for (const input of [{ up: true }, { right: true, up: true }]) {
    const game = safeIsland();
    for (let tick = 0; tick < 60; tick += 1) stepGame(game, input);
    assert.ok(Math.abs(Math.hypot(game.player.x, game.player.z) - SPEED) < 1e-10);
    assert.ok(game.player.z < 0);
  }
});

test('movement stops on the shoreline', () => {
  const game = safeIsland({ radius: 3 });
  for (let tick = 0; tick < 300; tick += 1) stepGame(game, { down: true });
  assert.ok(Math.abs(game.player.z - 2.45) < 1e-10);
});

test('walking over a firefly twice collects it only once', () => {
  const game = safeIsland({ fireflies: [{ id: 'gold', x: 0, z: 0 }] });
  for (let tick = 0; tick < 60; tick += 1) stepGame(game);
  assert.equal(game.player.fireflies, 1);
  assert.deepEqual(game.events, [{ tick: 1, kind: 'collect', id: 'gold' }]);
});

test('interaction outside the reach leaves the lantern and inventory intact', () => {
  const game = safeIsland({
    player: { x: 0, z: 0, fireflies: 3 },
    lanterns: [{ x: 0, z: 2, cost: 1 }],
  });
  stepGame(game, { light: true });
  assert.equal(game.lanterns[0].lit, false);
  assert.equal(game.player.fireflies, 3);
});

test('lighting spends its cost once and only the final lantern wins', () => {
  const game = safeIsland({
    player: { x: 0, z: 0, fireflies: 4 },
    lanterns: [{ x: 0, z: 0, cost: 2 }, { x: 0, z: -5, cost: 2 }],
  });
  stepGame(game, { light: true });
  assert.equal(game.mode, 'playing');
  assert.equal(game.player.fireflies, 2);
  stepGame(game, { light: true });
  assert.equal(game.player.fireflies, 2);
  for (let tick = 0; tick < 60; tick += 1) stepGame(game, { up: true });
  stepGame(game, { light: true });
  assert.equal(game.player.fireflies, 0);
  assert.equal(game.mode, 'won');
  const finalTick = game.tick;
  stepGame(game, { down: true });
  assert.equal(game.tick, finalTick);
});

test('enemy contact respects invulnerability and ends the game when health is depleted', () => {
  const game = safeIsland({
    player: { x: 0, z: 0, health: 2 },
    enemies: [{ x: 0, z: 0 }],
  });
  stepGame(game);
  assert.equal(game.player.health, 1);
  for (let tick = 0; tick < HIT_DELAY_TICKS - 1; tick += 1) stepGame(game);
  assert.equal(game.player.health, 1);
  stepGame(game);
  assert.equal(game.player.health, 0);
  assert.equal(game.mode, 'lost');
});

test('new games reset state and invalid positions are rejected', () => {
  const game = createGame();
  stepGame(game);
  assert.equal(createGame().tick, 0);
  assert.throws(() => createGame({ player: { z: 99 } }), /island/);
  assert.throws(() => safeIsland({ lanterns: [{ x: 0, z: 0, cost: -1 }] }), /positive integer/);
});
