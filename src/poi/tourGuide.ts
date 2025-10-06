import type { PoiDefinition, PoiId } from './types';
import { PoiVisitedState } from './visitedState';

export type PoiTourGuideListener = (recommendation: PoiDefinition | null) => void;

export interface PoiTourGuideOptions {
  definitions: PoiDefinition[];
  visitedState: PoiVisitedState;
  priorityOrder?: PoiId[];
}

/**
 * Computes the next recommended POI based on a configurable priority order and
 * visited state updates. The guide listens to {@link PoiVisitedState}
 * notifications so downstream UI can highlight the next suggested exhibit for
 * the guided tour experience described in the roadmap.
 */
export class PoiTourGuide {
  private readonly visitedState: PoiVisitedState;

  private readonly listeners = new Set<PoiTourGuideListener>();

  private readonly definitionsById = new Map<PoiId, PoiDefinition>();

  private allDefinitions: PoiDefinition[] = [];

  private priorityOrder: PoiId[] = [];

  private recommendation: PoiDefinition | null = null;

  private unsubscribeVisited: (() => void) | null = null;

  constructor(options: PoiTourGuideOptions) {
    this.visitedState = options.visitedState;
    this.setDefinitions(options.definitions);
    this.priorityOrder = this.normalizePriority(
      options.priorityOrder ?? options.definitions.map((definition) => definition.id)
    );

    this.refreshRecommendation();
    this.unsubscribeVisited = this.visitedState.subscribe(() => {
      this.refreshRecommendation();
    });
  }

  getRecommendation(): PoiDefinition | null {
    return this.recommendation;
  }

  subscribe(listener: PoiTourGuideListener): () => void {
    this.listeners.add(listener);
    listener(this.recommendation);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setPriorityOrder(order: PoiId[]): void {
    const normalized = this.normalizePriority(order);
    if (this.areOrdersEqual(normalized, this.priorityOrder)) {
      return;
    }
    this.priorityOrder = normalized;
    this.refreshRecommendation();
  }

  dispose(): void {
    if (this.unsubscribeVisited) {
      this.unsubscribeVisited();
      this.unsubscribeVisited = null;
    }
    this.listeners.clear();
  }

  private setDefinitions(definitions: PoiDefinition[]) {
    this.allDefinitions = definitions.slice();
    this.definitionsById.clear();
    for (const definition of definitions) {
      this.definitionsById.set(definition.id, definition);
    }
  }

  private normalizePriority(order: PoiId[]): PoiId[] {
    const unique: PoiId[] = [];
    const seen = new Set<PoiId>();
    for (const id of order) {
      if (!this.definitionsById.has(id) || seen.has(id)) {
        continue;
      }
      unique.push(id);
      seen.add(id);
    }
    return unique;
  }

  private refreshRecommendation() {
    const visited = this.visitedState.snapshot();
    const next = this.computeRecommendation(visited);
    if (next?.id === this.recommendation?.id) {
      return;
    }
    this.recommendation = next;
    this.emit(next);
  }

  private computeRecommendation(visited: ReadonlySet<PoiId>): PoiDefinition | null {
    const order = this.buildOrderedDefinitions();
    for (const definition of order) {
      if (!visited.has(definition.id)) {
        return definition;
      }
    }
    return null;
  }

  private buildOrderedDefinitions(): PoiDefinition[] {
    const prioritized: PoiDefinition[] = [];
    const used = new Set<PoiId>();
    for (const id of this.priorityOrder) {
      const definition = this.definitionsById.get(id);
      if (!definition || used.has(id)) {
        continue;
      }
      prioritized.push(definition);
      used.add(id);
    }

    if (used.size === this.definitionsById.size) {
      return prioritized;
    }

    const remaining = this.allDefinitions
      .filter((definition) => !used.has(definition.id))
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));

    return prioritized.concat(remaining);
  }

  private areOrdersEqual(a: PoiId[], b: PoiId[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  private emit(recommendation: PoiDefinition | null) {
    for (const listener of this.listeners) {
      listener(recommendation);
    }
  }
}
