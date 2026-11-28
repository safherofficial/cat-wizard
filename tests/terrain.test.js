import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainElevationAt } from '../src/terrain.js';

test('central clearing, footpaths and landmark pads stay level', () => {
  for (const [x, z] of [[0, 0], [0, 12], [-31, -8], [1, -31], [0, 50]]) {
    assert.ok(Math.abs(terrainElevationAt(x, z)) < 0.0001, `expected flat ground at ${x}, ${z}`);
  }
});

test('outer meadow contains both gentle rises and shallow basins', () => {
  const samples = [
    terrainElevationAt(-49, 29),
    terrainElevationAt(48, 30),
    terrainElevationAt(43, -43),
    terrainElevationAt(-56, 1),
    terrainElevationAt(52, 5)
  ];
  assert.ok(Math.max(...samples) > 0.45);
  assert.ok(Math.min(...samples) < -0.08);
  assert.ok(samples.every(Number.isFinite));
});

test('terrain profile is finite, bounded and gradual throughout the playable map', () => {
  let minimum = Infinity;
  let maximum = -Infinity;
  let steepestStep = 0;

  for (let x = -72; x <= 72; x += 2) {
    for (let z = -58; z <= 58; z += 2) {
      const height = terrainElevationAt(x, z);
      assert.ok(Number.isFinite(height));
      minimum = Math.min(minimum, height);
      maximum = Math.max(maximum, height);
      steepestStep = Math.max(
        steepestStep,
        Math.abs(height - terrainElevationAt(x + 0.5, z)),
        Math.abs(height - terrainElevationAt(x, z + 0.5))
      );
    }
  }

  assert.ok(minimum > -0.8);
  assert.ok(maximum < 1.7);
  assert.ok(steepestStep < 0.19);
});

test('invalid coordinates safely resolve to the central clearing', () => {
  assert.equal(terrainElevationAt(Number.NaN, Number.POSITIVE_INFINITY), 0);
});
