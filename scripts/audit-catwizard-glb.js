#!/usr/bin/env node
/**
 * Blender-independent structural check for Cat Wizard GLB exports.
 *
 * This verifies the GLB container and the game-facing scene/animation contract.
 * It does not replace Blender's visual review, a glTF validator, or a Three.js playtest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED_CLIPS = Object.freeze(['Idle', 'Walk', 'Run', 'Cast', 'Hit']);
export const EXPECTED_BONES = Object.freeze([
  'Root', 'Body', 'Head', 'Hat', 'Ear.L', 'Ear.R',
  'Arm.L', 'Arm.R', 'Leg.L', 'Leg.R', 'Tail', 'Tail.Tip', 'Cape'
]);

const GLB_MAGIC = 0x46546c67; // "glTF" in little-endian
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function fail(message) {
  throw new Error(message);
}

export function parseGlbBuffer(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length < 20) fail('File is too small to be a valid GLB.');
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) fail('Invalid GLB magic; expected "glTF".');

  const version = bytes.readUInt32LE(4);
  if (version !== 2) fail('Unsupported GLB version: ' + version + '. Expected 2.');

  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength !== bytes.length) {
    fail('GLB length mismatch: header says ' + declaredLength + ', actual ' + bytes.length + '.');
  }

  let offset = 12;
  let json = null;
  let binaryLength = 0;
  let chunkIndex = 0;

  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail('Truncated GLB chunk header.');
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkLength % 4 !== 0) fail('GLB chunk length is not 4-byte aligned.');
    if (offset + chunkLength > bytes.length) fail('GLB chunk extends beyond the file.');

    const chunk = bytes.subarray(offset, offset + chunkLength);
    if (chunkIndex === 0 && chunkType !== JSON_CHUNK) {
      fail('The first GLB chunk must contain JSON.');
    }

    if (chunkType === JSON_CHUNK) {
      if (json !== null) fail('GLB contains more than one JSON chunk.');
      try {
        json = JSON.parse(chunk.toString('utf8').replace(/[\\u0000\\u0020]+$/u, ''));
      } catch (error) {
        fail('GLB JSON chunk is invalid: ' + error.message);
      }
    } else if (chunkType === BIN_CHUNK) {
      if (binaryLength !== 0) fail('GLB contains more than one BIN chunk.');
      binaryLength = chunkLength;
    }
    offset += chunkLength;
    chunkIndex += 1;
  }

  if (!json) fail('GLB has no JSON chunk.');
  return { json, binaryLength, byteLength: bytes.length };
}

export function auditGlbBuffer(input) {
  const { json, binaryLength, byteLength } = parseGlbBuffer(input);
  const errors = [];
  const warnings = [];
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  const animations = Array.isArray(json.animations) ? json.animations : [];
  const accessors = Array.isArray(json.accessors) ? json.accessors : [];
  const bufferViews = Array.isArray(json.bufferViews) ? json.bufferViews : [];
  const buffers = Array.isArray(json.buffers) ? json.buffers : [];

  if (json.asset?.version !== '2.0') errors.push('glTF asset.version must be "2.0".');
  if (buffers.length !== 1) errors.push('Expected exactly one embedded GLB buffer; found ' + buffers.length + '.');
  if (buffers[0]) {
    if (buffers[0].uri) errors.push('GLB buffer must not reference an external URI.');
    if (Number(buffers[0].byteLength) > binaryLength) {
      errors.push('Declared buffer byteLength exceeds the embedded BIN chunk.');
    }
  } else {
    errors.push('GLB has no buffer definition.');
  }

  for (const [index, view] of bufferViews.entries()) {
    if (!Number.isInteger(view.buffer) || view.buffer < 0 || view.buffer >= buffers.length) {
      errors.push('bufferView ' + index + ' references an invalid buffer.');
    }
    if (!Number.isInteger(view.byteLength) || view.byteLength < 0) {
      errors.push('bufferView ' + index + ' has an invalid byteLength.');
    }
    const bufferLength = buffers[view.buffer]?.byteLength ?? 0;
    const end = (view.byteOffset || 0) + (view.byteLength || 0);
    if (end > bufferLength) errors.push('bufferView ' + index + ' exceeds its buffer bounds.');
  }

  for (const [index, accessor] of accessors.entries()) {
    if (!Number.isInteger(accessor.count) || accessor.count < 1) {
      errors.push('Accessor ' + index + ' has an invalid element count.');
    }
    if (accessor.bufferView !== undefined &&
        (!Number.isInteger(accessor.bufferView) || accessor.bufferView < 0 || accessor.bufferView >= bufferViews.length)) {
      errors.push('Accessor ' + index + ' references an invalid bufferView.');
    }
  }

  let primitiveCount = 0;
  let triangleCount = 0;
  for (const [meshIndex, mesh] of meshes.entries()) {
    if (!Array.isArray(mesh.primitives) || mesh.primitives.length === 0) {
      errors.push('Mesh ' + meshIndex + ' contains no primitives.');
      continue;
    }
    for (const primitive of mesh.primitives) {
      primitiveCount += 1;
      const positionAccessor = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessor) || !accessors[positionAccessor]) {
        errors.push('Mesh ' + meshIndex + ' has a primitive without a valid POSITION accessor.');
      }
      if (primitive.indices !== undefined &&
          (!Number.isInteger(primitive.indices) || !accessors[primitive.indices])) {
        errors.push('Mesh ' + meshIndex + ' references an invalid index accessor.');
      }
      const mode = primitive.mode ?? 4;
      if (mode === 4) {
        const elementCount = primitive.indices !== undefined
          ? accessors[primitive.indices]?.count
          : accessors[positionAccessor]?.count;
        if (Number.isInteger(elementCount)) triangleCount += Math.floor(elementCount / 3);
      }
      if (primitive.material !== undefined &&
          (!Number.isInteger(primitive.material) || !json.materials?.[primitive.material])) {
        errors.push('Mesh ' + meshIndex + ' references an invalid material.');
      }
    }
  }
  if (meshes.length === 0 || primitiveCount === 0) errors.push('GLB contains no renderable mesh primitives.');

  for (const [index, node] of nodes.entries()) {
    if (node.mesh !== undefined && (!Number.isInteger(node.mesh) || !meshes[node.mesh])) {
      errors.push('Node ' + index + ' references an invalid mesh.');
    }
    if (node.skin !== undefined &&
        (!Number.isInteger(node.skin) || !json.skins?.[node.skin])) {
      errors.push('Node ' + index + ' references an invalid skin.');
    }
    for (const child of node.children || []) {
      if (!Number.isInteger(child) || child < 0 || child >= nodes.length) {
        errors.push('Node ' + index + ' contains an invalid child index.');
      }
    }
  }

  const nodeNames = new Set(nodes.map(node => node.name).filter(Boolean));
  const expectedBoneNames = new Set(EXPECTED_BONES);
  const missingBones = EXPECTED_BONES.filter(name => !nodeNames.has(name));
  if (missingBones.length) {
    errors.push('Required rig nodes missing from GLB: ' + missingBones.join(', ') + '.');
  }

  const actualAnimations = animations.map(animation => animation.name || '<unnamed>');
  const missingClips = EXPECTED_CLIPS.filter(expected =>
    !actualAnimations.some(name => name.toLowerCase().includes(expected.toLowerCase()))
  );
  if (missingClips.length) {
    errors.push('Required animation clips missing: ' + missingClips.join(', ') + '.');
  }

  for (const [animationIndex, animation] of animations.entries()) {
    const samplers = Array.isArray(animation.samplers) ? animation.samplers : [];
    const channels = Array.isArray(animation.channels) ? animation.channels : [];
    if (!samplers.length || !channels.length) {
      errors.push('Animation ' + (animation.name || animationIndex) + ' has no samplers or channels.');
      continue;
    }
    for (const [channelIndex, channel] of channels.entries()) {
      if (!Number.isInteger(channel.sampler) || !samplers[channel.sampler]) {
        errors.push('Animation ' + animationIndex + ' channel ' + channelIndex + ' references an invalid sampler.');
      }
      if (!Number.isInteger(channel.target?.node) || !nodes[channel.target.node]) {
        errors.push('Animation ' + animationIndex + ' channel ' + channelIndex + ' targets an invalid node.');
      }
      if (!['translation', 'rotation', 'scale', 'weights'].includes(channel.target?.path)) {
        errors.push('Animation ' + animationIndex + ' channel ' + channelIndex + ' has an invalid target path.');
      }
    }
    for (const [samplerIndex, sampler] of samplers.entries()) {
      if (!Number.isInteger(sampler.input) || !accessors[sampler.input] ||
          !Number.isInteger(sampler.output) || !accessors[sampler.output]) {
        errors.push('Animation ' + animationIndex + ' sampler ' + samplerIndex + ' references an invalid accessor.');
      }
    }
  }

  const externalImages = (json.images || []).filter(image => image.uri && !image.uri.startsWith('data:'));
  if (externalImages.length) {
    warnings.push(externalImages.length + ' image resource(s) reference external URIs.');
  }

  const nodeParent = new Map();
  nodes.forEach((node, parentIndex) => {
    for (const childIndex of node.children || []) {
      if (!nodeParent.has(childIndex)) nodeParent.set(childIndex, parentIndex);
    }
  });
  const expectedParents = {
    Body: 'Root', Head: 'Body', Hat: 'Head', 'Ear.L': 'Head', 'Ear.R': 'Head',
    'Arm.L': 'Body', 'Arm.R': 'Body', 'Leg.L': 'Body', 'Leg.R': 'Body',
    Tail: 'Body', 'Tail.Tip': 'Tail', Cape: 'Body'
  };
  const nodeIndexByName = new Map(nodes.map((node, index) => [node.name, index]));
  for (const [childName, parentName] of Object.entries(expectedParents)) {
    const childIndex = nodeIndexByName.get(childName);
    const parentIndex = nodeIndexByName.get(parentName);
    if (childIndex !== undefined && parentIndex !== undefined && nodeParent.get(childIndex) !== parentIndex) {
      errors.push('Rig hierarchy mismatch: ' + childName + ' must be parented to ' + parentName + '.');
    }
  }

  // Character 02 uses rigid objects parented to armature bones, not weighted
  // meshes. In glTF those objects must be regular mesh nodes below the joint
  // nodes, so validate the exported attachment instead of looking for skins.
  const meshNodeIndices = nodes
    .map((node, index) => node.mesh !== undefined ? index : -1)
    .filter(index => index >= 0);
  const boneBoundMeshIndices = meshNodeIndices.filter(index => {
    const parentIndex = nodeParent.get(index);
    return parentIndex !== undefined && expectedBoneNames.has(nodes[parentIndex]?.name);
  });
  const detachedMeshNodes = meshNodeIndices.filter(index => !boneBoundMeshIndices.includes(index));
  if (detachedMeshNodes.length) {
    errors.push(detachedMeshNodes.length + ' mesh node(s) are not direct children of an expected rig bone.');
  }

  return {
    ok: errors.length === 0,
    summary: {
      fileBytes: byteLength,
      nodes: nodes.length,
      bonesFound: EXPECTED_BONES.length - missingBones.length,
      expectedBones: EXPECTED_BONES.length,
      meshes: meshes.length,
      boneBoundMeshes: boneBoundMeshIndices.length,
      primitives: primitiveCount,
      triangles: triangleCount,
      materials: (json.materials || []).length,
      animations: actualAnimations,
      binaryBytes: binaryLength
    },
    errors,
    warnings
  };
}

function printReport(report, filePath) {
  const s = report.summary;
  console.log('CAT WIZARD | GLB STRUCTURAL AUDIT');
  console.log('File: ' + path.resolve(filePath));
  console.log('Size: ' + s.fileBytes + ' bytes | BIN: ' + s.binaryBytes + ' bytes');
  console.log('Nodes: ' + s.nodes + ' | Bones found: ' + s.bonesFound + '/' + s.expectedBones);
  console.log('Meshes: ' + s.meshes + ' | Primitives: ' + s.primitives + ' | Approx. triangles: ' + s.triangles);
  console.log('Materials: ' + s.materials);
  console.log('Animations: ' + (s.animations.join(', ') || 'none'));
  for (const warning of report.warnings) console.warn('[WARN] ' + warning);
  for (const error of report.errors) console.error('[FAIL] ' + error);
  console.log(report.ok ? 'RESULT: PASS (structural checks only)' : 'RESULT: FAIL');
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/audit-catwizard-glb.js <character.glb>');
    process.exitCode = 2;
  } else {
    try {
      const report = auditGlbBuffer(fs.readFileSync(filePath));
      printReport(report, filePath);
      if (!report.ok) process.exitCode = 1;
    } catch (error) {
      console.error('[FAIL] ' + error.message);
      process.exitCode = 1;
    }
  }
}
