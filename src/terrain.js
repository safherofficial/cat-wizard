import { WORLD_BOUNDS } from './world-map.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const PATHS = Object.freeze([
  [[0,12],[-1.8,8],[-1.1,5],[.2,2],[0,-1.5],[-2.8,-5],[-6.5,-9.8]],
  [[-6.5,-9.8],[-14,-13],[-22,-15],[-31,-11],[-39,-4],[-51,-8],[-61,-20],[-66,-36]],
  [[-1,-3],[8,-8],[17,-14],[26,-18],[37,-16],[49,-19],[60,-15],[66,-27]],
  [[0,12],[-2,19],[2,27],[0,35],[-1,42],[0,49]],
  [[-2,-10],[3,-18],[1,-27],[-4,-35],[5,-44],[19,-51],[37,-49],[51,-42]],
  [[0,35],[-12,42],[-26,48],[-42,47],[-51,43]],
  [[37,-16],[45,-7],[54,2],[65,8]]
]);

const LANDFORMS = Object.freeze([
  [-49, 29, 1.35, 15, 12],
  [48, 30, 1.05, 14, 11],
  [43, -43, 1.18, 15, 11],
  [-48, -42, 0.98, 16, 12],
  [0, 45, 0.72, 13, 10],
  [-25, -53, 0.62, 13, 9],
  [-56, 1, -0.48, 12, 9],
  [52, 5, -0.44, 13, 10],
  [-20, 39, -0.28, 9, 10]
]);

const FLAT_ZONES = Object.freeze([
  [0, 0, 13.5, 5],
  [-31, -8, 10.5, 4.5],
  [1, -31, 8.5, 4],
  [0, 50, 7.5, 4],
  [55, -38, 6, 3],
  [-55, -35, 6, 3]
]);

function distanceToSegment(x, z, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = Math.max(dx * dx + dz * dz, 0.0001);
  const t = clamp(
    ((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared,
    0,
    1
  );
  return Math.hypot(x - (start[0] + dx * t), z - (start[1] + dz * t));
}

function distanceToTrails(x, z) {
  let nearest = Infinity;
  for (const path of PATHS) {
    for (let index = 0; index < path.length - 1; index++) {
      nearest = Math.min(nearest, distanceToSegment(x, z, path[index], path[index + 1]));
    }
  }
  return nearest;
}

function gaussianLandform(x, z, [centerX, centerZ, height, radiusX, radiusZ]) {
  const dx = (x - centerX) / radiusX;
  const dz = (z - centerZ) / radiusZ;
  return height * Math.exp(-0.5 * (dx * dx + dz * dz));
}

function terrainMask(x, z) {
  let mask = smoothstep(1.6, 5.2, distanceToTrails(x, z));
  mask *= smoothstep(9.5, 20, Math.hypot(x, z));

  const riverDistance = Math.hypot(
    Math.max(0, Math.abs(x) - 19),
    Math.abs(z + 9.1)
  );
  mask *= smoothstep(2.8, 5.8, riverDistance);

  const pondDistance = Math.hypot((x + 31) / 1.08, (z + 8) / 0.9);
  mask *= smoothstep(10, 14.5, pondDistance);

  for (const [centerX, centerZ, radius, blend] of FLAT_ZONES) {
    mask *= smoothstep(radius, radius + blend, Math.hypot(x - centerX, z - centerZ));
  }
  return mask;
}

/**
 * Height of the walkable storybook meadow in world units.
 * Trails, the central spell clearing, the river, and major landmark pads stay level.
 */
export function terrainElevationAt(x, z) {
  const worldX = Number.isFinite(x) ? clamp(x, WORLD_BOUNDS.minX - 2, WORLD_BOUNDS.maxX + 2) : 0;
  const worldZ = Number.isFinite(z) ? clamp(z, WORLD_BOUNDS.minZ - 2, WORLD_BOUNDS.maxZ + 2) : 0;

  let height =
    Math.sin(worldX * 0.115 + Math.cos(worldZ * 0.08)) *
    Math.cos(worldZ * 0.105 - Math.sin(worldX * 0.06)) * 0.1;

  height += Math.sin(worldX * 0.31 + worldZ * 0.19) *
    Math.cos(worldZ * 0.27 - worldX * 0.12) * 0.028;

  for (const landform of LANDFORMS) {
    height += gaussianLandform(worldX, worldZ, landform);
  }

  return height * terrainMask(worldX, worldZ);
}
