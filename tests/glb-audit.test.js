import test from 'node:test';
import assert from 'node:assert/strict';
import { auditGlbBuffer, parseGlbBuffer, EXPECTED_BONES, EXPECTED_CLIPS } from '../scripts/audit-catwizard-glb.js';

function makeGlb(document) {
  const json = Buffer.from(JSON.stringify(document), 'utf8');
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  const binary = Buffer.alloc(4);
  const totalLength = 12 + 8 + paddedJson.length + 8 + binary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(paddedJson.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, paddedJson, binHeader, binary]);
}

function validDocument() {
  const nodes = EXPECTED_BONES.map(name => ({ name, children: [] }));
  const boneIndex = Object.fromEntries(EXPECTED_BONES.map((name, index) => [name, index]));
  const parents = {
    Body: 'Root', Head: 'Body', Hat: 'Head', 'Ear.L': 'Head', 'Ear.R': 'Head',
    'Arm.L': 'Body', 'Arm.R': 'Body', 'Leg.L': 'Body', 'Leg.R': 'Body',
    Tail: 'Body', 'Tail.Tip': 'Tail', Cape: 'Body'
  };
  for (const [child, parent] of Object.entries(parents)) {
    nodes[boneIndex[parent]].children.push(boneIndex[child]);
  }
  nodes[boneIndex.Body].children.push(nodes.length);
  nodes.push({ name: 'Robe mesh', mesh: 0 });

  return {
    asset: { version: '2.0', generator: 'Cat Wizard test fixture' },
    scene: 0,
    scenes: [{ nodes: [boneIndex.Root] }],
    nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 2 } }] }],
    buffers: [{ byteLength: 4 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 2, type: 'SCALAR' },
      { bufferView: 0, componentType: 5126, count: 2, type: 'VEC4' },
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }
    ],
    animations: EXPECTED_CLIPS.map(name => ({
      name,
      samplers: [{ input: 0, output: 1 }],
      channels: [{ sampler: 0, target: { node: boneIndex.Head, path: 'rotation' } }]
    }))
  };
}

test('parses a version 2 GLB container and its two chunks', () => {
  const parsed = parseGlbBuffer(makeGlb(validDocument()));
  assert.equal(parsed.json.asset.version, '2.0');
  assert.equal(parsed.binaryLength, 4);
});

test('accepts a structurally valid Cat Wizard GLB contract', () => {
  const report = auditGlbBuffer(makeGlb(validDocument()));
  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.equal(report.summary.bonesFound, 13);
  assert.equal(report.summary.meshes, 1);
  assert.deepEqual(report.summary.animations, EXPECTED_CLIPS);
});

test('rejects a GLB missing required animation clips', () => {
  const document = validDocument();
  document.animations = document.animations.filter(animation => animation.name !== 'Hit');
  const report = auditGlbBuffer(makeGlb(document));
  assert.equal(report.ok, false);
  assert.match(report.errors.join(' '), /Hit/);
});

test('rejects a malformed GLB header', () => {
  const malformed = makeGlb(validDocument());
  malformed.writeUInt32LE(0, 0);
  assert.throws(() => parseGlbBuffer(malformed), /magic/);
});

test('reports missing expected rig nodes as a warning, not a false pass/fail for packaging', () => {
  const document = validDocument();
  document.nodes = document.nodes.filter(node => node.name !== 'Tail.Tip');
  const report = auditGlbBuffer(makeGlb(document));
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some(warning => warning.includes('Tail.Tip')));
});
