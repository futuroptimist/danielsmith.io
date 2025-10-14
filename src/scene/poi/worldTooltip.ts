import {
  Camera,
  CanvasTexture,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import type { PoiDefinition } from './types';

type PoiWorldTooltipMode = 'hovered' | 'selected' | 'recommended';

export interface PoiWorldTooltipTarget {
  poi: PoiDefinition;
  getAnchorPosition(out: Vector3): Vector3;
}

export interface PoiWorldTooltipOptions {
  parent: Object3D;
  camera: Camera;
  width?: number;
  height?: number;
  verticalOffset?: number;
  fadeResponse?: number;
  positionResponse?: number;
  scaleDistance?: number;
  minScale?: number;
  maxScale?: number;
}

interface RenderState {
  poiId: string | null;
  mode: PoiWorldTooltipMode | null;
}

interface TooltipStateSnapshot {
  poiId: string | null;
  mode: PoiWorldTooltipMode | null;
  visible: boolean;
  opacity: number;
}

/**
 * Renders an in-world tooltip card that anchors to a POI and always faces the
 * active camera. The card mirrors the accessible overlay metadata while
 * keeping the content grounded inside the immersive scene.
 */
export class PoiWorldTooltip {
  public readonly group: Group;

  private readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;

  private readonly camera: Camera;

  private readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;

  private readonly texture: CanvasTexture;

  private readonly cardWidth: number;

  private readonly cardHeight: number;

  private readonly verticalOffset: number;

  private readonly fadeResponse: number;

  private readonly positionResponse: number;

  private readonly scaleDistance: number;

  private readonly minScale: number;

  private readonly maxScale: number;

  private readonly opacityByMode: Record<PoiWorldTooltipMode, number> = {
    hovered: 0.85,
    selected: 1,
    recommended: 0.72,
  };

  private hovered: PoiWorldTooltipTarget | null = null;

  private selected: PoiWorldTooltipTarget | null = null;

  private recommendation: PoiWorldTooltipTarget | null = null;

  private readonly targetPosition = new Vector3();

  private readonly currentPosition = new Vector3();

  private readonly anchorScratch = new Vector3();

  private readonly lookScratch = new Vector3();

  private opacity = 0;

  private renderState: RenderState = { poiId: null, mode: null };

  private disposed = false;

  constructor(options: PoiWorldTooltipOptions) {
    this.camera = options.camera;
    this.cardWidth = options.width ?? 2.6;
    this.cardHeight = options.height ?? 1.35;
    this.verticalOffset = options.verticalOffset ?? 0.6;
    this.fadeResponse = options.fadeResponse ?? 10;
    this.positionResponse = options.positionResponse ?? 12;
    this.scaleDistance = options.scaleDistance ?? 14;
    this.minScale = options.minScale ?? 0.75;
    this.maxScale = options.maxScale ?? 1.85;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 576;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to acquire 2D context for POI world tooltip.');
    }
    this.context = context;

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;

    const geometry = new PlaneGeometry(this.cardWidth, this.cardHeight, 1, 1);
    const material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    material.toneMapped = false;
    material.depthTest = false;

    this.mesh = new Mesh(geometry, material);
    this.mesh.renderOrder = 24;
    this.mesh.frustumCulled = false;

    this.group = new Group();
    this.group.name = 'poi-world-tooltip';
    this.group.visible = false;
    this.group.add(this.mesh);

    options.parent.add(this.group);
  }

  setHovered(target: PoiWorldTooltipTarget | null): void {
    this.hovered = target;
  }

  setSelected(target: PoiWorldTooltipTarget | null): void {
    this.selected = target;
  }

  setRecommendation(target: PoiWorldTooltipTarget | null): void {
    this.recommendation = target;
  }

  update(delta: number): void {
    if (this.disposed) {
      return;
    }
    const active = this.selected ?? this.hovered ?? this.recommendation;
    const mode: PoiWorldTooltipMode | null = this.selected
      ? 'selected'
      : this.hovered
        ? 'hovered'
        : this.recommendation
          ? 'recommended'
          : null;

    if (!active || !mode) {
      this.fadeOut(delta);
      return;
    }

    const targetChanged =
      this.renderState.poiId !== active.poi.id ||
      this.renderState.mode !== mode;

    const anchor = active.getAnchorPosition(this.anchorScratch);
    this.targetPosition.copy(anchor);
    this.targetPosition.y += this.verticalOffset;

    const smoothing =
      delta > 0 ? 1 - Math.exp(-delta * this.positionResponse) : 1;
    if (targetChanged || smoothing <= 0) {
      this.currentPosition.copy(this.targetPosition);
    } else {
      this.currentPosition.lerp(this.targetPosition, smoothing);
    }
    this.group.position.copy(this.currentPosition);

    this.lookScratch.set(
      this.camera.position.x,
      this.currentPosition.y,
      this.camera.position.z
    );
    this.group.lookAt(this.lookScratch);

    const distance = this.currentPosition.distanceTo(this.camera.position);
    const normalized = MathUtils.clamp(
      distance / this.scaleDistance,
      this.minScale,
      this.maxScale
    );
    this.group.scale.setScalar(normalized);

    const fadeTarget = this.opacityByMode[mode];
    const fadeSmoothing =
      delta > 0 ? 1 - Math.exp(-delta * this.fadeResponse) : 1;
    if (targetChanged || fadeSmoothing <= 0) {
      this.opacity = fadeTarget;
    } else {
      this.opacity = MathUtils.lerp(this.opacity, fadeTarget, fadeSmoothing);
    }

    this.mesh.material.opacity = this.opacity;
    this.group.visible = this.opacity > 0.015;

    if (targetChanged) {
      this.renderTooltip(active.poi, mode);
      this.renderState = { poiId: active.poi.id, mode };
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.hovered = null;
    this.selected = null;
    this.recommendation = null;
    this.group.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }

  getState(): TooltipStateSnapshot {
    return {
      poiId: this.renderState.poiId,
      mode: this.renderState.mode,
      visible: this.group.visible,
      opacity: this.mesh.material.opacity,
    };
  }

  private fadeOut(delta: number) {
    if (this.opacity <= 0 && !this.group.visible) {
      return;
    }
    const fadeSmoothing =
      delta > 0 ? 1 - Math.exp(-delta * this.fadeResponse) : 1;
    if (fadeSmoothing <= 0) {
      this.opacity = 0;
    } else {
      this.opacity = MathUtils.lerp(this.opacity, 0, fadeSmoothing);
    }
    if (this.opacity < 0.01) {
      this.opacity = 0;
    }
    this.mesh.material.opacity = this.opacity;
    if (this.opacity <= 0.01) {
      this.group.visible = false;
      this.renderState = { poiId: null, mode: null };
    }
  }

  private renderTooltip(poi: PoiDefinition, mode: PoiWorldTooltipMode) {
    const { context } = this;
    const { width, height } = this.canvas;

    context.clearRect(0, 0, width, height);

    const padding = 72;
    const radius = 36;
    const outline =
      mode === 'selected'
        ? 'rgba(170, 255, 255, 0.95)'
        : mode === 'hovered'
          ? 'rgba(132, 238, 255, 0.85)'
          : 'rgba(114, 224, 255, 0.68)';

    this.drawCardBackground({
      fill: 'rgba(8, 22, 38, 0.94)',
      outline,
      x: padding,
      y: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      radius,
    });

    const accentGradient = context.createLinearGradient(
      0,
      padding,
      0,
      padding + 96
    );
    accentGradient.addColorStop(0, 'rgba(33, 116, 255, 0.75)');
    accentGradient.addColorStop(1, 'rgba(21, 192, 255, 0.35)');
    context.fillStyle = accentGradient;
    this.drawRoundedRect(
      padding + 4,
      padding + 4,
      width - padding * 2 - 8,
      96,
      radius * 0.6
    );
    context.fill();

    context.fillStyle = 'rgba(223, 246, 255, 0.92)';
    context.font = 'bold 88px "Inter", "Segoe UI", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    const titleX = padding + 48;
    const titleY = padding + 96;
    this.fillWrappedText(poi.title, {
      x: titleX,
      y: titleY,
      maxWidth: width - padding * 3,
      lineHeight: 92,
      maxLines: 2,
      font: 'bold 88px "Inter", "Segoe UI", sans-serif',
    });

    context.font = '36px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = 'rgba(210, 236, 255, 0.92)';
    const summaryY = titleY + 96;
    const summaryBottom = this.fillWrappedText(poi.summary, {
      x: titleX,
      y: summaryY,
      maxWidth: width - padding * 3,
      lineHeight: 54,
      maxLines: 3,
      font: '36px "Inter", "Segoe UI", sans-serif',
    });

    if (poi.metrics && poi.metrics.length > 0) {
      const metricText = poi.metrics
        .slice(0, 2)
        .map((metric) => `${metric.label}: ${metric.value}`)
        .join('   •   ');
      context.font = '34px "Inter", "Segoe UI", sans-serif';
      context.fillStyle = 'rgba(164, 232, 255, 0.95)';
      const metricsY = Math.max(summaryBottom + 72, height - padding * 1.6);
      context.fillText(metricText, titleX, metricsY);
    }

    if (poi.status) {
      const statusLabel = poi.status === 'prototype' ? 'Prototype' : 'Live';
      context.font = '34px "Inter", "Segoe UI", sans-serif';
      context.textAlign = 'right';
      context.fillStyle = 'rgba(220, 242, 255, 0.88)';
      const badgeX = width - padding - 32;
      const badgeY = padding + 64;
      context.fillText(statusLabel, badgeX, badgeY);
      context.textAlign = 'left';
    }

    context.font = '28px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = 'rgba(148, 230, 255, 0.88)';
    const modeLabel =
      mode === 'selected'
        ? 'Selected exhibit'
        : mode === 'hovered'
          ? 'Interact to inspect'
          : 'Next highlight';
    context.fillText(modeLabel, titleX, padding + 48);

    this.texture.needsUpdate = true;
  }

  private drawCardBackground(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    fill: string | CanvasGradient;
    outline: string;
  }) {
    const { context } = this;
    context.save();
    context.lineWidth = 8;
    context.fillStyle = options.fill;
    context.strokeStyle = options.outline;
    this.drawRoundedRect(
      options.x,
      options.y,
      options.width,
      options.height,
      options.radius
    );
    context.fill();
    context.stroke();
    context.restore();
  }

  private drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const { context } = this;
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  private fillWrappedText(
    text: string,
    options: {
      x: number;
      y: number;
      maxWidth: number;
      lineHeight: number;
      maxLines?: number;
      font: string;
    }
  ): number {
    const { context } = this;
    const words = text.split(/\s+/);
    let line = '';
    let lineCount = 0;
    let cursorY = options.y;
    context.font = options.font;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const { width } = context.measureText(candidate);
      if (width > options.maxWidth && line) {
        context.fillText(line, options.x, cursorY);
        line = word;
        cursorY += options.lineHeight;
        lineCount += 1;
        if (options.maxLines && lineCount >= options.maxLines - 1) {
          break;
        }
      } else {
        line = candidate;
      }
    }
    if (line) {
      context.fillText(line, options.x, cursorY);
      cursorY += options.lineHeight;
    }
    return cursorY;
  }
}
