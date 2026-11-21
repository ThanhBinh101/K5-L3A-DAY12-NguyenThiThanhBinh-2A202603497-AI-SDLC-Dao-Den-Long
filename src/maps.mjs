function point(x, y, z) {
  return { x, y, z };
}

function ring(count, radius, y = 0, start = 0, step = 360 / count, center = 0) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (start + step * index) * Math.PI / 180;
    return point(center + Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  });
}

const maps = {
  1: {
    radius: 40, count: 6, spawnInterval: 480,
    lamps: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(8, 12), ...ring(16, 33)],
    shadePoints: ring(12, 37, 0, 15),
    pads: [], charms: [],
  },
  2: {
    radius: 28, count: 8, spawnInterval: 420,
    lamps: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motePoints: [0, 70].flatMap(center => [...ring(4, 10, 0, 0, 90, center), ...ring(8, 22, 0, 0, 45, center)]),
    shadePoints: [0, 70].flatMap(center => ring(8, 26, 0, 22.5, 45, center)),
    pads: [{ x: 20, y: 0, z: 18, dx: 50, dz: -18, vy: 14, horizontal: 24 },
      { x: 50, y: 0, z: -18, dx: -50, dz: 18, vy: 14, horizontal: 24 }],
    charms: [[35, 0, 0]],
  },
  3: {
    radius: 45, count: 10, spawnInterval: 360,
    lamps: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motePoints: [...ring(18, 34), ...ring(8, 18, 3, 20, 20), ...ring(4, 5, 6, 45)],
    shadePoints: ring(16, 43),
    pads: [{ x: 0, y: 3, z: 13, dx: 0, dz: -1, vy: 12, horizontal: 8 }],
    charms: [[30, 0, 25], [-30, 0, 25]],
  },
};

export function getMap(night) {
  return maps[night];
}

export function terrain(night, x, z) {
  const radius = Math.hypot(x, z);
  if (night === 1) return radius <= 40 ? 0 : -Infinity;
  if (night === 2) {
    return radius <= 28 || Math.hypot(x - 70, z) <= 28 ||
      (x >= 26 && x <= 44 && Math.abs(z) <= 2) ? 0 : -Infinity;
  }
  if (radius > 45) return -Infinity;
  if (radius <= 8) return 6;
  if (radius >= 12 && radius <= 24 && z > 0) return 3;
  for (const angle of [Math.PI / 6, 5 * Math.PI / 6]) {
    const along = x * Math.cos(angle) + z * Math.sin(angle);
    const across = z * Math.cos(angle) - x * Math.sin(angle);
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5) return (30 - along) / 2;
  }
  return 0;
}

export function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), state | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
