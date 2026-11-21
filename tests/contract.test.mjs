import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contract = JSON.parse(readFileSync(join(root, 'game.contract.json'), 'utf8'));
const version = Number(String(contract.contract_version ?? contract.version).match(/1\.(\d+)/)?.[1]);
assert(Number.isInteger(version), 'game.contract.json declares the contract version');

function run(t, { night = 1, ticks = 4, scenario, inputs, snapshotEvery = 1 } = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'dao-contract-'));
  t.after(() => rmSync(folder, { force: true, recursive: true }));
  const out = join(folder, 'output.jsonl');
  const args = [
    'tools/headless.mjs', '--seed', '42', '--night', String(night),
    '--ticks', String(ticks), '--out', out, '--snapshot-every', String(snapshotEvery),
  ];
  if (scenario) {
    const path = join(folder, 'scenario.json');
    writeFileSync(path, JSON.stringify(scenario));
    args.push('--scenario', path);
  }
  if (inputs) {
    const path = join(folder, 'inputs.json');
    writeFileSync(path, JSON.stringify({ frames: inputs }));
    args.push('--inputs', path);
  }
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const raw = readFileSync(out, 'utf8');
  assert(raw.endsWith('\n'), 'JSONL output ends with a newline');
  const records = raw.trimEnd().split('\n').map(line => JSON.parse(line));
  const snapshots = records.filter(record => record.type === 'snapshot');
  const events = records.filter(record => record.type === 'event');
  const end = records.at(-1);
  assert(snapshots.length > 0, 'at least one scheduled snapshot exists');
  assert.equal(end.type, 'end');
  assert.equal(records.filter(record => record.type === 'end').length, 1);
  return { raw, snapshots, events, end };
}

function assertPosition(pos) {
  assert(Array.isArray(pos));
  assert.equal(pos.length, 3);
  assert(pos.every(Number.isFinite));
}

test('file-based headless emits deterministic JSONL with an end record', t => {
  const first = run(t);
  const second = run(t);
  assert.equal(first.raw, second.raw);
  const { snapshots, end } = first;
  assert.equal(end.ticks, 4);
  assert.deepEqual(snapshots.map(snapshot => snapshot.tick), [0, 1, 2, 3, 4]);
  assert.equal(end.score, snapshots.at(-1).score);
  assert.equal(end.state, snapshots.at(-1).state);
  for (const snapshot of snapshots) {
    assert(Number.isInteger(snapshot.tick));
    assert(Number.isInteger(snapshot.sim_tick));
    assert(Number.isFinite(snapshot.time_left_s));
    assert(Number.isInteger(snapshot.score));
    assert(Number.isInteger(snapshot.motes_active));
    assertPosition(snapshot.player.pos);
    assert(Number.isInteger(snapshot.player.flames));
    assert(Number.isInteger(snapshot.player.carried));
    assert.equal(snapshot.lanterns.length, 5);
    assert.equal(new Set(snapshot.lanterns.map(lantern => lantern.id)).size, 5);
    for (const lantern of snapshot.lanterns) {
      assertPosition(lantern.pos);
      assert.equal(typeof lantern.lit, 'boolean');
      assert(Number.isInteger(lantern.deposited));
    }
    for (const shade of snapshot.shades) {
      assertPosition(shade.pos);
      assert.equal(typeof shade.state, 'string');
    }
  }
});

const isolated = {
  random_motes: false,
  random_shades: false,
  motes: [],
  shades: [],
};
const optionalHazards = version >= 1 ? { random_drifters: false, wind_enabled: false } : {};

test('camera-relative movement persists and is independent of snapshot cadence', t => {
  const scenario = { ...isolated, ...optionalHazards, player: { pos: [0, 0, 0] } };
  const inputs = [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }];
  const every = run(t, { ticks: 12, scenario, inputs });
  const sparse = run(t, { ticks: 12, scenario, inputs, snapshotEvery: 3 });
  const [x, , z] = every.snapshots.at(-1).player.pos;
  assert(x > 0.5, 'camera yaw turns forward movement toward +X');
  assert(Math.abs(z) <= 0.001);
  assert.deepEqual(sparse.snapshots.map(snapshot => snapshot.tick), [0, 3, 6, 9, 12]);
  assert.deepEqual(sparse.snapshots.at(-1), every.snapshots.at(-1));
});

test('scenario pickup and partial deposit produce the required event payloads', t => {
  const scenario = {
    ...isolated,
    ...optionalHazards,
    player: { pos: [0, 0, 0], carried: 1, flames: 3 },
    motes: [[0, 0, 0]],
    lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 0 }],
  };
  const { events, snapshots } = run(t, {
    scenario,
    inputs: [{ tick: 1, interact: true }],
  });
  assert.deepEqual(events.filter(event => event.name === 'mote_picked'), [{
    type: 'event', tick: 1, name: 'mote_picked', data: { carried: 2 },
  }]);
  assert.deepEqual(events.filter(event => event.name === 'deposit'), [{
    type: 'event', tick: 2, name: 'deposit', data: { lantern_id: 'L1', amount: 2, deposited: 2 },
  }]);
  const last = snapshots.at(-1);
  assert.equal(last.player.carried, 0);
  assert.equal(last.lanterns.find(lantern => lantern.id === 'L1').lit, false);
});

test('the final lantern follows the versioned victory rule', t => {
  const initial = run(t, { ticks: 1 }).snapshots[0];
  const lanterns = initial.lanterns.map(({ id }, index) => index === 0
    ? { id, pos: [0, 0, 0], deposited: 8 }
    : { id, lit: true, deposited: 10, ...(version >= 2 ? { fuel: 100, ever_lit: true } : {}) });
  const scenario = {
    ...isolated, ...optionalHazards, lanterns,
    player: { pos: [0, 0, 0], carried: 2 },
  };
  const { end, events, snapshots } = run(t, { scenario, inputs: [{ tick: 0, interact: true }] });
  assert(snapshots.at(-1).lanterns.every(lantern => lantern.lit));
  const lit = events.find(event => event.name === 'lantern_lit');
  assert.equal(lit.data.lantern_id, lanterns[0].id);
  if (version < 2) {
    assert.equal(end.state, 'won');
    assert.deepEqual(events.at(-1).data, { result: 'won', reason: 'all_lit' });
  } else {
    assert.equal(end.state, 'playing');
    assert.equal(lit.data.relight, false);
    assert(!events.some(event => event.name === 'game_over'));
  }
});

test('malformed flags fail with contract exit code 2', () => {
  const result = spawnSync(process.execPath, ['tools/headless.mjs', '--ticks', '-1'], {
    cwd: root, encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 2);
});

if (version >= 1) {
  test('pause advances wall ticks while holding simulation counters steady', t => {
    const scenario = { ...isolated, ...optionalHazards, player: { pos: [0, 0, 0] } };
    const { snapshots } = run(t, {
      scenario,
      ticks: 8,
      inputs: [
        { tick: 0, move: [0, 1] },
        { tick: 2, pause: true },
        { tick: 3, pause: false },
        { tick: 6, pause: true },
      ],
    });
    const [beforePause, ...paused] = snapshots.slice(2, 7);
    for (const snapshot of paused) {
      assert.equal(snapshot.sim_tick, beforePause.sim_tick);
      assert.equal(snapshot.time_left_s, beforePause.time_left_s);
      assert.deepEqual(snapshot.player.pos, beforePause.player.pos);
    }
    assert(snapshots.at(-1).sim_tick > beforePause.sim_tick);
  });

  test('published night layouts and v1.1 snapshot fields are present', t => {
    const expected = [
      [0, 0, 25],
      [23.8, 0, 7.7],
      [14.7, 0, -20.2],
      [-14.7, 0, -20.2],
      [-23.8, 0, 7.7],
    ];
    for (const night of [1, 2, 3]) {
      const { snapshots } = run(t, { night });
      const snapshot = snapshots[0];
      assert.equal(snapshot.night, night);
      assert.equal(snapshot.lanterns.length, night + 4);
      assert.equal(typeof snapshot.wind.active, 'boolean');
      assert(Number.isFinite(snapshot.wind.dir_deg));
      assertPosition(snapshot.player.vel);
      for (const field of ['grounded', 'invuln']) {
        assert.equal(typeof snapshot.player[field], 'boolean');
      }
      for (const field of ['dash_cd_s', 'pulse_cd_s', 'charm_s']) {
        assert(Number.isFinite(snapshot.player[field]));
      }
      for (const field of ['motes', 'drifters', 'charms']) {
        assert(Array.isArray(snapshot[field]));
      }
      if (night === 1) {
        for (const point of expected) {
          assert(snapshot.lanterns.some(lantern =>
            lantern.pos.every((value, axis) => Math.abs(value - point[axis]) < 0.11)
          ), `missing lantern position ${point.join(',')}`);
        }
      }
    }
  });
}

if (version >= 2) {
  test('fuel and capacity appear in v1.2; Night 1 starts with a four-minute budget', t => {
    const { snapshots } = run(t);
    const snapshot = snapshots[0];
    assert(snapshot.time_left_s <= 240 && snapshot.time_left_s > 239.9);
    assert.equal(snapshot.player.capacity, 10);
    for (const lantern of snapshot.lanterns) {
      assert(Number.isFinite(lantern.fuel));
      assert.equal(typeof lantern.ever_lit, 'boolean');
      assert(Number.isInteger(lantern.relit_count));
    }
  });
}
