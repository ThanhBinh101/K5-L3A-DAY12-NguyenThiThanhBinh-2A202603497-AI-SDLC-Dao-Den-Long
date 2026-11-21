import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, snapshot, stepGame } from '../src/game.mjs';
import { RULE_VERSION } from '../src/rules.mjs';

const blank = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };

test('jump starts from ground and lands again', () => {
  const game = createGame({ scenario: blank });
  stepGame(game, { jump: true });
  assert.ok(game.player.y > 0);
  for (let i = 0; i < 65; i++) stepGame(game, { jump: true });
  assert.equal(game.player.y, 0);
  assert.equal(game.player.grounded, true);
});

test('pulse costs three motes, pushes four metres over 15 ticks and does not repeat on hold', () => {
  const game = createGame({ scenario: { ...blank, player: { carried: 6 }, shades: [{ id: 'S7', pos: [1, 0.8, 0] }] } });
  for (let i = 0; i < 15; i++) stepGame(game, { pulse: true });
  assert.deepEqual(snapshot(game).shades[0].pos, [5, 0.8, 0]);
  assert.equal(game.enemies[0].state, 'stunned');
  assert.equal(game.player.fireflies, 3);
  assert.deepEqual(game.events.filter(event => event.name === 'pulse').map(event => event.data), [{ stunned_ids: ['S7'] }]);
});

test('enemy contact costs one flame, drops half and starts invulnerability', () => {
  const game = createGame({ scenario: { ...blank, shades: [{ pos: [0, 0.8, 0] }], player: { carried: 9 } } });
  stepGame(game);
  assert.equal(game.player.health, 2);
  assert.equal(game.player.fireflies, 5);
  assert.equal(game.fireflies.length, 4);
  assert.equal(game.player.invuln, 90);
});

if (RULE_VERSION >= 11) {
  test('dash travels 2.8m over 12 ticks and holding the button never retriggers', () => {
    const game = createGame({ scenario: blank });
    for (let i = 0; i < 12; i++) stepGame(game, { dash: true });
    assert.equal(snapshot(game).player.pos[2], 2.8);
    for (let i = 0; i < 110; i++) stepGame(game, { dash: true });
    assert.equal(game.events.filter(event => event.name === 'dash').length, 1);
  });

  test('fall ignores invulnerability and respawn restores canonical start after 60 ticks', () => {
    const game = createGame({ scenario: { ...blank, player: { pos: [41, -10.1, 0], carried: 8, invuln_ticks: 99 } } });
    stepGame(game);
    assert.deepEqual(game.event.data, { by: 'fall', flames: 2, dropped: 0, lost: 8 });
    for (let i = 0; i < 60; i++) stepGame(game);
    assert.deepEqual(snapshot(game).player.pos, [0, 0, 0]);
    assert.equal(game.player.invuln, 90);
  });

  test('a wind charm refreshes the timer and a drifter steals without taking a flame', () => {
    const game = createGame({ night: 2, scenario: { ...blank,
      player: { carried: 6, invuln_ticks: 90 }, charms: [{ pos: [0, 0, 0] }],
      drifters: [{ id: 'D5', pos: [0, 0, 0] }] } });
    stepGame(game);
    assert.equal(game.player.health, 3);
    assert.equal(game.player.fireflies, 3);
    assert.equal(game.player.charm, 600);
    assert.equal(game.drifters[0].state, 'flee');
    assert.ok(game.events.some(event => event.name === 'drifter_steal'));
  });
}

if (RULE_VERSION >= 12) {
  test('lantern expires at zero and relights for five, growing carrying capacity', () => {
    const game = createGame({ scenario: { ...blank,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 1/60 }],
      player: { carried: 5 } } });
    stepGame(game, { interact: true });
    assert.deepEqual(game.events.map(event => event.name).slice(-3), ['lantern_out', 'deposit', 'lantern_lit']);
    assert.equal(game.score, 65);
    assert.equal(snapshot(game).player.capacity, 12);
    assert.equal(game.lanterns[0].fuel, 100);
  });

  test('shade drain plus decay consumes one extra five per second and awards stun bonus', () => {
    const game = createGame({ scenario: { ...blank,
      lanterns: [{ id: 'L1', pos: [8, 0, 0], lit: true, fuel: 25 }],
      shades: [{ pos: [8, 0.8, 0], state: 'drain', target_lantern_id: 'L1' }],
      player: { carried: 3 } } });
    for (let i = 0; i < 60; i++) stepGame(game);
    assert.equal(snapshot(game).lanterns[0].fuel, 19);
    assert.ok(game.events.some(event => event.name === 'fuel_drain'));
    for (let i = 0; i < 32; i++) stepGame(game, { right: true });
    stepGame(game, { pulse: true });
    assert.equal(game.score, 15);
  });
}
