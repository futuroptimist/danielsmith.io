import type { PoiTourGuideListener } from './tourGuide';
import type { PoiDefinition } from './types';

export interface GuidedTourSource {
  subscribe(listener: PoiTourGuideListener): () => void;
}

export interface GuidedTourChannelOptions {
  source: GuidedTourSource;
  enabled?: boolean;
}

export type GuidedTourListener = (recommendation: PoiDefinition | null) => void;

/**
 * Bridges tour guide updates to UI consumers while honoring an enable/disable
 * preference. When disabled, listeners receive `null` so HUD overlays can hide
 * recommendations without tearing down the underlying {@link GuidedTourSource}.
 */
export class GuidedTourChannel {
  private readonly source: GuidedTourSource;

  private readonly listeners = new Set<GuidedTourListener>();

  private readonly unsubscribeSource: () => void;

  private enabled: boolean;

  private latest: PoiDefinition | null = null;

  private lastBroadcast: PoiDefinition | null = null;

  constructor({ source, enabled = true }: GuidedTourChannelOptions) {
    this.source = source;
    this.enabled = enabled;
    this.unsubscribeSource = this.source.subscribe((recommendation) => {
      this.latest = recommendation;
      this.emit();
    });
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getLatest(): PoiDefinition | null {
    return this.latest;
  }

  subscribe(listener: GuidedTourListener): () => void {
    this.listeners.add(listener);
    listener(this.enabled ? this.latest : null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.emit();
  }

  dispose(): void {
    this.unsubscribeSource();
    this.listeners.clear();
  }

  private emit(): void {
    const value = this.enabled ? this.latest : null;
    if (value === this.lastBroadcast) {
      return;
    }
    this.lastBroadcast = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}
