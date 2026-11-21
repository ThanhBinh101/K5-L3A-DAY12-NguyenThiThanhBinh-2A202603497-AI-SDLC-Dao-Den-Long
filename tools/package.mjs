#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cp, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const output = fileURLToPath(new URL('dao-den-long-preview.tar.gz', dist));
const stage = await mkdtemp(join(tmpdir(), 'dao-den-long-'));
try {
  await mkdir(dist, { recursive: true });
  const bundle = join(stage, 'dao-den-long');
  await mkdir(join(bundle, 'tools'), { recursive: true });
  for (const name of ['web', 'src']) {
    await cp(new URL(name + '/', root), join(bundle, name), { recursive: true });
  }
  await copyFile(new URL('web/index.html', root), join(bundle, 'index.html'));
  await copyFile(new URL('tools/serve.mjs', root), join(bundle, 'tools', 'serve.mjs'));
  for (const name of ['LICENSE', 'CREDITS.md']) {
    await copyFile(new URL(name, root), join(bundle, name));
  }
  await writeFile(join(bundle, 'CHAY-GAME.txt'),
    'Đảo Đèn Lồng — bản preview\n\n' +
    'Mở terminal ở thư mục đã giải nén. Cần Node.js 20 trở lên.\n' +
    'Chạy: node tools/serve.mjs\n' +
    'Mở http://127.0.0.1:4173 trong trình duyệt có WebGL2.\n' +
    'Bạn cũng có thể đưa cả thư mục lên một máy chủ web tĩnh.\n');
  const archive = spawnSync('tar', ['-czf', output, '-C', stage, 'dao-den-long'], { stdio: 'inherit' });
  if (archive.error) throw archive.error;
  if (archive.status !== 0) throw new Error('tar could not create the archive');
  console.log(output);
} finally {
  await rm(stage, { recursive: true, force: true });
}
