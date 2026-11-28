import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCloudPuffLayout,
  createCrystalGroveLayout,
  createCrystalMoteLayout,
  createDistantMountainLayout,
  createPeripheralPineLayout,
  createPondReedLayout,
  createWoodlandFloorLayout
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


test('woodland floor details are deterministic and distributed inside all four pine groves', () => {
  const first = createWoodlandFloorLayout(2026);
  assert.deepEqual(first, createWoodlandFloorLayout(2026));
  assert.equal(first.ferns.length, 56);
  assert.equal(first.fallenLogs.length, 8);
  assert.equal(first.stumps.length, 8);

  for (const detail of [...first.ferns, ...first.fallenLogs, ...first.stumps]) {
    assert.ok(detail.x >= WORLD_BOUNDS.minX && detail.x <= WORLD_BOUNDS.maxX);
    assert.ok(detail.z >= WORLD_BOUNDS.minZ && detail.z <= WORLD_BOUNDS.maxZ);
    assert.ok(Number.isFinite(detail.rotationY));
  }
  assert.equal(new Set(first.ferns.map(fern => fern.clusterIndex)).size, 4);
  assert.ok(first.ferns.every(fern => fern.scale > 0));
  assert.ok(first.fallenLogs.every(log => log.length > log.radius * 4));
});

test('crystal motes provide stable, varied floating points around both crystal beds', () => {
  const first = createCrystalMoteLayout(987);
  assert.deepEqual(first, createCrystalMoteLayout(987));
  assert.equal(first.length, 52);
  assert.equal(new Set(first.map(mote => mote.clusterIndex)).size, 2);
  assert.ok(new Set(first.map(mote => mote.tintIndex)).size > 1);
  for (const mote of first) {
    assert.ok(mote.x >= WORLD_BOUNDS.minX && mote.x <= WORLD_BOUNDS.maxX);
    assert.ok(mote.z >= WORLD_BOUNDS.minZ && mote.z <= WORLD_BOUNDS.maxZ);
    assert.ok(mote.height > 0 && mote.size > 0);
    assert.equal(Number.isFinite(mote.phase), true);
  }
});

test('pond reed positions are deterministic and form a ring around the moon pond', () => {
  const first = createPondReedLayout(321);
  assert.deepEqual(first, createPondReedLayout(321));
  assert.equal(first.length, 12);
  for (const reed of first) {
    const ellipseDistance = Math.hypot((reed.x + 31) / 8.9, (reed.z + 8) / 6.4);
    assert.ok(ellipseDistance > 0.88 && ellipseDistance < 1.15);
    assert.ok(reed.height > 0.6 && reed.height < 1.1);
    assert.ok(Number.isFinite(reed.lean));
  }
});
