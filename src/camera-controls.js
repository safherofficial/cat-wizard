const PITCH_MIN = 0.2;
const PITCH_MAX = 1.16;
const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const CAMERA_ORBIT_DEFAULTS = Object.freeze({
  yaw: 0,
  pitch: 0.533,
  distance: 11.9,
  sensitivity: 0.006
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
