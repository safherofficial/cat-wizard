import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BOUNDS, WORLD_SIZE, clampWorldPosition } from '../src/world-map.js';

test('world bounds define the expanded 148 by 120 exploration area', () => {
  assert.equal(WORLD_BOUNDS.minX, -72);
  assert.equal(WORLD_BOUNDS.maxX, 72);
  assert.equal(WORLD_BOUNDS.minZ, -58);
  assert.equal(WORLD_BOUNDS.maxZ, 58);
  assert.equal(WORLD_SIZE.width, 148);
  assert.equal(WORLD_SIZE.depth, 120);
});

test('world movement stays inside the map while preserving requested coordinates', () => {
  assert.deepEqual(clampWorldPosition(12, -24), { x: 12, z: -24 });
  assert.deepEqual(clampWorldPosition(-80, 90), { x: -72, z: 58 });
});

test('world movement can reserve a safe margin around the natural map edge', () => {
  assert.deepEqual(clampWorldPosition(80, -70, 1.5), { x: 70.5, z: -56.5 });
});

test('invalid coordinates are safely centered and invalid margins are rejected', () => {
  assert.deepEqual(clampWorldPosition(Number.NaN, Number.POSITIVE_INFINITY), { x: 0, z: 0 });
  assert.throws(() => clampWorldPosition(0, 0, 73), RangeError);
});
