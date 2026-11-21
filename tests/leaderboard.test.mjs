import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createLeaderboard } from '../tools/leaderboard.mjs';

test('leaderboard qualifies names, sorts score and ties, keeps 10, persists, and exports contract wrapper', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'lantern-leaderboard-test-'));
  const storage = join(folder, 'store.json');
  const output = join(folder, 'result.json');
  const board = createLeaderboard(storage);
  const record = { name: 'May_1', score: 70, nights_won: 1, seed: 42 };
  try {
    assert.deepEqual(await board.list(), []);
    for (const name of ['ab', 'Mây', 'longname12345', 'has space', 'may\n']) {
      assert.throws(() => board.append({ ...record, name }), TypeError);
    }

    await Promise.all(Array.from({ length: 12 }, (_, index) => board.append({
      ...record,
      name: `May_${index}`,
      achieved_at: `2026-01-01T00:00:${String(20 - index).padStart(2, '0')}Z`,
    })));
    await board.append({ ...record, name: 'BigScore', score: 299, nights_won: 3 });

    const saved = await createLeaderboard(storage).list();
    assert.equal(saved.length, 10);
    assert.deepEqual(saved.slice(0, 4).map(row => row.name), ['BigScore', 'May_11', 'May_10', 'May_9']);
    assert.deepEqual(Object.keys(saved[0]), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
    assert.equal(saved[0].nights_won, 3);
    assert.equal(saved[1].achieved_at, '2026-01-01T00:00:09.000Z');

    await board.exportTo(output);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { entries: saved });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
