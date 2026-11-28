#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function auditFrogWizardGlb(buffer) {
  const errors = [];
  if (!Buffer.isBuffer(buffer) || buffer.length < 28) {
    return { ok: false, errors: ['File is too small to be a GLB container.'] };
  }

  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (magic !== 'glTF' || version !== 2 || declaredLength !== buffer.length) {
    errors.push('Invalid GLB 2.0 header or declared file length.');
  }

  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength + 8 > buffer.length) {
    errors.push('Missing or truncated GLB JSON chunk.');
    return { ok: false, errors };
  }

  let document;
  try {
    document = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trim());
  } catch {
    return { ok: false, errors: [...errors, 'GLB JSON chunk is not valid JSON.'] };
  }

  const binHeader = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(binHeader);
  const binType = buffer.readUInt32LE(binHeader + 4);
  if (binType !== 0x004e4942 || binHeader + 8 + binLength > buffer.length) {
    errors.push('Missing or truncated GLB binary chunk.');
  }

  const scenes = document.scenes || [];
  const meshes = document.meshes || [];
  if (scenes.length < 2 || meshes.length < 2) {
    errors.push('Expected two scenes and two mesh representations for runtime LOD.');
  }
  if (document.asset?.extras?.license?.spdx !== 'CC-BY-4.0') {
    errors.push('CC BY 4.0 attribution metadata is missing.');
  }
  if ((document.images || []).length < 2) {
    errors.push('Expected the embedded base-color and metallic-roughness textures.');
  }

  const levels = meshes.map(mesh => {
    const primitive = mesh.primitives?.[0];
    const indexAccessor = primitive?.indices;
    const accessor = document.accessors?.[indexAccessor];
    const triangleCount = accessor?.count ? Math.floor(accessor.count / 3) : 0;
    return { name: mesh.name || 'unnamed', triangleCount };
  });

  if (levels.some(level => level.triangleCount <= 0)) {
    errors.push('One or more LOD meshes has no indexed triangles.');
  }
  if (levels[0] && levels[1] && levels[1].triangleCount >= levels[0].triangleCount) {
    errors.push('Far LOD must contain fewer triangles than the near LOD.');
  }
  if (levels[0]?.name !== 'FrogWizard_LOD0' || levels[1]?.name !== 'FrogWizard_LOD1') {
    errors.push('Expected FrogWizard_LOD0 and FrogWizard_LOD1 mesh names.');
  }

  return {
    ok: errors.length === 0,
    errors,
    fileBytes: buffer.length,
    scenes: scenes.map(scene => scene.name),
    levels,
    textureCount: (document.images || []).length,
    license: document.asset?.extras?.license?.spdx || 'missing'
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/audit-frog-wizard-glb.js <frog-wizard-lods.glb>');
    process.exitCode = 2;
  } else {
    try {
      const report = auditFrogWizardGlb(fs.readFileSync(filePath));
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
    } catch (error) {
      console.error('[FAIL] ' + error.message);
      process.exitCode = 1;
    }
  }
}
