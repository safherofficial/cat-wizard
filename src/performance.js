export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({ key: 'low', label: 'LOW', maxPixelRatio: 0.9, shadows: false, shadowMap: 'pcf', shadowMapSize: 512, antialias: false }),
  medium: Object.freeze({ key: 'medium', label: 'MEDIUM', maxPixelRatio: 1.1, shadows: true, shadowMap: 'pcf', shadowMapSize: 768, antialias: true }),
  high: Object.freeze({ key: 'high', label: 'HIGH', maxPixelRatio: 1.3, shadows: true, shadowMap: 'pcf', shadowMapSize: 1024, antialias: true })
});

export function detectPreferredQuality(deviceHints = {}) {
  const cores = Number(deviceHints.hardwareConcurrency) || 0;
  const memory = Number(deviceHints.deviceMemory) || 0;
  const isMobile = Boolean(deviceHints.isMobile);
  if ((cores > 0 && cores <= 2) || (memory > 0 && memory <= 2)) return 'low';
  if (isMobile || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4)) return 'medium';
  if (cores >= 8 || memory >= 8) return 'high';
  return 'medium';
}

export function resolveQualityPreset(requestedQuality, deviceHints = {}) {
  const key = String(requestedQuality ?? 'auto').trim().toLowerCase();
  if (!key || key === 'auto') return QUALITY_PRESETS[detectPreferredQuality(deviceHints)];
  return QUALITY_PRESETS[key] || QUALITY_PRESETS.high;
}

export class AdaptivePixelRatioController {
  constructor(devicePixelRatio = 1, maxPixelRatio = 1.3) {
    const deviceRatio = Number(devicePixelRatio) > 0 ? Number(devicePixelRatio) : 1;
    const presetCap = Number(maxPixelRatio) > 0 ? Number(maxPixelRatio) : 1;
    this.maxPixelRatio = Math.min(deviceRatio, presetCap);
    this.minPixelRatio = Math.min(this.maxPixelRatio, Math.max(0.7, this.maxPixelRatio * 0.68));
    this.current = this.maxPixelRatio;
    this.averageFrameMs = 16.7;
    this.frameCount = 0;
    this.slowFrames = 0;
    this.fastFrames = 0;
    this.cooldownFrames = 0;
  }

  update(frameTimeMs) {
    if (!Number.isFinite(frameTimeMs) || frameTimeMs <= 0) return null;
    this.frameCount += 1;
    this.averageFrameMs += (frameTimeMs - this.averageFrameMs) * 0.08;
    if (this.frameCount < 90) return null;

    if (this.cooldownFrames > 0) {
      this.cooldownFrames -= 1;
      return null;
    }
    if (this.averageFrameMs > 20.5) {
      this.slowFrames += 1;
      this.fastFrames = 0;
    } else if (this.averageFrameMs < 14.5) {
      this.fastFrames += 1;
      this.slowFrames = 0;
    } else {
      this.slowFrames = 0;
      this.fastFrames = 0;
    }

    if (this.slowFrames >= 45 && this.current > this.minPixelRatio + 0.005) {
      this.current = Math.max(this.minPixelRatio, Math.round((this.current - 0.12) * 100) / 100);
      this.slowFrames = 0;
      this.cooldownFrames = 90;
      return this.current;
    }
    if (this.fastFrames >= 240 && this.current < this.maxPixelRatio - 0.005) {
      this.current = Math.min(this.maxPixelRatio, Math.round((this.current + 0.06) * 100) / 100);
      this.fastFrames = 0;
      this.cooldownFrames = 180;
      return this.current;
    }
    return null;
  }
}

export class PerformanceMonitor {
  constructor(container, qualityLabel = 'AUTO') {
    if (!container?.ownerDocument) throw new TypeError('PerformanceMonitor requires a DOM container.');
    this.element = container.ownerDocument.createElement('pre');
    this.element.className = 'perf-monitor';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-label', 'Rendering performance diagnostics');
    this.qualityLabel = qualityLabel;
    this.windowStartedAt = performance.now();
    this.frameCount = 0;
    this.frameCostTotal = 0;
    this.element.textContent = 'PERF MONITOR\nCollecting frame data…';
    container.append(this.element);
  }

  update(frameCostMs, rendererInfo, pixelRatio) {
    this.frameCount += 1;
    this.frameCostTotal += frameCostMs;
    const now = performance.now();
    const elapsed = now - this.windowStartedAt;
    if (elapsed < 900) return;

    const fps = this.frameCount * 1000 / elapsed;
    const averageCpuMs = this.frameCostTotal / this.frameCount;
    const render = rendererInfo?.render || {};
    const memory = rendererInfo?.memory || {};
    this.element.textContent = [
      `FPS  ${fps.toFixed(0)}  ·  CPU ${averageCpuMs.toFixed(1)} ms`,
      `CALLS ${render.calls ?? 0}  ·  TRIS ${(render.triangles ?? 0).toLocaleString()}`,
      `GEO ${memory.geometries ?? 0}  ·  TEX ${memory.textures ?? 0}`,
      `QUALITY ${this.qualityLabel}  ·  DPR ${pixelRatio.toFixed(2)}`
    ].join('\n');
    this.windowStartedAt = now;
    this.frameCount = 0;
    this.frameCostTotal = 0;
  }

  dispose() {
    this.element.remove();
  }
}
