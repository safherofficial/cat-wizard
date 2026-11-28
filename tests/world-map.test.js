import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BOUNDS, WORLD_SIZE, clampWorldPosition } from '../src/world-map.js';

test('world bounds define a larger continuous exploration area', () => {
  assert.equal(WORLD_BOUNDS.minX, -48);
  assert.equal(WORLD_BOUNDS.maxX, 48);
  assert.equal(WORLD_BOUNDS.minZ, -38);
  assert.equal(WORLD_BOUNDS.maxZ, 38);
  assert.equal(WORLD_SIZE.width, 100);
  assert.equal(WORLD_SIZE.depth, 80);
});

test('world movement stays inside the map while preserving requested coordinates', () => {
  assert.deepEqual(clampWorldPosition(12, -24), { x: 12, z: -24 });
  assert.deepEqual(clampWorldPosition(-80, 90), { x: -48, z: 38 });
});

test('world movement can reserve a safe margin around the natural map edge', () => {
  assert.deepEqual(clampWorldPosition(60, -60, 1.5), { x: 46.5, z: -36.5 });
});

test('invalid coordinates are safely centered and invalid margins are rejected', () => {
  assert.deepEqual(clampWorldPosition(Number.NaN, Number.POSITIVE_INFINITY), { x: 0, z: 0 });
  assert.throws(() => clampWorldPosition(0, 0, 50), RangeError);
});
