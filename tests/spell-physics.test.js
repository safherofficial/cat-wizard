import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closestPointOnSegment,
  radialFalloff,
  resolveCircleCollision,
  segmentCircleIntersection,
  vortexAcceleration
} from '../src/spell-physics.js';

test('fireball swept collision finds the first entry into a prop radius', () => {
  const t = segmentCircleIntersection({ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 0 }, 1);
  assert.ok(Math.abs(t - .25) < 1e-8);
});
test('fireball swept collision ignores props outside its path', () => {
  assert.equal(segmentCircleIntersection({ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }, .5), null);
});
test('swept collision registers immediate contact when starting inside a prop', () => {
  assert.equal(segmentCircleIntersection({ x: 0, z: 0 }, { x: 2, z: 0 }, { x: .2, z: 0 }, .5), 0);
});
test('lightning finds the closest point on a finite strike segment', () => {
  const point = closestPointOnSegment({ x: 3, z: 2 }, { x: 0, z: 0 }, { x: 4, z: 0 });
  assert.equal(point.t, .75);
  assert.equal(point.x, 3);
  assert.equal(point.z, 0);
  assert.equal(point.distance, 2);
});
test('radial impulse falls off quadratically and is zero outside the radius', () => {
  assert.equal(radialFalloff(0, 4), 1);
  assert.equal(radialFalloff(2, 4), .25);
  assert.equal(radialFalloff(4, 4), 0);
  assert.equal(radialFalloff(5, 4), 0);
});
test('gravity combines inward pull and tangential swirl with smooth range falloff', () => {
  const force = vortexAcceleration({ x: 2, z: 0 }, { x: 0, z: 0 }, 5, 10, 4);
  assert.ok(force.x < 0);
  assert.ok(force.z < 0);
  assert.deepEqual(vortexAcceleration({ x: 6, z: 0 }, { x: 0, z: 0 }, 5, 10, 4), { x: 0, z: 0 });
});
test('prop collision separates overlapping bodies and transfers momentum', () => {
  const a = { position: { x: 0, z: 0 }, velocity: { x: 1, y: 0 }, radius: 1, mass: 1 };
  const b = { position: { x: 1.5, z: 0 }, velocity: { x: 0, y: 0 }, radius: 1, mass: 1 };
  assert.equal(resolveCircleCollision(a, b), true);
  assert.ok(a.position.x < 0);
  assert.ok(b.position.x > 1.5);
  assert.ok(a.velocity.x < 1);
  assert.ok(b.velocity.x > 0);
});
test('frozen props act as static collision bodies', () => {
  const frozen = { position: { x: 0, z: 0 }, velocity: { x: 0, y: 0 }, radius: 1, mass: 1, frozen: true };
  const moving = { position: { x: 1.5, z: 0 }, velocity: { x: -1, y: 0 }, radius: 1, mass: 1 };
  assert.equal(resolveCircleCollision(frozen, moving), true);
  assert.equal(frozen.position.x, 0);
  assert.ok(moving.position.x > 1.5);
  assert.ok(moving.velocity.x > 0);
});
