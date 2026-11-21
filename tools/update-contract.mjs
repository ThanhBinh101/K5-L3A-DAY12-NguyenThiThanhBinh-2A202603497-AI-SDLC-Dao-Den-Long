import { writeFileSync } from 'node:fs';
import { RULE_VERSION, TUNING } from '../src/rules.mjs';

const contract = {
  contract_version: (RULE_VERSION / 10).toFixed(1),
  team: '2A202603497-NguyenThiThanhBinh',
  build_cmd: 'node tools/build.mjs',
  run_cmd: 'node tools/serve.mjs',
  headless_cmd: 'node tools/headless.mjs',
  ...(RULE_VERSION >= 13 ? { bench_cmd: 'node tools/bench.mjs', soak_cmd: 'node --jitless --max-semi-space-size=1 tools/soak.mjs' } : {}),
  tuning: TUNING,
};
writeFileSync(new URL('../game.contract.json', import.meta.url), JSON.stringify(contract, null, 2) + '\n');
