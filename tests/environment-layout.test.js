import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCloudPuffLayout,
  createDistantMountainLayout
} from '../src/environment-layout.js';

test('distant mountain layout is deterministic and forms a complete horizon ring', () => {
  const first = createDistantMountainLayout(1234);
  const second = createDistantMountainLayout(1234);

  assert.deepEqual(first, second);
  assert.equal(first.length, 30);
  for (const mountain of first) {
    const radius = Math.hypot(mountain.x, mountain.z);
    assert.ok(radius >= 91 && radius <= 104);
    assert.ok(mountain.width > 0 && mountain.height > 0 && mountain.depth > 0);
    assert.equal(Number.isFinite(mountain.rotationY), true);
  }
  assert.notDeepEqual(first, createDistantMountainLayout(4321));
});

test('cloud layout contains nine coherent formations with six finite puffs each', () => {
  const first = createCloudPuffLayout(5678);
  const second = createCloudPuffLayout(5678);

  assert.deepEqual(first, second);
  assert.equal(first.length, 54);
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
