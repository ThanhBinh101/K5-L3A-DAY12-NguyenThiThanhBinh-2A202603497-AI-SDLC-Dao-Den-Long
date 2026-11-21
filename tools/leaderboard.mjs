import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const namePattern = /^[A-Za-z0-9_]{3,12}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function newestEntry(input) {
  if (!input || typeof input !== 'object' || typeof input.name !== 'string' || !namePattern.test(input.name)) {
    throw new TypeError('Tên cần 3–12 ký tự gồm A–Z, a–z, 0–9 hoặc _.');
  }
  if (!Number.isSafeInteger(input.score) || input.score < 0
      || !Number.isSafeInteger(input.nights_won) || input.nights_won < 0 || input.nights_won > 3
      || !Number.isSafeInteger(input.seed)) {
    throw new TypeError('Điểm, số đêm thắng hoặc seed không hợp lệ.');
  }
  const timestamp = input.achieved_at ?? new Date().toISOString();
  if (typeof timestamp !== 'string' || !timestampPattern.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) {
    throw new TypeError('Thời điểm phải theo ISO 8601 và có múi giờ.');
  }
  return {
    name: input.name,
    score: input.score,
    nights_won: input.nights_won,
    achieved_at: new Date(timestamp).toISOString(),
    seed: input.seed,
  };
}

async function writeJsonAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

export function createLeaderboard(file = process.env.DAY12_LEADERBOARD_FILE ?? '.data/leaderboard.json') {
  const path = resolve(file);
  let pending = Promise.resolve();

  async function read() {
    try {
      const data = JSON.parse(await readFile(path, 'utf8'));
      if (!Array.isArray(data)) throw new TypeError('Invalid leaderboard file');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  return {
    list: read,
    append(input) {
      const entry = newestEntry(input);
      const write = pending.then(async () => {
        const entries = await read();
        entries.push(entry);
        entries.sort((first, second) =>
          second.score - first.score || first.achieved_at.localeCompare(second.achieved_at));
        const top = entries.slice(0, 10);
        await writeJsonAtomic(path, top);
        return top;
      });
      pending = write.catch(() => {});
      return write;
    },
    async exportTo(output) {
      await writeJsonAtomic(resolve(output), { entries: await read() });
    },
  };
}

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload) + '\n');
}

async function readEntry(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= 4096) chunks.push(chunk);
  }
  if (bytes > 4096) throw new RangeError('Yêu cầu quá lớn.');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function leaderboardRoute(request, response, leaderboard) {
  try {
    if (request.method === 'GET') return json(response, 200, await leaderboard.list());
    if (request.method === 'POST') return json(response, 201, await leaderboard.append(await readEntry(request)));
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Phương thức không được hỗ trợ.' });
  } catch (error) {
    if (error instanceof RangeError) return json(response, 413, { error: error.message });
    if (error instanceof TypeError || error instanceof SyntaxError) return json(response, 400, { error: error.message });
    console.error(error);
    return json(response, 500, { error: 'Không đọc hoặc ghi được bảng xếp hạng.' });
  }
}
