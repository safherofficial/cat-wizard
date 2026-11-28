const PITCH_MIN = 0.2;
const PITCH_MAX = 1.16;
const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const CAMERA_ORBIT_DEFAULTS = Object.freeze({
  yaw: 0,
  pitch: 0.533,
  distance: 11.9,
  minDistance: 7.5,
  maxDistance: 18.5,
  sensitivity: 0.006,
  zoomSensitivity: 0.0012
});

export function rotateCameraOrbit(orbit, deltaX, deltaY, sensitivity = CAMERA_ORBIT_DEFAULTS.sensitivity) {
  const currentYaw = Number.isFinite(orbit?.yaw) ? orbit.yaw : CAMERA_ORBIT_DEFAULTS.yaw;
  const currentPitch = Number.isFinite(orbit?.pitch) ? orbit.pitch : CAMERA_ORBIT_DEFAULTS.pitch;
  const safeSensitivity = Number.isFinite(sensitivity) && sensitivity >= 0
    ? sensitivity
    : CAMERA_ORBIT_DEFAULTS.sensitivity;
  const safeDeltaX = Number.isFinite(deltaX) ? deltaX : 0;
  const safeDeltaY = Number.isFinite(deltaY) ? deltaY : 0;

  const rawYaw = currentYaw - safeDeltaX * safeSensitivity;
  const yaw = ((rawYaw + Math.PI) % TAU + TAU) % TAU - Math.PI;

  return {
    ...orbit,
    yaw,
    pitch: clamp(currentPitch + safeDeltaY * safeSensitivity, PITCH_MIN, PITCH_MAX)
  };
}


/**
 * Converts camera-local WASD/touch input into world-space X/Z movement.
 * Input convention is X: left(-)/right(+), Y: forward(-)/back(+).
 * A zero yaw preserves the original controls: forward is world -Z, right is world +X.
 */
export function cameraRelativeMovement(inputX, inputY, yaw = CAMERA_ORBIT_DEFAULTS.yaw) {
  const x = Number.isFinite(inputX) ? inputX : 0;
  const y = Number.isFinite(inputY) ? inputY : 0;
  const angle = Number.isFinite(yaw) ? yaw : CAMERA_ORBIT_DEFAULTS.yaw;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: x * cosine + y * sine,
    z: -x * sine + y * cosine
  };
}


export function zoomCameraOrbit(
  orbit,
  deltaY,
  sensitivity = CAMERA_ORBIT_DEFAULTS.zoomSensitivity
) {
  const currentDistance = Number.isFinite(orbit?.distance)
    ? orbit.distance
    : CAMERA_ORBIT_DEFAULTS.distance;
  const safeDelta = Number.isFinite(deltaY) ? deltaY : 0;
  const safeSensitivity = Number.isFinite(sensitivity) && sensitivity >= 0
    ? sensitivity
    : CAMERA_ORBIT_DEFAULTS.zoomSensitivity;
  const nextDistance = currentDistance * Math.exp(safeDelta * safeSensitivity);
  return {
    ...orbit,
    distance: clamp(
      nextDistance,
      CAMERA_ORBIT_DEFAULTS.minDistance,
      CAMERA_ORBIT_DEFAULTS.maxDistance
    )
  };
}

/** Smoothly approaches a target heading using the shortest angular route. */
export function dampAngle(current, target, deltaTime, response = 14) {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeTarget = Number.isFinite(target) ? target : safeCurrent;
  const safeDelta = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
  const safeResponse = Number.isFinite(response) ? Math.max(0, response) : 0;
  const difference = Math.atan2(
    Math.sin(safeTarget - safeCurrent),
    Math.cos(safeTarget - safeCurrent)
  );
  const amount = 1 - Math.exp(-safeResponse * safeDelta);
  const next = safeCurrent + difference * amount;
  return Math.atan2(Math.sin(next), Math.cos(next));
}
