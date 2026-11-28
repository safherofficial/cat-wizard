import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdaptivePixelRatioController,
  QUALITY_PRESETS,
  detectPreferredQuality,
  resolveQualityPreset
} from '../src/performance.js';

test('auto quality selects a conservative preset from available device hints', () => {
  assert.equal(resolveQualityPreset().key, 'medium');
  assert.equal(detectPreferredQuality({ hardwareConcurrency: 2, deviceMemory: 2 }), 'low');
  assert.equal(detectPreferredQuality({ hardwareConcurrency: 8, deviceMemory: 8 }), 'high');
  assert.equal(detectPreferredQuality({ hardwareConcurrency: 8, deviceMemory: 8, isMobile: true }), 'medium');
  assert.equal(resolveQualityPreset(null, { hardwareConcurrency: 2 }).key, 'low');
});

test('named quality presets remain explicit user overrides', () => {
  assert.deepEqual(['low', 'medium', 'high'].map(name => resolveQualityPreset(name).key), ['low', 'medium', 'high']);
  assert.equal(resolveQualityPreset(' medium ').maxPixelRatio, 1.1);
  assert.equal(resolveQualityPreset('high', { hardwareConcurrency: 2 }).key, 'high');
  assert.equal(Object.isFrozen(QUALITY_PRESETS), true);
});

test('low quality limits pixel ratio and disables shadows and antialiasing', () => {
  const preset = resolveQualityPreset('low');
  assert.equal(preset.maxPixelRatio, 0.9);
  assert.equal(preset.shadows, false);
  assert.equal(preset.antialias, false);
  assert.equal(preset.shadowMapSize, 512);
});

test('medium and high presets use progressively larger rendering budgets', () => {
  const medium = resolveQualityPreset('medium');
  const high = resolveQualityPreset('high');
  assert.equal(medium.shadows, true);
  assert.equal(medium.shadowMap, 'pcf');
  assert.equal(medium.shadowMapSize, 768);
  assert.equal(medium.antialias, true);
  assert.ok(high.maxPixelRatio > medium.maxPixelRatio);
  assert.equal(high.shadowMap, 'pcf');
  assert.equal(high.shadowMapSize, 1024);
  assert.equal(high.antialias, true);
});

test('unknown manual quality values safely fall back to high', () => {
  assert.equal(resolveQualityPreset('ultra').key, 'high');
});

test('adaptive pixel ratio waits for stable samples before lowering resolution', () => {
  const scaler = new AdaptivePixelRatioController(2, 1.3);
  for (let frame = 0; frame < 80; frame += 1) assert.equal(scaler.update(28), null);
  assert.equal(scaler.current, 1.3);
  for (let frame = 0; frame < 100; frame += 1) scaler.update(28);
  assert.ok(scaler.current < 1.3);
  assert.ok(scaler.current >= scaler.minPixelRatio);
});

test('adaptive pixel ratio recovers only after sustained frame-time headroom', () => {
  const scaler = new AdaptivePixelRatioController(2, 1.3);
  for (let frame = 0; frame < 300; frame += 1) scaler.update(27);
  const reduced = scaler.current;
  for (let frame = 0; frame < 500; frame += 1) scaler.update(10);
  assert.ok(scaler.current > reduced);
  assert.ok(scaler.current <= scaler.maxPixelRatio);
});

test('adaptive pixel ratio ignores invalid frame timings', () => {
  const scaler = new AdaptivePixelRatioController(1, 1.1);
  assert.equal(scaler.update(0), null);
  assert.equal(scaler.update(Number.NaN), null);
  assert.equal(scaler.current, 1);
});
