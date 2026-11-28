import * as THREE from 'three';

export const FROG_WIZARD_SCALE = 2.7;
export const FROG_WIZARD_LOD_DISTANCES = Object.freeze([0, 14]);

function takeSceneMeshes(sourceScene, level) {
  if (!sourceScene?.isObject3D) {
    throw new TypeError(`Frog Wizard LOD ${level} is not a Three.js scene.`);
  }

  const modelRoot = new THREE.Group();
  modelRoot.name = level === 0 ? 'FrogWizard_Near' : 'FrogWizard_Far';
  for (const child of [...sourceScene.children]) modelRoot.add(child);

  let meshCount = 0;
  modelRoot.traverse(node => {
    if (!node.isMesh) return;
    meshCount += 1;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
    if (node.geometry && !node.geometry.boundingSphere) {
      node.geometry.computeBoundingSphere();
    }
  });

  if (meshCount === 0) {
    throw new Error(`Frog Wizard LOD ${level} contains no renderable meshes.`);
  }
  return modelRoot;
}

/**
 * The optimized GLB stores near and far representations as separate scenes.
 * They share the original PBR material and texture images; only one LOD is
 * rendered at a time. The source asset has no skeleton or animation clips.
 */
export function createFrogWizardLod(gltf) {
  const scenes = Array.isArray(gltf?.scenes)
    ? gltf.scenes
    : gltf?.scene
      ? [gltf.scene]
      : [];

  if (scenes.length === 0) {
    throw new TypeError('Frog Wizard GLB contains no scenes.');
  }

  const lod = new THREE.LOD();
  scenes.slice(0, 2).forEach((scene, index) => {
    const modelRoot = takeSceneMeshes(scene, index);
    lod.addLevel(modelRoot, FROG_WIZARD_LOD_DISTANCES[index]);
  });

  lod.name = 'FrogWizard';
  lod.scale.setScalar(FROG_WIZARD_SCALE);
  lod.hysteresis = 0.12;
  lod.autoUpdate = true;
  return lod;
}

export function disposeCharacterObject(root) {
  if (!root?.traverse) return;

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (!node.material) return;

    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of nodeMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
