import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const headless = fileURLToPath(new URL('../tools/headless.mjs', import.meta.url));
const fixtures = new URL('./scenarios/', import.meta.url);

function invoke(name) {
  return spawnSync(process.execPath, [headless, fileURLToPath(new URL(name + '.json', fixtures))], {
    encoding: 'utf8',
  });
}

function checkedOutput(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('default board can be beaten with nine fireflies, all lanterns lit and no contact', () => {
  const result = checkedOutput(invoke('island'));
  assert.equal(result.mode, 'won');
  assert.deepEqual(result.lit, ['dao-hong', 'vuon-may', 'doi-trang']);
  assert.equal(result.collected.length, 9);
  assert.equal(result.hits, 0);
  assert.equal(result.player.health, 3);
  assert.equal(result.player.fireflies, 0);
});

test('same input produces byte-identical JSON through file and stdin', () => {
  const file = invoke('island');
  checkedOutput(file);
  const input = readFileSync(new URL('island.json', fixtures), 'utf8');
  const stdin = spawnSync(process.execPath, [headless, '-'], { input, encoding: 'utf8' });
  checkedOutput(stdin);
  assert.equal(stdin.stdout, file.stdout);
});

test('stationary enemy contact loses on the third hit at repeatable ticks', () => {
  const result = checkedOutput(invoke('contact'));
  assert.equal(result.mode, 'lost');
  assert.equal(result.player.health, 0);
  assert.deepEqual(result.events.filter(event => event.kind === 'hit').map(event => event.tick), [1, 121, 241]);
});

test('insufficient fireflies leaves the lantern unlit and preserves inventory', () => {
  const result = checkedOutput(invoke('empty-lantern'));
  assert.equal(result.mode, 'playing');
  assert.equal(result.player.fireflies, 1);
  assert.deepEqual(result.lit, []);
  assert.deepEqual(result.events, [{ tick: 1, kind: 'need-fireflies', id: 'rose' }]);
});

test('invalid scenario returns a nonzero exit and no stdout', () => {
  const result = spawnSync(process.execPath, [headless], {
    input: '{"steps":[{"ticks":-2}]}', encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /ticks/);
});
