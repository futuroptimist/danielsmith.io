import type { PoiDefinition, PoiId } from '../../scene/poi/types';
import type { PoiNarrativeLogHandle } from '../../ui/hud/poiNarrativeLog';

export interface ProceduralNarratorOptions {
  log: PoiNarrativeLogHandle;
  definitions: ReadonlyArray<PoiDefinition>;
}

export class ProceduralNarrator {
  private readonly log: PoiNarrativeLogHandle;

  private readonly definitionsById = new Map<PoiId, PoiDefinition>();

  private lastVisitedId: PoiId | null = null;

  constructor(options: ProceduralNarratorOptions) {
    this.log = options.log;
    options.definitions.forEach((definition) =>
      this.storeDefinition(definition)
    );
  }

  primeVisited(pois: ReadonlyArray<PoiDefinition>): void {
    if (pois.length === 0) {
      this.lastVisitedId = null;
      return;
    }
    pois.forEach((poi) => this.storeDefinition(poi));
    const last = pois[pois.length - 1];
    this.lastVisitedId = last.id;
  }

  handleVisit(poi: PoiDefinition): void {
    this.storeDefinition(poi);
    const previousId = this.lastVisitedId;
    this.lastVisitedId = poi.id;
    if (!previousId || previousId === poi.id) {
      return;
    }
    const previous = this.definitionsById.get(previousId);
    if (!previous) {
      return;
    }
    this.log.recordJourney(previous, poi);
  }

  reset(): void {
    this.lastVisitedId = null;
  }

  dispose(): void {
    this.definitionsById.clear();
    this.lastVisitedId = null;
  }

  private storeDefinition(poi: PoiDefinition): void {
    this.definitionsById.set(poi.id, poi);
  }
}
