import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

for (const folder of ['src', 'web', 'tests']) {
  for (const name of readdirSync(folder).filter(file => file.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', `${folder}/${name}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
