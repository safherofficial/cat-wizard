import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createFrogWizardLod,
  disposeCharacterObject,
  FROG_WIZARD_LOD_DISTANCES,
  FROG_WIZARD_SCALE
} from '../src/frog-wizard.js';

function sceneWithMesh(name) {
  const scene = new THREE.Scene();
  scene.name = name;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial()
  );
  scene.add(mesh);
  return { scene, mesh };
}

test('builds near and far LOD levels from the GLB scenes', () => {
  const near = sceneWithMesh('FrogWizard_LOD0');
  const far = sceneWithMesh('FrogWizard_LOD1');
  const lod = createFrogWizardLod({ scenes: [near.scene, far.scene] });

  assert.equal(lod.isLOD, true);
  assert.equal(lod.levels.length, 2);
  assert.deepEqual(lod.levels.map(level => level.distance), [...FROG_WIZARD_LOD_DISTANCES]);
  assert.equal(lod.scale.x, FROG_WIZARD_SCALE);
  assert.equal(lod.levels[0].object.children[0], near.mesh);
  assert.equal(lod.levels[1].object.children[0], far.mesh);
  assert.equal(near.mesh.castShadow, false);
  assert.equal(far.mesh.receiveShadow, false);
  assert.equal(near.scene.children.length, 0);
});

test('accepts a single-scene GLB as a graceful one-level fallback', () => {
  const only = sceneWithMesh('FrogWizard');
  const lod = createFrogWizardLod({ scene: only.scene });

  assert.equal(lod.levels.length, 1);
  assert.equal(lod.levels[0].distance, 0);
});

test('rejects empty or non-renderable GLB scenes', () => {
  assert.throws(() => createFrogWizardLod({ scenes: [] }), /no scenes/i);
  assert.throws(() => createFrogWizardLod({ scene: new THREE.Scene() }), /no renderable meshes/i);
});

test('disposes shared LOD geometry, materials and textures once', () => {
  const texture = new THREE.Texture();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));

  let geometryDisposals = 0;
  let materialDisposals = 0;
  let textureDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  texture.addEventListener('dispose', () => textureDisposals++);

  disposeCharacterObject(root);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(textureDisposals, 1);
});
