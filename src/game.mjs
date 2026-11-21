export const STEP_MS = 1000 / 60;
export const SPEED = 5;
export const REACH = 1.65;
export const HIT_DELAY_TICKS = 120;

const startingPlayer = { x: 0, z: 11, dir: 0, health: 3, fireflies: 0 };
const defaultLanterns = [
  { id: 'dao-hong', x: 0, z: 3, cost: 3 },
  { id: 'vuon-may', x: -5, z: -4, cost: 3 },
  { id: 'doi-trang', x: 3, z: -10, cost: 3 },
];
const defaultFireflies = [
  [0, 9], [0, 7], [0, 5],
  [-1.2, 1.3], [-2.8, -0.5], [-4.2, -2.3],
  [-3.2, -5.5], [-1.5, -7], [0.7, -8.7],
  [4.7, 6], [7.2, 2.7], [6.2, -4.7],
];
const defaultEnemies = [
  { id: 'bong-muc-1', x: 5.5, z: 4, patrol: 2.8, phase: 0 },
  { id: 'bong-muc-2', x: -5.6, z: -9.5, patrol: 2, phase: 2 },
];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function assertLayout(radius, objects) {
  if (!Number.isFinite(radius) || radius < 2) {
    throw new TypeError('radius must be a finite number >= 2');
  }
  for (const object of objects) {
    if (!object || !Number.isFinite(object.x) || !Number.isFinite(object.z)) {
      throw new TypeError('each position must have finite x and z');
    }
    if (Math.hypot(object.x, object.z) > radius) {
      throw new RangeError('positions must start on the island');
    }
  }
}

export function createGame(layout = {}) {
  const radius = layout.radius ?? 18;
  const player = { ...startingPlayer, ...layout.player };
  const lanterns = (layout.lanterns ?? defaultLanterns).map((lantern, index) => ({
    id: `lantern-${index + 1}`, cost: 3, ...lantern, lit: false,
  }));
  const fireflies = (layout.fireflies ?? defaultFireflies.map(([x, z]) => ({ x, z })))
    .map((firefly, index) => ({ id: `firefly-${index + 1}`, ...firefly, collected: false }));
  const enemies = (layout.enemies ?? defaultEnemies).map((enemy, index) => ({
    id: `enemy-${index + 1}`,
    ...enemy,
    baseX: enemy.x,
    baseZ: enemy.z,
    patrol: enemy.patrol ?? 0,
    phase: enemy.phase ?? 0,
    active: true,
  }));
  assertLayout(radius, [player, ...lanterns, ...fireflies, ...enemies]);
  if (!Number.isSafeInteger(player.health) || player.health < 1 ||
      !Number.isSafeInteger(player.fireflies) || player.fireflies < 0) {
    throw new TypeError('player health must be positive and fireflies nonnegative integers');
  }
  if (lanterns.some(({ cost }) => !Number.isSafeInteger(cost) || cost < 1)) {
    throw new TypeError('lantern cost must be a positive integer');
  }
  if (enemies.some(({ patrol, phase }) => !Number.isFinite(patrol) || patrol < 0 ||
    !Number.isFinite(phase))) {
    throw new TypeError('enemy patrol must be finite and nonnegative and phase finite');
  }
  return {
    player, lanterns, fireflies, enemies, radius,
    maxHealth: player.health, tick: 0, hits: 0, lastHit: -HIT_DELAY_TICKS,
    mode: 'playing', event: null, events: [],
  };
}

export function nearestLantern(state) {
  let nearest = null;
  let best = REACH;
  for (const lantern of state.lanterns) {
    const separation = distance(lantern, state.player);
    if (!lantern.lit && separation <= best) {
      nearest = lantern;
      best = separation;
    }
  }
  return nearest;
}

function note(state, kind, id) {
  const event = { tick: state.tick, kind, id };
  state.event = event;
  state.events.push(event);
}

export function stepGame(state, input = {}) {
  if (state.mode !== 'playing') return state;
  const player = state.player;
  const x = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const z = Number(Boolean(input.down)) - Number(Boolean(input.up));
  if (x || z) {
    const movement = (SPEED / 60) / Math.hypot(x, z);
    player.dir = Math.atan2(x, -z);
    player.x += movement * x;
    player.z += movement * z;
    const shoreline = Math.hypot(player.x, player.z);
    if (shoreline > state.radius - 0.55) {
      const ratio = (state.radius - 0.55) / shoreline;
      player.x *= ratio;
      player.z *= ratio;
    }
  }

  state.tick += 1;
  for (const firefly of state.fireflies) {
    if (!firefly.collected && distance(player, firefly) < 0.83) {
      firefly.collected = true;
      player.fireflies += 1;
      note(state, 'collect', firefly.id);
    }
  }

  if (input.light) {
    const lantern = nearestLantern(state);
    if (lantern && player.fireflies >= lantern.cost) {
      player.fireflies -= lantern.cost;
      lantern.lit = true;
      note(state, 'light', lantern.id);
      if (state.lanterns.every(({ lit }) => lit)) {
        state.mode = 'won';
        note(state, 'won', lantern.id);
        return state;
      }
    } else if (lantern) {
      note(state, 'need-fireflies', lantern.id);
    }
  }

  for (const enemy of state.enemies) {
    const angle = state.tick / 90 + enemy.phase;
    enemy.x = enemy.baseX + Math.sin(angle) * enemy.patrol;
    enemy.z = enemy.baseZ + Math.sin(angle * 0.75) * enemy.patrol * 0.45;
    if (state.tick - state.lastHit >= HIT_DELAY_TICKS && distance(enemy, player) < 0.91) {
      player.health -= 1;
      state.hits += 1;
      state.lastHit = state.tick;
      note(state, 'hit', enemy.id);
      if (player.health === 0) {
        state.mode = 'lost';
        note(state, 'lost', enemy.id);
        break;
      }
    }
  }
  return state;
}

function rounded(value) {
  return Number(value.toFixed(6));
}

export function snapshot(state) {
  return {
    ticks: state.tick,
    mode: state.mode,
    player: {
      x: rounded(state.player.x),
      z: rounded(state.player.z),
      health: state.player.health,
      fireflies: state.player.fireflies,
    },
    collected: state.fireflies.filter(({ collected }) => collected).map(({ id }) => id),
    lit: state.lanterns.filter(({ lit }) => lit).map(({ id }) => id),
    hits: state.hits,
    events: state.events,
  };
}
