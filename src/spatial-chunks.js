export const DEFAULT_SPATIAL_CHUNK_SIZE = 32;

export function spatialChunkKey(x, z, chunkSize = DEFAULT_SPATIAL_CHUNK_SIZE) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Spatial chunk coordinates must be finite numbers.');
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) throw new RangeError('Spatial chunk size must be a positive finite number.');
  return `${Math.floor(x / chunkSize)}:${Math.floor(z / chunkSize)}`;
}
