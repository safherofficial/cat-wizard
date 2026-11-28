import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCloudPuffLayout,
  createCrystalGroveLayout,
  createDistantMountainLayout,
  createPeripheralPineLayout
} from '../src/environment-layout.js';
import { WORLD_BOUNDS } from '../src/world-map.js';

test('distant mountain layout is deterministic and forms a complete expanded horizon ring', () => {
  const first = createDistantMountainLayout(1234);
  const second = createDistantMountainLayout(1234);

  assert.deepEqual(first, second);
  assert.equal(first.length, 40);
  for (const mountain of first) {
    const radius = Math.hypot(mountain.x, mountain.z);
    assert.ok(radius >= 140 && radius <= 156);
    assert.ok(mountain.width > 0 && mountain.height > 0 && mountain.depth > 0);
    assert.equal(Number.isFinite(mountain.rotationY), true);
  }
  assert.notDeepEqual(first, createDistantMountainLayout(4321));
});

test('expanded cloud layout has sixteen coherent formations with six finite puffs each', () => {
  const first = createCloudPuffLayout(5678);
  const second = createCloudPuffLayout(5678);

  assert.deepEqual(first, second);
  assert.equal(first.length, 96);
  for (const puff of first) {
    for (const key of [
      'x', 'y', 'z', 'offsetX', 'offsetY', 'offsetZ',
      'scaleX', 'scaleY', 'scaleZ', 'phase', 'driftX', 'driftZ'
    ]) {
      assert.equal(Number.isFinite(puff[key]), true, key);
    }
    assert.ok(puff.scaleX > 0 && puff.scaleY > 0 && puff.scaleZ > 0);
    assert.match(puff.tint, /^#[0-9a-f]{6}$/i);
  }
});

test('peripheral pine forests are deterministic and remain inside playable bounds', () => {
  const first = createPeripheralPineLayout(123);
  assert.deepEqual(first, createPeripheralPineLayout(123));
  assert.equal(first.length, 44);
  for (const tree of first) {
    assert.ok(tree.x >= WORLD_BOUNDS.minX && tree.x <= WORLD_BOUNDS.maxX);
    assert.ok(tree.z >= WORLD_BOUNDS.minZ && tree.z <= WORLD_BOUNDS.maxZ);
    assert.ok(tree.scale > 0);
    assert.equal(Number.isFinite(tree.rotationY), true);
  }
});

test('crystal groves have stable, varied shards inside the expanded valley', () => {
  const first = createCrystalGroveLayout(456);
  assert.deepEqual(first, createCrystalGroveLayout(456));
  assert.equal(first.length, 44);
  assert.ok(new Set(first.map(crystal => crystal.tintIndex)).size > 1);
  for (const crystal of first) {
    assert.ok(crystal.x >= WORLD_BOUNDS.minX && crystal.x <= WORLD_BOUNDS.maxX);
    assert.ok(crystal.z >= WORLD_BOUNDS.minZ && crystal.z <= WORLD_BOUNDS.maxZ);
    assert.ok(crystal.height > 1 && crystal.width > 0);
    assert.ok(Number.isFinite(crystal.lean));
  }
});
