export const WORLD_BOUNDS = Object.freeze({
  minX: -48,
  maxX: 48,
  minZ: -38,
  maxZ: 38
});

export const WORLD_SIZE = Object.freeze({
  width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4,
  depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4
});

export function clampWorldPosition(x, z, padding = 0) {
  const inset = Number.isFinite(padding) ? Math.max(0, padding) : 0;
  const minX = WORLD_BOUNDS.minX + inset;
  const maxX = WORLD_BOUNDS.maxX - inset;
  const minZ = WORLD_BOUNDS.minZ + inset;
  const maxZ = WORLD_BOUNDS.maxZ - inset;

  if (minX > maxX || minZ > maxZ) {
    throw new RangeError('World-bound padding is larger than the playable area.');
  }

  return {
    x: Math.max(minX, Math.min(maxX, Number.isFinite(x) ? x : 0)),
    z: Math.max(minZ, Math.min(maxZ, Number.isFinite(z) ? z : 0))
  };
}
