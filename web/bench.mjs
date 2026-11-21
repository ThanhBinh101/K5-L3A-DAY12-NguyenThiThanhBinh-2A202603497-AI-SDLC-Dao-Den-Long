import { createGame, stepWanderingShades } from '../src/game.mjs';
import { makeRandom } from '../src/maps.mjs';
import { createWorld } from './world.mjs';

const options = new URLSearchParams(location.search);
const seed = Number(options.get('seed'));
const durationMs = Number(options.get('duration')) * 1000;
const launchMs = Number(options.get('launchMs'));
const warmupMs = 3000;
const stepMs = 1000 / 60;
const tau = Math.PI * 2;

function instanceLocations(count, random, radius) {
  const turn = tau * random();
  return Array.from({ length: count }, (_, index) => {
    const theta = turn + (index + random()) * tau / count;
    const distance = radius * Math.sqrt(random());
    return { x: Math.cos(theta) * distance, y: 0, z: Math.sin(theta) * distance };
  });
}

function buildFixture() {
  const state = createGame({ night: 1, seed });
  const random = makeRandom(seed);
  const template = state.enemies[0] ?? {};
  state.enemies = instanceLocations(200, random, state.radius - 1).map((point, index) => ({
    ...template, ...point, id: `bench-shade-${index + 1}`, y: 0.8,
    baseX: point.x, baseZ: point.z, state: 'wander', active: true,
    dir: tau * random(),
  }));
  state.fireflies = instanceLocations(100, random, state.radius - 1).map((point, index) => ({
    ...point, id: `bench-mote-${index + 1}`, collected: false,
  }));
  for (const lantern of state.lanterns) {
    lantern.lit = ['L1', 'L2', 'L3'].includes(lantern.id);
    lantern.fuel = lantern.lit ? 100 : 0;
    lantern.fuelUnits = lantern.lit ? 6000 : 0;
  }
  Object.assign(state.player, { x: 0, y: 0, z: 0 });
  return state;
}

async function send(data) {
  await fetch('/report', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function summarize(frameTimes, load_ms, renderer) {
  const frames = frameTimes.length;
  const sorted = [...frameTimes].sort((first, second) => first - second);
  const worst = sorted.slice(-Math.ceil(frames * 0.01));
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const rounded = (value) => Number(value.toFixed(3));
  return {
    contract_version: '1.3',
    avg_fps: rounded(1000 / mean(frameTimes)),
    p1_low_fps: rounded(1000 / mean(worst)),
    frame_ms_p95: rounded(sorted[Math.ceil(frames * 0.95) - 1]),
    frames,
    load_ms,
    peak_mem_mb: null,
    vsync_off: true,
    renderer,
  };
}

function run() {
  const canvas = document.querySelector('canvas');
  const world = createWorld(canvas);
  const gl = canvas.getContext('webgl2');
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const g = buildFixture();
  const frameTimes = [];
  let first = null;
  let measuredStart = null;
  let previous = null;
  let carry = 0;
  let loadMs = 0;

  function frame(timestamp) {
    if (first === null) first = timestamp;
    if (previous !== null) {
      carry += timestamp - previous;
      while (carry >= stepMs) {
        stepWanderingShades(g);
        carry -= stepMs;
      }
    }
    const theta = ((timestamp - first) / 15000) * tau;
    world.render(g, timestamp, {
      camera: { eye: [30 * Math.cos(theta), 15, -30 * Math.sin(theta)], target: [0, 0, 0] },
      benchmark: true,
    });
    // Wait for completion so an uncapped RAF cannot count queued GPU frames.
    gl.finish();
    if (previous === null) loadMs = Date.now() - launchMs;
    if (measuredStart !== null) {
      const delta = timestamp - previous;
      if (delta > 0) frameTimes.push(delta);
      if (timestamp - measuredStart >= durationMs) {
        void send(summarize(frameTimes, loadMs, renderer));
        return;
      }
    } else if (timestamp - first >= warmupMs) {
      measuredStart = timestamp;
    }
    previous = timestamp;
    requestAnimationFrame(safeFrame);
  }

  function safeFrame(timestamp) {
    try {
      frame(timestamp);
    } catch (error) {
      void send({ error: error.message });
    }
  }

  requestAnimationFrame(safeFrame);
}

try {
  run();
} catch (error) {
  void send({ error: error.message });
}
