import { RULE_VERSION } from './rules.mjs';

const keys = ['jump', 'interact', 'pulse', ...(RULE_VERSION >= 11 ? ['dash', 'pause'] : [])];

const invalid = message => { throw new TypeError(message); };
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite);
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const optional = (source, key, predicate) => {
  if (Object.hasOwn(source, key) && !predicate(source[key])) invalid(`invalid ${key}`);
};

export function validateInputs(data) {
  if (!record(data) || !Array.isArray(data.frames)) invalid('inputs must contain a frames array');
  let previous = -1;
  for (const frame of data.frames) {
    if (!record(frame) || !nonnegative(frame.tick) || frame.tick <= previous) invalid('frame ticks must increase strictly');
    if (Object.keys(frame).some(key => !['tick', 'move', 'cam_yaw_deg', ...keys].includes(key))) invalid('unknown input field');
    optional(frame, 'move', value => vector(value, 2) && value.every(component => Math.abs(component) <= 1));
    optional(frame, 'cam_yaw_deg', Number.isFinite);
    for (const key of keys) optional(frame, key, value => typeof value === 'boolean');
    previous = frame.tick;
  }
  return data.frames;
}

export function validateScenario(data, night) {
  if (!record(data)) invalid('scenario must be an object');
  const identity = value => typeof value === 'string' && value.length > 0;
  const boolean = value => typeof value === 'boolean';
  for (const key of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) optional(data, key, boolean);
  optional(data, 'time_left_s', value => Number.isFinite(value) && value >= 0);
  optional(data, 'player', record);
  const p = data.player ?? {};
  optional(p, 'pos', value => vector(value, 3));
  for (const key of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
    optional(p, key, nonnegative);
  }
  optional(data, 'motes', value => Array.isArray(value) && value.every(item => vector(item, 3)));
  optional(data, 'shades', value => Array.isArray(value) && value.every(item => record(item) && vector(item.pos, 3)));
  optional(data, 'drifters', value => Array.isArray(value) && value.every(item => record(item) && vector(item.pos, 3)));
  optional(data, 'charms', value => Array.isArray(value) && value.every(record));
  optional(data, 'lanterns', value => Array.isArray(value) && value.every(record));
  const expectedLamps = night + 4;
  const seen = new Set();
  for (const item of data.lanterns ?? []) {
    if (!Array.from({ length: expectedLamps }, (_, n) => `L${n + 1}`).includes(item.id) || seen.has(item.id)) invalid('unknown or repeated lantern id');
    seen.add(item.id);
    optional(item, 'pos', value => vector(value, 3));
    optional(item, 'deposited', value => nonnegative(value) && value <= 10);
    optional(item, 'lit', boolean);
    optional(item, 'ever_lit', boolean);
    optional(item, 'fuel', value => Number.isFinite(value) && value >= 0 && value <= 100);
  }
  for (const item of [...(data.shades ?? []), ...(data.drifters ?? []), ...(data.charms ?? [])]) {
    optional(item, 'id', identity);
    optional(item, 'pos', value => vector(value, 3));
    optional(item, 'state', identity);
    optional(item, 'state_ticks_left', nonnegative);
    optional(item, 'target_lantern_id', identity);
    optional(item, 'stolen', nonnegative);
    optional(item, 'available', boolean);
    optional(item, 'respawn_ticks', nonnegative);
  }
  return data;
}
