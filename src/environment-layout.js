import { WORLD_BOUNDS } from './world-map.js';

const TAU = Math.PI * 2;

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const MOUNTAIN_TINTS = Object.freeze([
  '#718a80', '#84988a', '#7b9290', '#95a18e', '#71877f'
]);

export function createDistantMountainLayout(seed = 0x5ca1ab1e) {
  const random = seeded(seed);
  const count = 40;

  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * TAU + (random() - 0.5) * 0.1;
    const radius = 140 + random() * 16;
    const height = 15 + random() * 19;

    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      baseY: -5,
      width: 12 + random() * 10,
      height,
      depth: 10 + random() * 9,
      rotationY: random() * TAU,
      tint: MOUNTAIN_TINTS[index % MOUNTAIN_TINTS.length]
    };
  });
}

const CLOUD_FORMATIONS = Object.freeze([
  [-62, -42, 24, 1.05],
  [-42, -25, 22, 1.05],
  [-21, 28, 24, 0.95],
  [5, -34, 22, 1.0],
  [34, -24, 24, 1.08],
  [47, 4, 21, 0.88],
  [28, 35, 25, 1.0],
  [-38, 28, 22, 1.05],
  [-46, 1, 25, 0.92],
  [0, 18, 24, 0.9],
  [62, -36, 23, 1.0],
  [64, 14, 24, 1.05],
  [-64, 13, 22, 0.95],
  [0, 52, 25, 1.1],
  [42, 49, 22, 0.96],
  [0, -54, 23, 1.0]
]);

const CLOUD_PUFF_SHAPES = Object.freeze([
  [0, 0, 0, 2.0, 0.66, 1.15],
  [-1.22, 0.12, 0.02, 1.35, 0.8, 1.0],
  [1.25, 0.06, -0.08, 1.42, 0.82, 1.0],
  [-0.48, 0.58, -0.12, 1.2, 0.86, 0.92],
  [0.72, 0.54, 0.12, 1.08, 0.78, 0.9],
  [0.04, -0.16, 0.56, 1.28, 0.56, 0.76]
]);

const CLOUD_TINTS = Object.freeze(['#fff9ec', '#f7f5e8', '#e5eee7']);

export function createCloudPuffLayout(seed = 0x71c10d5) {
  const random = seeded(seed);
  const puffs = [];

  CLOUD_FORMATIONS.forEach(([x, z, y, formationScale], formationIndex) => {
    const phase = formationIndex * 1.17;

    CLOUD_PUFF_SHAPES.forEach(([ox, oy, oz, sx, sy, sz], puffIndex) => {
      const variation = 0.94 + random() * 0.12;
      puffs.push({
        x,
        y,
        z,
        offsetX: ox * formationScale + (random() - 0.5) * 0.1,
        offsetY: oy * formationScale,
        offsetZ: oz * formationScale + (random() - 0.5) * 0.1,
        scaleX: sx * formationScale * variation,
        scaleY: sy * formationScale * variation,
        scaleZ: sz * formationScale * variation,
        phase,
        driftX: 1.15,
        driftZ: 0.48,
        rotationY: (random() - 0.5) * 0.18,
        tint: CLOUD_TINTS[(formationIndex + puffIndex) % CLOUD_TINTS.length]
      });
    });
  });

  return puffs;
}

const PINE_FOREST_CENTERS = Object.freeze([
  [-60, 39, 11],
  [-59, -39, 11],
  [60, 39, 11],
  [60, -39, 11]
]);

export function createPeripheralPineLayout(seed = 0x51a7f017) {
  const random = seeded(seed);
  return PINE_FOREST_CENTERS.flatMap(([centerX, centerZ, count], clusterIndex) =>
    Array.from({ length: count }, () => {
      const angle = random() * TAU;
      const radius = 3.2 + random() * 5.2;
      const scale = 0.82 + random() * 0.58;
      return {
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius * 0.82,
        scale,
        rotationY: random() * TAU,
        tintIndex: Math.floor(random() * 4),
        clusterIndex
      };
    })
  );
}


const WOODLAND_CENTERS = Object.freeze([
  [-60, 39], [-59, -39], [60, 39], [60, -39]
]);

export function createWoodlandFloorLayout(seed = 0xf3a41d) {
  const random = seeded(seed);
  const ferns = [];
  const fallenLogs = [];
  const stumps = [];

  WOODLAND_CENTERS.forEach(([centerX, centerZ], clusterIndex) => {
    for (let index = 0; index < 14; index++) {
      const angle = random() * TAU;
      const radius = 2.6 + random() * 5.1;
      ferns.push({
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius * 0.84,
        scale: 0.68 + random() * 0.62,
        rotationY: random() * TAU,
        tintIndex: Math.floor(random() * 4),
        clusterIndex
      });
    }

    for (let index = 0; index < 2; index++) {
      const angle = random() * TAU;
      const radius = 2.8 + random() * 3.8;
      fallenLogs.push({
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius * 0.84,
        length: 1.8 + random() * 1.8,
        radius: 0.19 + random() * 0.1,
        rotationY: random() * TAU,
        clusterIndex
      });
      const stumpAngle = angle + (random() - 0.5) * 1.4;
      const stumpRadius = 3.2 + random() * 3.6;
      stumps.push({
        x: centerX + Math.cos(stumpAngle) * stumpRadius,
        z: centerZ + Math.sin(stumpAngle) * stumpRadius * 0.84,
        height: 0.35 + random() * 0.28,
        radius: 0.22 + random() * 0.1,
        rotationY: random() * TAU,
        clusterIndex
      });
    }
  });

  return { ferns, fallenLogs, stumps };
}

const CRYSTAL_MOTE_CENTERS = Object.freeze([
  [55, -38, 28],
  [-55, -35, 24]
]);

export function createCrystalMoteLayout(seed = 0xc715a1) {
  const random = seeded(seed);
  return CRYSTAL_MOTE_CENTERS.flatMap(([centerX, centerZ, count], clusterIndex) =>
    Array.from({ length: count }, () => {
      const angle = random() * TAU;
      const radius = 1.7 + random() * 5.1;
      return {
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius * 0.78,
        height: 0.35 + random() * 1.65,
        phase: random() * TAU,
        size: 0.1 + random() * 0.12,
        tintIndex: Math.floor(random() * 4),
        clusterIndex
      };
    })
  );
}

export function createPondReedLayout(seed = 0x9eed51) {
  const random = seeded(seed);
  const centerX = -31;
  const centerZ = -8;
  return Array.from({ length: 12 }, (_, index) => {
    const angle = (index + 0.5) / 12 * TAU;
    return {
      x: centerX + Math.cos(angle) * (8.65 + random() * 0.42),
      z: centerZ + Math.sin(angle) * (6.18 + random() * 0.38),
      height: 0.62 + random() * 0.42,
      lean: (random() - 0.5) * 0.36,
      rotationY: random() * TAU,
      tintIndex: Math.floor(random() * 3)
    };
  });
}

const CRYSTAL_GROVE_CENTERS = Object.freeze([
  [55, -38, 26],
  [-55, -35, 18]
]);

export function createCrystalGroveLayout(seed = 0xc7a57a1) {
  const random = seeded(seed);
  return CRYSTAL_GROVE_CENTERS.flatMap(([centerX, centerZ, count], clusterIndex) =>
    Array.from({ length: count }, () => {
      const angle = random() * TAU;
      const radius = 0.45 + random() * 4.1;
      return {
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius * 0.78,
        height: 1.1 + random() * 2.2,
        width: 0.28 + random() * 0.34,
        lean: (random() - 0.5) * 0.22,
        rotationY: random() * TAU,
        tintIndex: Math.floor(random() * 4),
        clusterIndex
      };
    })
  );
}
