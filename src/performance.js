export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    key: 'low',
    label: 'LOW',
    maxPixelRatio: 1,
    shadows: false,
    shadowMap: 'pcf'
  }),
  medium: Object.freeze({
    key: 'medium',
    label: 'MEDIUM',
    maxPixelRatio: 1.25,
    shadows: true,
    shadowMap: 'pcf'
  }),
  high: Object.freeze({
    key: 'high',
    label: 'HIGH',
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMap: 'soft'
  })
});

export function resolveQualityPreset(requestedQuality) {
  const key = String(requestedQuality || 'high').trim().toLowerCase();
  return QUALITY_PRESETS[key] || QUALITY_PRESETS.high;
}

export class PerformanceMonitor {
  constructor(container, qualityLabel = 'HIGH') {
    if (!container?.ownerDocument) {
      throw new TypeError('PerformanceMonitor requires a DOM container.');
    }

    this.element = container.ownerDocument.createElement('pre');
    this.element.className = 'perf-monitor';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-label', 'Rendering performance diagnostics');
    this.qualityLabel = qualityLabel;
    this.windowStartedAt = performance.now();
    this.frameCount = 0;
    this.frameCostTotal = 0;

    this.element.textContent = 'PERF MONITOR\\nCollecting frame data…';
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
    ].join('\\n');

    this.windowStartedAt = now;
    this.frameCount = 0;
    this.frameCostTotal = 0;
  }

  dispose() {
    this.element.remove();
  }
}
