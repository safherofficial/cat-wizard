import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_PRESETS, resolveQualityPreset } from '../src/performance.js';

test('defaults to the current high-quality rendering preset', () => {
  assert.equal(resolveQualityPreset().key, 'high');
  assert.equal(resolveQualityPreset(null).maxPixelRatio, 1.5);
});

test('accepts named quality presets without changing their definitions', () => {
  assert.deepEqual(
    ['low', 'medium', 'high'].map(name => resolveQualityPreset(name).key),
    ['low', 'medium', 'high']
  );
  assert.equal(resolveQualityPreset(' medium ').maxPixelRatio, 1.25);
  assert.equal(Object.isFrozen(QUALITY_PRESETS), true);
});

test('low quality reduces pixel ratio and disables shadow rendering', () => {
  const preset = resolveQualityPreset('low');
  assert.equal(preset.maxPixelRatio, 1);
  assert.equal(preset.shadows, false);
});

test('medium and high presets progressively raise the rendering budget', () => {
  const medium = resolveQualityPreset('medium');
  const high = resolveQualityPreset('high');
  assert.equal(medium.shadows, true);
  assert.equal(medium.shadowMap, 'pcf');
  assert.ok(high.maxPixelRatio > medium.maxPixelRatio);
  assert.equal(high.shadowMap, 'soft');
});

test('unknown quality values safely fall back to high', () => {
  assert.equal(resolveQualityPreset('ultra').key, 'high');
});
