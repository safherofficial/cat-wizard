const EPSILON = 1e-8;

export function closestPointOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared <= EPSILON
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  const x = start.x + dx * t;
  const z = start.z + dz * t;
  return { x, z, t, distance: Math.hypot(point.x - x, point.z - z) };
}

export function segmentCircleIntersection(start, end, center, radius) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const fx = start.x - center.x;
  const fz = start.z - center.z;
  const a = dx * dx + dz * dz;
  const c = fx * fx + fz * fz - Math.max(0, radius) ** 2;
  if (c <= 0) return 0;
  if (a <= EPSILON) return null;
  const b = 2 * (fx * dx + fz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function radialFalloff(distance, radius, minimum = 0) {
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || distance < 0 || radius <= 0 || distance >= radius) return 0;
  const floor = Math.max(0, Math.min(1, minimum));
  const remaining = 1 - distance / radius;
  return floor + (1 - floor) * remaining * remaining;
}

export function vortexAcceleration(position, center, radius = 5.8, pull = 9.5, swirl = 3.8) {
  const dx = center.x - position.x;
  const dz = center.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= EPSILON || distance >= radius || radius <= 0) return { x: 0, z: 0 };
  const nx = dx / distance;
  const nz = dz / distance;
  const falloff = (1 - distance / radius) ** 2;
  return {
    x: (nx * pull - nz * swirl) * falloff,
    z: (nz * pull + nx * swirl) * falloff
  };
}

export function resolveCircleCollision(a, b, restitution = .3, friction = .16) {
  const dx = b.position.x - a.position.x;
  const dz = b.position.z - a.position.z;
  const minimumDistance = a.radius + b.radius;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared >= minimumDistance * minimumDistance) return false;

  const distance = Math.sqrt(Math.max(distanceSquared, EPSILON));
  const nx = distanceSquared > EPSILON ? dx / distance : 1;
  const nz = distanceSquared > EPSILON ? dz / distance : 0;
  const inverseMassA = a.frozen ? 0 : 1 / Math.max(.001, a.mass || 1);
  const inverseMassB = b.frozen ? 0 : 1 / Math.max(.001, b.mass || 1);
  const inverseMassSum = inverseMassA + inverseMassB;
  if (inverseMassSum <= 0) return false;

  const penetration = minimumDistance - distance;
  const correction = Math.max(0, penetration - .002) * .9 / inverseMassSum;
  a.position.x -= nx * correction * inverseMassA;
  a.position.z -= nz * correction * inverseMassA;
  b.position.x += nx * correction * inverseMassB;
  b.position.z += nz * correction * inverseMassB;

  let relativeX = b.velocity.x - a.velocity.x;
  let relativeZ = b.velocity.y - a.velocity.y;
  const normalVelocity = relativeX * nx + relativeZ * nz;
  if (normalVelocity >= 0) return true;

  const normalImpulse = -(1 + Math.max(0, Math.min(1, restitution))) * normalVelocity / inverseMassSum;
  a.velocity.x -= normalImpulse * inverseMassA * nx;
  a.velocity.y -= normalImpulse * inverseMassA * nz;
  b.velocity.x += normalImpulse * inverseMassB * nx;
  b.velocity.y += normalImpulse * inverseMassB * nz;

  relativeX = b.velocity.x - a.velocity.x;
  relativeZ = b.velocity.y - a.velocity.y;
  const tangentVelocity = relativeX * -nz + relativeZ * nx;
  if (Math.abs(tangentVelocity) > EPSILON) {
    const tx = -nz * Math.sign(tangentVelocity);
    const tz = nx * Math.sign(tangentVelocity);
    const rawFrictionImpulse = -tangentVelocity / inverseMassSum;
    const maxFrictionImpulse = normalImpulse * Math.max(0, Math.min(1, friction));
    const frictionImpulse = Math.max(-maxFrictionImpulse, Math.min(maxFrictionImpulse, rawFrictionImpulse));
    a.velocity.x -= frictionImpulse * inverseMassA * tx;
    a.velocity.y -= frictionImpulse * inverseMassA * tz;
    b.velocity.x += frictionImpulse * inverseMassB * tx;
    b.velocity.y += frictionImpulse * inverseMassB * tz;
  }
  return true;
}
