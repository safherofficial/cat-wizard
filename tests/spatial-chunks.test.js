import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SPATIAL_CHUNK_SIZE, spatialChunkKey } from '../src/spatial-chunks.js';

test('uses a stable default chunk size for world vegetation', () => {
  assert.equal(DEFAULT_SPATIAL_CHUNK_SIZE, 32);
  assert.equal(spatialChunkKey(1, 2), spatialChunkKey(31.9, 31.9));
});

test('separates instances into neighboring spatial cells', () => {
  assert.notEqual(spatialChunkKey(31.99, 0), spatialChunkKey(32, 0));
  assert.notEqual(spatialChunkKey(0, 31.99), spatialChunkKey(0, 32));
});

test('uses mathematical floor for negative world coordinates', () => {
  assert.equal(spatialChunkKey(-0.1, -0.1), '-1:-1');
  assert.notEqual(spatialChunkKey(-32, 0), spatialChunkKey(-32.01, 0));
});

test('rejects invalid coordinates and chunk sizes', () => {
  assert.throws(() => spatialChunkKey(Number.NaN, 0), TypeError);
  assert.throws(() => spatialChunkKey(0, Infinity), TypeError);
  assert.throws(() => spatialChunkKey(0, 0, 0), RangeError);
});
