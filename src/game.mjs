import { getMap, makeRandom, terrain } from './maps.mjs';
import { RULE_VERSION, STEP_MS, TUNING as T } from './rules.mjs';
export { STEP_MS };
export const HIT_DELAY_TICKS = 90;
const step = 1 / 60;
const buttons = ['jump', 'dash', 'pulse', 'pause', 'interact'];
const maxFuel = 6000;
const lowFuel = 1800;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const distance3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const byId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true });
const position = ([x, y, z]) => ({ x, y, z });
const unit = (x, z) => {
  const length = Math.hypot(x, z) || 1;
  return [x / length, z / length];
};
const sortedNear = (origin, items) => items.slice().sort((a, b) =>
  distance(a, origin) - distance(b, origin) || byId(a, b));
const stateSafe = lamp => lamp.lit && (RULE_VERSION < 12 || lamp.fuelUnits >= lowFuel);

function note(g, name, data = {}) {
  const event = { type: 'event', tick: g.tick, name, data };
  g.event = event;
  g.events.push(event);
}

function makeShade(g, spec) {
  return {
    id: spec.id ?? `S${g.ids.shade++}`, ...position(spec.pos), state: spec.state ?? 'wander',
    left: spec.state_ticks_left ?? 0, target: spec.target_lantern_id ?? null,
    pushX: 0, pushZ: 0, pushLeft: 0, expel: 0, drainTicks: 0,
  };
}

function makeMote(g, p, kind = 'random', spot = -1) {
  return { id: `M${g.ids.mote++}`, ...p, kind, spot,
    ttl: kind === 'dropped' ? 480 : null, born: g.simTick, collected: false };
}

function choose(g, options) {
  return options[Math.floor(g.random() * options.length)];
}

function spawnMote(g) {
  const occupied = new Set(g.fireflies.map(mote => mote.spot));
  const spots = g.map.motePoints.map((_, index) => index).filter(index => !occupied.has(index) &&
    !g.fireflies.some(mote => distance3(mote, g.map.motePoints[index]) < 1e-7));
  const spot = choose(g, spots);
  if (spot !== undefined) g.fireflies.push(makeMote(g, g.map.motePoints[spot], 'random', spot));
}

export function createGame({ night = 1, seed = 42, scenario = {} } = {}) {
  const map = getMap(night);
  if (!map || (RULE_VERSION === 10 && night !== 1)) throw new RangeError('unsupported night');
  const duration = T[`night${night}_duration_s`];
  const spawn = night === 3 ? { x: 0, y: 0, z: -9 } : { x: 0, y: 0, z: 0 };
  const options = scenario.player ?? {};
  const start = options.pos ? position(options.pos) : spawn;
  const player = {
    ...start, vx: 0, vy: 0, vz: 0, dir: Math.PI, faceX: 0, faceZ: 1,
    fireflies: options.carried ?? 0, health: options.flames ?? T.flames,
    grounded: Math.abs(terrain(night, start.x, start.z) - start.y) < 1e-7,
    invuln: options.invuln_ticks ?? 0, dashCd: options.dash_cd_ticks ?? 0,
    pulseCd: options.pulse_cd_ticks ?? 0, charm: options.charm_ticks ?? 0,
    successfulLights: options.successful_lights ?? 0, dashLeft: 0, respawn: 0, launch: null,
  };
  const g = {
    night, seed, map, spawn, radius: map.radius, random: makeRandom(seed),
    player, maxHealth: T.flames, lanterns: [], fireflies: [], enemies: [], drifters: [], charms: [],
    tick: 0, simTick: 0, timeTicks: Math.round((scenario.time_left_s ?? duration) * 60),
    timeLeft: scenario.time_left_s ?? duration, score: 0, mode: 'playing', event: null, events: [],
    ids: { mote: 1, shade: 1, drifter: 1 }, held: {}, wind: { active: false, dir_deg: 0 },
    randomMotes: scenario.random_motes ?? true, randomShades: scenario.random_shades ?? true,
    randomDrifters: scenario.random_drifters ?? true, windEnabled: scenario.wind_enabled ?? night === 3,
  };
  const overrides = new Map((scenario.lanterns ?? []).map(lamp => [lamp.id, lamp]));
  g.lanterns = map.lamps.map((pos, index) => {
    const id = `L${index + 1}`;
    const spec = overrides.get(id) ?? {};
    const lit = spec.lit ?? false;
    const ever = spec.ever_lit ?? lit;
    const cost = RULE_VERSION >= 12 && ever && !lit ? 5 : 10;
    const fuelUnits = lit ? Math.round((spec.fuel ?? 100) * 60) : 0;
    return {
      id, ...position(spec.pos ?? pos), lit, cost, deposited: spec.deposited ?? (lit ? cost : 0),
      ever_lit: ever, fuelUnits, fuel: fuelUnits / 60, relit_count: 0,
    };
  });
  if (scenario.motes) g.fireflies = scenario.motes.map(pos => makeMote(g, position(pos)));
  else if (g.randomMotes) for (let i = 0; i < 20; i += 1) spawnMote(g);
  g.enemies = (scenario.shades ?? []).map(spec => makeShade(g, spec));
  while (g.enemies.some(shade => shade.id === `S${g.ids.shade}`)) g.ids.shade += 1;
  g.drifters = (scenario.drifters ?? []).map(spec => ({
    id: spec.id ?? `D${g.ids.drifter++}`, ...position(spec.pos), state: spec.state ?? 'idle',
    stolen: spec.stolen ?? 0, left: spec.state_ticks_left ?? (spec.state === 'flee' ? 240 : 0),
  }));
  g.charms = (scenario.charms ?? map.charms.map(pos => ({ pos }))).map((spec, index) => ({
    id: spec.id ?? `C${index + 1}`, ...position(spec.pos ?? map.charms[index] ?? [0, 0, 0]),
    available: spec.available ?? true, left: spec.respawn_ticks ?? 0,
  }));
  return g;
}

const capacity = g => RULE_VERSION >= 12
  ? Math.min(20, 10 + 2 * g.player.successfulLights) : 10;
export { capacity };

export function nearestLantern(g) {
  const candidates = g.lanterns.filter(lamp => distance(g.player, lamp) <= T.interact_radius &&
    (!lamp.lit || (RULE_VERSION >= 12 && lamp.fuelUnits < maxFuel)));
  return sortedNear(g.player, candidates)[0] ?? null;
}

function updateFuel(g, lamp, value) {
  lamp.fuelUnits = Math.max(0, Math.min(maxFuel, value));
  lamp.fuel = lamp.fuelUnits * step;
  if (lamp.lit && lamp.fuelUnits === 0) {
    lamp.lit = false;
    lamp.deposited = 0;
    lamp.cost = 5;
    note(g, 'lantern_out', { lantern_id: lamp.id });
  }
}

function countdown(g) {
  const p = g.player;
  g.timeTicks = Math.max(0, g.timeTicks - 1);
  g.timeLeft = g.timeTicks * step;
  for (const counter of ['invuln', 'dashCd', 'pulseCd', 'charm']) {
    if (p[counter] > 0) p[counter] -= 1;
  }
  for (const shade of g.enemies) {
    if (shade.left > 0 && --shade.left === 0 &&
      ['stunned', 'recoil', 'spawning'].includes(shade.state)) shade.state = 'wander';
  }
  for (const charm of g.charms) {
    if (charm.left > 0 && --charm.left === 0) charm.available = true;
  }
  g.fireflies = g.fireflies.filter(mote => mote.ttl === null || --mote.ttl > 0);
  if (RULE_VERSION < 12) return;
  for (const lamp of g.lanterns.filter(item => item.lit)) {
    const drains = g.enemies.filter(shade => shade.state === 'drain' && shade.target === lamp.id &&
      lamp.fuelUnits < lowFuel && distance(shade, lamp) <= 2);
    lamp.fuelUnits -= 1 + drains.length * 5;
    const fuel = Math.max(0, Math.round(lamp.fuelUnits / 6) / 10);
    for (const shade of drains) {
      if (++shade.drainTicks % 60 === 0) note(g, 'fuel_drain', { lantern_id: lamp.id, shade_id: shade.id, fuel });
    }
    updateFuel(g, lamp, lamp.fuelUnits);
  }
}

function movement(g, input, edge) {
  const p = g.player;
  if (p.respawn > 0) {
    if (--p.respawn === 0) {
      Object.assign(p, g.spawn, { vx: 0, vy: 0, vz: 0, grounded: true, invuln: 90 });
    }
    return;
  }
  const [x, z] = input.move ?? [
    Number(Boolean(input.right)) - Number(Boolean(input.left)),
    Number(Boolean(input.up)) - Number(Boolean(input.down)),
  ];
  const angle = (input.cam_yaw_deg ?? 0) * Math.PI / 180;
  const scale = Math.max(1, Math.hypot(x, z));
  const mx = (x * Math.cos(angle) + z * Math.sin(angle)) / scale;
  const mz = (-x * Math.sin(angle) + z * Math.cos(angle)) / scale;
  if (mx || mz) {
    [p.faceX, p.faceZ] = unit(mx, mz);
    p.dir = Math.atan2(mx, -mz);
  }

  const pad = g.map.pads.find(item => p.grounded && distance(item, p) <= 1 && Math.abs(p.y - item.y) < 0.05);
  if (pad) {
    const [dx, dz] = unit(pad.dx, pad.dz);
    p.launch = { x: dx * pad.horizontal, z: dz * pad.horizontal };
    p.vy = pad.vy;
    p.grounded = false;
  } else if (edge.jump && p.grounded) {
    p.vy = 7;
    p.grounded = false;
    g.jumpTick = g.tick;
  }
  if (RULE_VERSION >= 11 && edge.dash && !p.dashLeft && (!p.dashCd || p.charm)) {
    p.dashCd = p.charm ? 0 : 90;
    p.dashLeft = 12;
    p.dashX = p.faceX;
    p.dashZ = p.faceZ;
    note(g, 'dash');
  }
  let velocity = (p.charm ? 7.2 : 6);
  p.vx = mx * velocity;
  p.vz = mz * velocity;
  if (p.launch) {
    p.vx = p.launch.x;
    p.vz = p.launch.z;
  }
  const dashing = p.dashLeft > 0;
  if (dashing) {
    p.vx = p.dashX * 14;
    p.vz = p.dashZ * 14;
    p.dashLeft -= 1;
  }
  if (g.wind.active) {
    const radians = g.wind.dir_deg * Math.PI / 180;
    p.vx += Math.cos(radians) * 2;
    p.vz += Math.sin(radians) * 2;
  }
  const nextX = p.x + p.vx * step;
  const nextZ = p.z + p.vz * step;
  const oldGround = terrain(g.night, p.x, p.z);
  const nextGround = terrain(g.night, nextX, nextZ);
  const nextY = p.y + (dashing ? 0 : p.vy * step);
  const slope = p.grounded && Number.isFinite(oldGround) && nextGround - oldGround <= 0.2;
  const tower = g.night === 3 && Math.hypot(nextX, nextZ) < 2 && p.y >= 5.9;
  if (!tower && (nextGround <= nextY + 1e-7 || slope)) {
    p.x = nextX;
    p.z = nextZ;
  }
  const ground = terrain(g.night, p.x, p.z);
  if (p.grounded && ground >= p.y - 0.18) {
    p.y = ground;
  } else if (!dashing) {
    p.grounded = false;
    p.y += p.vy * step;
    p.vy -= 20 * step;
    if (p.vy <= 0 && p.y <= ground && nextY >= ground - 0.5) {
      p.y = ground;
      p.vy = 0;
      p.grounded = true;
      p.launch = null;
    }
  }
  if (p.y < -10) {
    const lost = p.fireflies;
    p.health = Math.max(0, p.health - 1);
    p.fireflies = 0;
    p.respawn = p.health ? 60 : 0;
    p.dashLeft = 0;
    p.launch = null;
    note(g, 'player_hit', { by: 'fall', flames: p.health, dropped: 0, ...(RULE_VERSION >= 11 ? { lost } : {}) });
  }
}

function collect(g) {
  const p = g.player;
  if (p.respawn || p.health === 0) return;
  for (const mote of g.fireflies) {
    if (p.fireflies >= capacity(g)) break;
    if ((mote.kind !== 'dropped' || mote.born < g.simTick) &&
      distance(mote, p) <= 1 && Math.abs(mote.y - p.y) <= 1.5) {
      mote.collected = true;
      p.fireflies += 1;
      note(g, 'mote_picked', { carried: p.fireflies });
    }
  }
  g.fireflies = g.fireflies.filter(mote => !mote.collected);
  if (RULE_VERSION < 11) return;
  for (const charm of g.charms) {
    if (charm.available && distance(charm, p) <= 1 && Math.abs(charm.y - p.y) <= 1.5) {
      charm.available = false;
      charm.left = 2700;
      p.charm = 600;
      p.dashCd = 0;
      note(g, 'charm_picked', { charm_id: charm.id, charm_ticks: 600 });
    }
  }
}

function interact(g) {
  const p = g.player;
  if (!p.fireflies || p.respawn || !p.health) return;
  const lamp = nearestLantern(g);
  if (!lamp) return;
  if (lamp.lit) {
    const used = Math.min(p.fireflies, Math.ceil((maxFuel - lamp.fuelUnits) / 600));
    if (used) {
      p.fireflies -= used;
      g.score += used * 5;
      updateFuel(g, lamp, lamp.fuelUnits + 600 * used);
      note(g, 'refuel', { lantern_id: lamp.id, amount: used, fuel: Number(lamp.fuel.toFixed(1)) });
    }
    return;
  }
  const amount = Math.min(p.fireflies, lamp.cost - lamp.deposited);
  if (amount <= 0) return;
  p.fireflies -= amount;
  lamp.deposited += amount;
  g.score += amount * T.score.per_mote;
  note(g, 'deposit', { lantern_id: lamp.id, amount, deposited: lamp.deposited });
  if (lamp.deposited !== lamp.cost) return;
  const relight = lamp.ever_lit;
  lamp.lit = true;
  lamp.ever_lit = true;
  lamp.relit_count += Number(relight);
  updateFuel(g, lamp, maxFuel);
  p.successfulLights += 1;
  g.score += relight ? 40 : 100;
  note(g, 'lantern_lit', { lantern_id: lamp.id, ...(RULE_VERSION >= 12 ? { relight } : {}) });
}

function pulse(g) {
  const p = g.player;
  if (p.pulseCd || p.fireflies < T.pulse_cost || p.respawn || !p.health) return;
  p.fireflies -= T.pulse_cost;
  p.pulseCd = 180;
  const center = { ...p, y: p.y + 0.8 };
  const hit = g.enemies.filter(shade => shade.state !== 'spawning' && (
    RULE_VERSION >= 11 ? distance3(center, shade) : distance(center, shade)
  ) <= T.pulse_radius).sort(byId);
  for (const shade of hit) {
    g.score += RULE_VERSION >= 12 && shade.state === 'drain' ? 15 : 5;
    shade.state = 'stunned';
    shade.left = 120;
    const [x, z] = unit(shade.x - p.x || (shade.z === p.z ? 1 : 0), shade.z - p.z);
    shade.pushX = x * 4 / 15;
    shade.pushZ = z * 4 / 15;
    shade.pushLeft = 15;
    shade.target = null;
  }
  note(g, 'pulse', { stunned_ids: hit.map(shade => shade.id) });
  if (RULE_VERSION < 11) return;
  for (const drifter of g.drifters) {
    if (distance3(center, drifter) > 5) continue;
    if (drifter.state === 'chase') {
      drifter.state = 'flee';
      drifter.left = 240;
    } else if (drifter.state === 'flee' && drifter.stolen) {
      const amount = drifter.stolen;
      for (let i = 0; i < amount; i += 1) g.fireflies.push(makeMote(g, position([drifter.x, drifter.y, drifter.z]), 'dropped'));
      drifter.stolen = 0;
      drifter.left = 120;
      note(g, 'drifter_drop', { drifter_id: drifter.id, amount });
    }
  }
}

function moveShade(g, shade, dx, dz, safeLamps) {
  const next = { x: shade.x + dx, z: shade.z + dz };
  const ground = terrain(g.night, next.x, next.z);
  if (!Number.isFinite(ground) || Math.abs(ground + 0.8 - shade.y) > 1.5 ||
      safeLamps.some(lamp => distance(shade, lamp) >= T.safe_radius - 1e-7 && distance(next, lamp) < T.safe_radius - 1e-7)) return;
  shade.x = next.x;
  shade.z = next.z;
}

function wanderTarget(g, shade) {
  if (RULE_VERSION >= 12) {
    const weak = sortedNear(shade, g.lanterns.filter(lamp => lamp.lit && lamp.fuelUnits < lowFuel))[0];
    if (weak) return weak;
  }
  return sortedNear(shade, g.lanterns.filter(lamp => !lamp.lit))[0];
}

function wander(g, shade, safeLamps, speed) {
  const target = wanderTarget(g, shade);
  if (!target) return;
  if (RULE_VERSION >= 12 && target.lit && distance(shade, target) <= 2) {
    shade.state = 'drain';
    shade.target = target.id;
    shade.drainTicks = 0;
    return;
  }
  const [x, z] = unit(target.x - shade.x, target.z - shade.z);
  const distanceThisStep = Math.min(speed * step, distance(shade, target));
  moveShade(g, shade, x * distanceThisStep, z * distanceThisStep, safeLamps);
}

export function stepWanderingShades(g) {
  const safe = g.lanterns.filter(stateSafe);
  for (const shade of g.enemies) wander(g, shade, safe, g.night === 3 ? 4.5 : 4);
}

function updateShades(g) {
  const p = g.player;
  const safe = g.lanterns.filter(stateSafe);
  const speed = g.night === 3 ? 4.5 : 4;
  for (const shade of g.enemies) {
    const bubble = safe.find(lamp => distance(shade, lamp) < 6 - 1e-7);
    shade.expel = Boolean(bubble);
    if (bubble) {
      const dx = shade.x - bubble.x;
      const dz = shade.z - bubble.z;
      const [x, z] = unit(dx || (dz === 0 ? 1 : 0), dz);
      const amount = Math.min(0.2, 6 - distance(shade, bubble));
      shade.x += x * amount;
      shade.z += z * amount;
      continue;
    }
    if (shade.pushLeft > 0) {
      shade.pushLeft -= 1;
      moveShade(g, shade, shade.pushX, shade.pushZ, safe);
      continue;
    }
    if (['stunned', 'recoil', 'spawning'].includes(shade.state)) continue;
    const separation = distance(p, shade);
    if (shade.state === 'drain') {
      const lamp = g.lanterns.find(item => item.id === shade.target);
      if (separation <= 6) shade.state = 'chase';
      else if (!lamp?.lit || lamp.fuelUnits >= lowFuel || distance(shade, lamp) > 2) shade.state = 'wander';
      else continue;
    }
    if (shade.state === 'chase' && (separation > 18 || p.respawn)) shade.state = 'wander';
    else if (shade.state === 'wander' && separation <= 12 && !p.respawn) shade.state = 'chase';
    if (shade.state === 'chase') {
      const [x, z] = unit(p.x - shade.x, p.z - shade.z);
      const amount = Math.min(speed * step, separation);
      moveShade(g, shade, x * amount, z * amount, safe);
    } else wander(g, shade, safe, speed);
  }
}

function updateDrifters(g) {
  const p = g.player;
  for (const drifter of g.drifters) {
    const separation = distance(drifter, p);
    if (drifter.state === 'flee') {
      if (--drifter.left <= 0) drifter.state = 'removed';
    } else if (drifter.state !== 'removed') {
      drifter.state = !p.respawn && p.fireflies >= 5 && separation <= 15 ? 'chase' : 'idle';
    }
    const toward = drifter.state === 'chase';
    const away = drifter.state === 'flee';
    const [x, z] = away ? unit(drifter.x - p.x || (drifter.z === p.z ? 1 : 0), drifter.z - p.z)
      : toward ? unit(p.x - drifter.x, p.z - drifter.z)
        : [Math.cos(g.simTick / 180), Math.sin(g.simTick / 180)];
    if (toward || away || drifter.state === 'idle') {
      const amount = toward ? Math.min(7 * step, separation) : (away ? 7 : 2) * step;
      drifter.x += x * amount;
      drifter.z += z * amount;
    }
  }
}

function contacts(g) {
  const p = g.player;
  if (p.respawn || !p.health) return;
  for (const drifter of g.drifters.slice().sort(byId)) {
    if (drifter.state !== 'chase' || distance(drifter, p) > 1.2) continue;
    const amount = Math.min(3, p.fireflies);
    p.fireflies -= amount;
    drifter.stolen = amount;
    drifter.state = 'flee';
    drifter.left = 240;
    note(g, 'drifter_steal', { drifter_id: drifter.id, amount, carried: p.fireflies });
  }
  if (p.invuln || g.lanterns.some(lamp => stateSafe(lamp) && distance(lamp, p) < 6)) return;
  const shade = g.enemies.slice().sort(byId).find(item => !item.expel &&
    ['chase', 'wander', 'drain'].includes(item.state) && distance(item, p) <= T.shade_hit_radius &&
    Math.abs(item.y - p.y) <= 1.5);
  if (!shade) return;
  const dropped = Math.floor(p.fireflies * T.hit_drop_ratio);
  p.health -= 1;
  p.fireflies -= dropped;
  p.invuln = HIT_DELAY_TICKS;
  for (let index = 0; index < dropped; index += 1) {
    const angle = g.random() * Math.PI * 2;
    const radius = 1.5 + g.random();
    const x = p.x + Math.cos(angle) * radius;
    const z = p.z + Math.sin(angle) * radius;
    const y = terrain(g.night, x, z);
    g.fireflies.push(makeMote(g, { x, y: Number.isFinite(y) ? y : 0, z }, 'dropped'));
  }
  shade.state = 'recoil';
  shade.left = 60;
  shade.pushLeft = 60;
  const [x, z] = unit(shade.x - p.x || (shade.z === p.z ? 1 : 0), shade.z - p.z);
  shade.pushX = x * 2 / 60;
  shade.pushZ = z * 2 / 60;
  note(g, 'player_hit', { by: 'shade', flames: p.health, dropped });
}

function spawn(g) {
  if (g.randomMotes && g.simTick % 240 === 0 && g.fireflies.length < 30) spawnMote(g);
  const start = g.simTick === 300;
  if (g.randomShades && (start || (g.simTick > 300 && (g.simTick - 300) % g.map.spawnInterval === 0))) {
    for (let i = 0; i < (start ? 2 : 1) && g.enemies.length < g.map.count; i += 1) {
      const spot = choose(g, g.map.shadePoints.filter(point => distance(g.player, point) >= 15 &&
        !g.enemies.some(shade => distance(point, shade) < 1)));
      if (!spot) break;
      while (g.enemies.some(shade => shade.id === `S${g.ids.shade}`)) g.ids.shade += 1;
      const shade = makeShade(g, { pos: [spot.x, spot.y + 0.8, spot.z], state: 'spawning', state_ticks_left: 1 });
      g.enemies.push(shade);
      note(g, 'shade_spawned', { id: shade.id });
    }
  }
  if (RULE_VERSION >= 11 && g.night >= 2 && g.randomDrifters && g.simTick % 1200 === 0) {
    if (g.drifters.filter(item => item.state !== 'removed').length < 2) {
      const spot = choose(g, g.map.shadePoints);
      while (g.drifters.some(item => item.id === `D${g.ids.drifter}`)) g.ids.drifter += 1;
      g.drifters.push({ id: `D${g.ids.drifter++}`, ...spot, state: 'idle', stolen: 0, left: 0 });
    }
  }
}

function finish(g) {
  const lit = g.lanterns.filter(lamp => lamp.lit);
  let result;
  let reason;
  if (g.player.health <= 0) { result = 'lost'; reason = 'no_flames'; }
  else if (RULE_VERSION < 12 && lit.length === g.lanterns.length) { result = 'won'; reason = 'all_lit'; }
  else if (g.timeTicks === 0) {
    const qualified = RULE_VERSION >= 12 && lit.length >= Math.ceil(0.6 * g.lanterns.length);
    result = qualified ? 'won' : 'lost';
    reason = qualified ? 'dawn_survived' : 'dawn';
  }
  if (!result) return;
  g.mode = result;
  if (result === 'won') {
    g.score += 50 * g.player.health;
    g.score += RULE_VERSION >= 12
      ? lit.reduce((total, lamp) => total + 50 + Math.floor(lamp.fuelUnits / 60), 0)
      : Math.floor(g.timeTicks / 60) * 2;
  }
  note(g, 'game_over', { result, reason });
}

export function stepGame(g, input = {}) {
  if (g.mode === 'won' || g.mode === 'lost') return g;
  g.tick += 1;
  const edge = {};
  for (const key of buttons) {
    const held = Boolean(input[key] ?? (key === 'interact' ? input.light : false));
    edge[key] = held && !g.held[key];
    g.held[key] = held;
  }
  if (RULE_VERSION >= 11 && edge.pause) {
    const wasPaused = g.mode === 'paused';
    g.mode = wasPaused ? 'playing' : 'paused';
    note(g, wasPaused ? 'resumed' : 'paused');
    if (!wasPaused) return g;
  }
  if (g.mode === 'paused') return g;
  g.simTick += 1;
  if (RULE_VERSION >= 11 && g.simTick === 1) note(g, 'night_start', { night: g.night });
  countdown(g);
  if (RULE_VERSION >= 11 && g.night === 3 && g.windEnabled) {
    if (g.simTick % 1800 === 1680) {
      g.wind.dir_deg = Math.floor(g.random() * 360);
      g.wind.warning = true;
    }
    if (g.simTick % 1800 === 0) {
      g.wind.active = true;
      g.wind.warning = false;
    }
    if (g.simTick > 300 && g.simTick % 1800 === 300) g.wind.active = false;
  }
  movement(g, input, edge);
  collect(g);
  if (edge.interact) interact(g);
  if (edge.pulse) pulse(g);
  updateShades(g);
  if (RULE_VERSION >= 11) updateDrifters(g);
  contacts(g);
  spawn(g);
  finish(g);
  return g;
}

const rounded = number => Number(number.toFixed(3));
const xyz = item => [rounded(item.x), rounded(item.y), rounded(item.z)];
const time = ticks => rounded(ticks * step);
export function snapshot(g) {
  const p = g.player;
  const v11 = RULE_VERSION >= 11;
  const v12 = RULE_VERSION >= 12;
  const data = {
    type: 'snapshot', tick: g.tick, sim_tick: g.simTick, state: g.mode, time_left_s: g.timeLeft,
    score: g.score,
    player: {
      pos: xyz(p), flames: p.health, carried: p.fireflies,
      ...(v11 ? { vel: xyz({ x: p.vx, y: p.vy, z: p.vz }), grounded: p.grounded,
        invuln: p.invuln > 0, dash_cd_s: time(p.dashCd), pulse_cd_s: time(p.pulseCd), charm_s: time(p.charm) } : {}),
      ...(v12 ? { capacity: capacity(g) } : {}),
    },
    lanterns: g.lanterns.map(lamp => ({
      id: lamp.id, pos: xyz(lamp), lit: lamp.lit, deposited: lamp.deposited,
      ...(v12 ? { fuel: Number(lamp.fuel.toFixed(1)), ever_lit: lamp.ever_lit, relit_count: lamp.relit_count } : {}),
    })),
    shades: g.enemies.map(shade => ({ id: shade.id, pos: xyz(shade), state: shade.state })),
    motes_active: g.fireflies.length,
    motes: g.fireflies.map(mote => ({ id: mote.id, pos: xyz(mote),
      ...(v11 ? { kind: mote.kind, ttl_s: mote.ttl === null ? null : time(mote.ttl) } : {}) })),
  };
  if (v11) {
    data.night = g.night;
    data.wind = { active: g.wind.active, dir_deg: g.wind.dir_deg };
    data.drifters = g.drifters.map(({ id, x, y, z, state, stolen }) => ({ id, pos: xyz({ x, y, z }), state, stolen }));
    data.charms = g.charms.map(({ id, available, left }) => ({ id, available, respawn_s: time(left) }));
  }
  return data;
}
