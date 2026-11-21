#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { arch, platform, release, tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name) => {
  const index = process.argv.indexOf('--' + name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const usage = 'Usage: node tools/bench.mjs --seed 42 --duration 30 --out bench.json';
const root = new URL('../', import.meta.url);
const os = `${platform()} ${release()} ${arch()}`;

function findBrowser() {
  if (process.env.DAY12_BROWSER) return process.env.DAY12_BROWSER;
  if (platform() === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const candidates = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(existsSync) ?? 'chromium';
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on('data', (part) => {
      length += part.length;
      if (length < 8192) chunks.push(part);
    });
    request.on('end', () => {
      if (length >= 8192) return reject(new Error('Metric payload too large'));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function main() {
  const seed = Number(arg('seed') ?? 42);
  const duration = Number(arg('duration') ?? 30);
  const output = arg('out');
  if (!Number.isSafeInteger(seed) || !Number.isFinite(duration) || duration <= 0 || !output) {
    throw new Error(usage);
  }

  let finish;
  let fail;
  const result = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (request.method === 'POST' && pathname === '/report') {
      try {
        const payload = await readBody(request);
        response.writeHead(204).end();
        if (payload.error) fail(new Error(payload.error));
        else finish({ ...payload, os });
      } catch (error) {
        response.writeHead(400).end();
        fail(error);
      }
      return;
    }

    const file = pathname === '/' ? 'web/bench.html' : pathname.slice(1);
    if (!(file === 'web/bench.html' || file === 'web/bench.mjs'
        || /^web\/world[\w-]*\.mjs$/.test(file) || /^src\/[\w-]+\.mjs$/.test(file))) {
      response.writeHead(404).end();
      return;
    }

    try {
      const data = await readFile(new URL(file, root));
      response.writeHead(200, {
        'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
      });
      response.end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  const profile = await mkdtemp(join(tmpdir(), 'lantern-island-bench-'));
  let child;
  let timeout;
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = new URL(`http://127.0.0.1:${server.address().port}/`);
    url.search = new URLSearchParams({
      seed, duration, launchMs: Date.now(),
    });
    child = spawn(findBrowser(), [
      `--app=${url.href}`, `--user-data-dir=${profile}`,
      '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--disable-background-networking', '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--window-size=1280,720', '--force-device-scale-factor=1',
      '--disable-frame-rate-limit', '--disable-gpu-vsync',
    ], { stdio: 'ignore' });
    child.once('error', fail);
    child.once('exit', (code) => fail(new Error(`Chrome closed before benchmark completion (${code}).`)));
    timeout = setTimeout(() => fail(new Error('Benchmark window did not report results.')), (duration + 35) * 1000);
    const metrics = await result;
    await writeFile(output, JSON.stringify(metrics, null, 2) + '\n');
    console.log(JSON.stringify(metrics, null, 2));
    if (metrics.avg_fps < 60 || metrics.p1_low_fps < 30 || metrics.load_ms > 10000) {
      process.exitCode = 1;
    }
  } finally {
    clearTimeout(timeout);
    server.closeAllConnections();
    server.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      const closed = new Promise((resolve) => child.once('close', resolve));
      child.kill();
      const force = setTimeout(() => child.kill('SIGKILL'), 2500);
      await closed;
      clearTimeout(force);
    }
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
