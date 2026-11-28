import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_ORBIT_DEFAULTS, cameraRelativeMovement, dampAngle, rotateCameraOrbit, zoomCameraOrbit } from '../src/camera-controls.js';

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


test('camera-relative WASD preserves the original forward and right directions at zero yaw', () => {
  assert.deepEqual(cameraRelativeMovement(0, -1, 0), { x: 0, z: -1 });
  assert.deepEqual(cameraRelativeMovement(1, 0, 0), { x: 1, z: 0 });
  assert.deepEqual(cameraRelativeMovement(0, 1, 0), { x: 0, z: 1 });
  assert.deepEqual(cameraRelativeMovement(-1, 0, 0), { x: -1, z: 0 });
});

test('forward and strafe rotate with the camera yaw', () => {
  const quarterTurnForward = cameraRelativeMovement(0, -1, Math.PI / 2);
  const quarterTurnRight = cameraRelativeMovement(1, 0, Math.PI / 2);

  assert.ok(Math.abs(quarterTurnForward.x + 1) < 1e-10);
  assert.ok(Math.abs(quarterTurnForward.z) < 1e-10);
  assert.ok(Math.abs(quarterTurnRight.x) < 1e-10);
  assert.ok(Math.abs(quarterTurnRight.z + 1) < 1e-10);
});

test('diagonal camera-relative movement keeps its magnitude', () => {
  const input = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
  for (const yaw of [0, Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const output = cameraRelativeMovement(input.x, input.y, yaw);
    assert.ok(Math.abs(Math.hypot(output.x, output.z) - 1) < 1e-10);
  }
});

test('non-finite movement input or yaw safely falls back to neutral values', () => {
  assert.deepEqual(cameraRelativeMovement(Number.NaN, Number.POSITIVE_INFINITY, Math.PI / 2), { x: 0, z: 0 });
  assert.deepEqual(cameraRelativeMovement(0, -1, Number.NaN), { x: 0, z: -1 });
});


test('mouse wheel zoom moves the camera smoothly within safe distances', () => {
  const closer = zoomCameraOrbit(CAMERA_ORBIT_DEFAULTS, -120);
  const farther = zoomCameraOrbit(CAMERA_ORBIT_DEFAULTS, 120);
  assert.ok(closer.distance < CAMERA_ORBIT_DEFAULTS.distance);
  assert.ok(farther.distance > CAMERA_ORBIT_DEFAULTS.distance);
  assert.ok(closer.distance >= CAMERA_ORBIT_DEFAULTS.minDistance);
  assert.ok(farther.distance <= CAMERA_ORBIT_DEFAULTS.maxDistance);
});

test('camera zoom clamps at both distance limits and ignores invalid wheel input', () => {
  const closeLimit = zoomCameraOrbit({ ...CAMERA_ORBIT_DEFAULTS, distance: 2 }, -1000);
  const farLimit = zoomCameraOrbit({ ...CAMERA_ORBIT_DEFAULTS, distance: 60 }, 1000);
  const unchanged = zoomCameraOrbit(CAMERA_ORBIT_DEFAULTS, Number.NaN);
  assert.equal(closeLimit.distance, CAMERA_ORBIT_DEFAULTS.minDistance);
  assert.equal(farLimit.distance, CAMERA_ORBIT_DEFAULTS.maxDistance);
  assert.equal(unchanged.distance, CAMERA_ORBIT_DEFAULTS.distance);
});

test('character heading damping takes the shortest route across the angle wrap', () => {
  const current = Math.PI - 0.08;
  const target = -Math.PI + 0.08;
  const next = dampAngle(current, target, 0.05, 14);
  const remaining = Math.atan2(Math.sin(target-next),Math.cos(target-next));
  assert.ok(Math.abs(remaining) < 0.16);
  assert.ok(Math.abs(next) > 3);
});

test('character heading damping is stable for zero time and invalid targets', () => {
  assert.equal(dampAngle(1.2, 2.4, 0), 1.2);
  assert.equal(dampAngle(1.2, Number.NaN, 0.1), 1.2);
  assert.equal(dampAngle(Number.NaN, 2.4, 0), 0);
});
