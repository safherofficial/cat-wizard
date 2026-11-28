import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_ORBIT_DEFAULTS, rotateCameraOrbit } from '../src/camera-controls.js';

test('camera starts at a stable, elevated follow angle', () => {
  assert.equal(CAMERA_ORBIT_DEFAULTS.yaw, 0);
  assert.ok(CAMERA_ORBIT_DEFAULTS.pitch > 0.4 && CAMERA_ORBIT_DEFAULTS.pitch < 0.7);
  assert.ok(CAMERA_ORBIT_DEFAULTS.distance > 10);
});

test('horizontal mouse drag rotates the camera around the player', () => {
  const next = rotateCameraOrbit(CAMERA_ORBIT_DEFAULTS, 100, 0);
  assert.ok(next.yaw < 0);
  assert.equal(next.pitch, CAMERA_ORBIT_DEFAULTS.pitch);
  assert.equal(next.distance, CAMERA_ORBIT_DEFAULTS.distance);
});

test('vertical mouse drag changes camera elevation within safe limits', () => {
  const higher = rotateCameraOrbit(CAMERA_ORBIT_DEFAULTS, 0, 1000);
  const lower = rotateCameraOrbit(CAMERA_ORBIT_DEFAULTS, 0, -1000);
  assert.ok(higher.pitch <= 1.16);
  assert.ok(lower.pitch >= 0.2);
});

test('yaw wraps so long camera drags do not grow without bound', () => {
  const next = rotateCameraOrbit({ ...CAMERA_ORBIT_DEFAULTS, yaw: Math.PI - 0.01 }, -100, 0);
  assert.ok(next.yaw >= -Math.PI && next.yaw < Math.PI);
});

test('non-finite mouse deltas do not corrupt the camera orbit', () => {
  const next = rotateCameraOrbit(CAMERA_ORBIT_DEFAULTS, Number.NaN, Number.POSITIVE_INFINITY);
  assert.equal(next.yaw, CAMERA_ORBIT_DEFAULTS.yaw);
  assert.equal(next.pitch, CAMERA_ORBIT_DEFAULTS.pitch);
});
