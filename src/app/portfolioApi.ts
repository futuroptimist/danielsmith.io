import type {
  AvatarAccessoryId,
  AvatarAccessoryState,
} from '../scene/avatar/accessories';
import type { AvatarAssetPipelineLoadOptions } from '../scene/avatar/assetPipeline';
import type { AvatarVariantId } from '../scene/avatar/variants';
import type { resolveInitialAvatarCameraFraming } from '../scene/camera/initialFraming';
import type {
  DebugColliderMetadata,
  DebugColliderVisualizerState,
} from '../scene/debug/colliderVisualizer';
import type { DebugPerformanceState } from '../scene/debug/performanceOverlay';
import type {
  DebugSolidMetadata,
  DebugSolidVisualizerState,
} from '../scene/debug/solidVisualizer';
import type { LowFpsRecoveryMonitorState } from '../scene/performance/lowFpsRecoveryMonitor';
import type {
  PerformanceCrashBreadcrumbApi,
  PerformanceDiagnosticsApi,
} from '../scene/performance/performanceDiagnostics';
import type { KeyBindingAction } from '../systems/controls/keyBindings';
import type { GitHubRepoStatsDiagnostics } from '../systems/github/repoStats';
import type { FloorId, StairTransitionZone } from '../systems/movement/stairs';
import type { TutorialState } from '../systems/tutorial/tutorialState';

export type KeyBindingSnapshot = Record<KeyBindingAction, string[]>;
export interface PortfolioKeyBindingsApi {
  getBindings(): KeyBindingSnapshot;
  setBinding(action: KeyBindingAction, keys: readonly string[]): void;
  resetBinding(action: KeyBindingAction): void;
  resetAll(): void;
}
export type InitialCameraFramingDebug = ReturnType<
  typeof resolveInitialAvatarCameraFraming
>;

export interface PortfolioInputApi {
  keyBindings?: PortfolioKeyBindingsApi;
  [section: string]: unknown;
}

export interface PortfolioApi {
  input?: PortfolioInputApi;
  avatar?: {
    getActiveVariant(): AvatarVariantId;
    setActiveVariant(variant: AvatarVariantId): void;
    listVariants(): Array<{
      id: AvatarVariantId;
      label: string;
      description?: string;
    }>;
    listAccessories(): Array<{
      id: AvatarAccessoryId;
      label: string;
      description?: string;
      enabled: boolean;
    }>;
    getAccessories(): AvatarAccessoryState[];
    setAccessoryEnabled(id: AvatarAccessoryId, enabled: boolean): void;
    toggleAccessory(id: AvatarAccessoryId): void;
    loadAsset?(options: AvatarAssetPipelineLoadOptions): Promise<unknown>;
  };
  performance?: PerformanceDiagnosticsApi | PerformanceCrashBreadcrumbApi;
  githubMetrics?: {
    getDiagnostics(): GitHubRepoStatsDiagnostics;
  };
  tutorial?: {
    getState(): TutorialState;
    getShowOnStartup(): boolean;
    recordMovementProgress(input: {
      right: number;
      forward: number;
      deltaSeconds: number;
      moved: boolean;
    }): void;
    recordZoomProgress(snapshot: {
      currentZoom?: number;
      targetZoom?: number;
      minZoom: number;
      maxZoom: number;
    }): void;
    syncVisitedPois(visitedPoiIds: string[]): void;
    markGitshelvesVisited(): void;
  };
  audio?: {
    getState(): {
      preferenceEnabled: boolean;
      ambientEnabled: boolean;
      ambientSourcesPlaying: { id: string; isPlaying: boolean }[];
      ambientSourcesPlayingCount: number;
      ambientBedVolumes: {
        id: string;
        currentVolume: number;
        targetVolume: number;
      }[];
      footstepEnabled: boolean;
      footstepPlaying: boolean;
      masterVolume: number;
      baseVolume: number;
      audioContextState: AudioContextState | 'unknown';
      storageKeyVersion: string;
      activeStorageKey: string;
    };
  };
  graphics?: {
    getLevel?(): string;
    setLevel?(level: string): void;
    getMotionBlurIntensity(): number;
    setMotionBlurIntensity(intensity: number): void;
    getMotionBlurState(): {
      enabled: boolean;
      damp: number;
      intensity: number;
      pendingHistoryReset: boolean;
      historyResetRequestCount: number;
      lastHistoryResetDamp: number | null;
    };
    resetMotionBlurHistory(): void;
    getCameraZoom?(): number;
    getCameraZoomTarget?(): number;
    getInitialCameraFraming?(): InitialCameraFramingDebug | undefined;
    setCameraPanForTest?(input: { x: number; y: number }): void;
  };
  poi?: {
    getTooltipState(): {
      overlayVisiblePoiId: string | null;
      worldTooltipVisible: boolean;
      worldTooltipPoiId: string | null;
      worldTooltipTitle: string | null;
      markerLabelVisible: boolean;
      markerLabelPoiId: string | null;
      visibleMarkerLabelCount: number;
      visibleMarkerLabelPoiIds: string[];
      activePoiMarkerLabelVisible: boolean;
      activeInWorldTooltipCount: number;
      totalInWorldTooltipCount: number;
    };
  };
  debugColliders?: {
    getState(): DebugColliderVisualizerState;
    setEnabled(enabled: boolean): void;
    setIdsEnabled(enabled: boolean): void;
    getColliders(): DebugColliderMetadata[];
    getBlockingCollidersAt(target: {
      x: number;
      z: number;
      floorId?: FloorId;
    }): DebugColliderMetadata[];
    getColliderById(id: unknown): DebugColliderMetadata | undefined;
    getColliderBySourceId(sourceId: unknown): DebugColliderMetadata | undefined;
    getCollidersBySourceId(sourceId: unknown): DebugColliderMetadata[];
  };
  debugSolids?: {
    getState(): DebugSolidVisualizerState;
    setEnabled(enabled: boolean): void;
    getSolids(): DebugSolidMetadata[];
    getSolidById(id: unknown): DebugSolidMetadata | undefined;
    getSolidBySourceId(sourceId: unknown): DebugSolidMetadata | undefined;
    getSolidsBySourceId(sourceId: unknown): DebugSolidMetadata[];
  };
  debugPerformance?: {
    getState(): DebugPerformanceState;
    setFpsEnabled(enabled: boolean): void;
    getLowFpsRecoveryState?(): LowFpsRecoveryMonitorState;
    forceLowFpsRecoveryPopup?(): void;
    recordLowFpsRecoveryFrame?(deltaSeconds: number, nowMs?: number): void;
    dismissLowFpsRecoveryPopup?(nowMs?: number): void;
  };
  debugCoordinates?: {
    getState(): {
      enabled: boolean;
      x: number;
      y: number;
      z: number;
      activeFloorId: FloorId;
      predictedStairFloorId: FloorId;
      cameraZoom: number;
      insideStairWidth: boolean;
      insideLanding: boolean;
      insideStairNavArea: boolean;
      stairZone: StairTransitionZone;
      currentRoomId: string | null;
    };
    setEnabled(enabled: boolean): void;
  };
  world?: {
    getActiveFloor(): FloorId;
    canOccupyPosition(target: {
      x: number;
      z: number;
      floorId?: FloorId;
    }): boolean;
    setActiveFloor(next: FloorId): void;
    movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
    stepPlayerForTest(step: { dx: number; dz: number }): {
      movedX: boolean;
      movedZ: boolean;
      activeFloor: FloorId;
      position: { x: number; y: number; z: number };
      blockedBy?: string[];
    };
    getPlayerPosition(): { x: number; y: number; z: number };
    predictFloorAt(target: {
      x: number;
      z: number;
      currentFloor?: FloorId;
    }): FloorId;
    getStairTransitionZone(target: {
      x: number;
      z: number;
      currentFloor?: FloorId;
    }): StairTransitionZone;
    getStairMetrics(): {
      stairCenterX: number;
      stairHalfWidth: number;
      stairBottomZ: number;
      stairTopZ: number;
      stairLandingMinZ: number;
      stairLandingMaxZ: number;
      stairLandingDepth: number;
      stairDirection: 1 | -1;
      upperFloorElevation: number;
    };
    getCeilingOpacities(): number[];
    getFloorVisibilitySnapshot(): {
      activeFloorId: FloorId;
      groundFloorVisible: boolean;
      groundPoiVisible: boolean;
      upperPoiVisible: boolean;
      groundEnvironmentVisible: boolean;
      groundStructureVisible: boolean;
      upperFloorVisible: boolean;
      backyardEnvironmentVisible: boolean | null;
    };
    getPlayerYaw?(): number;
  };
}

declare global {
  interface Window {
    portfolio?: PortfolioApi;
  }
}

export function ensurePortfolioApi(
  targetWindow: Window = window
): PortfolioApi {
  if (!targetWindow.portfolio) {
    targetWindow.portfolio = {};
  }

  return targetWindow.portfolio;
}

export function setPortfolioSection<K extends keyof PortfolioApi>(
  section: K,
  value: NonNullable<PortfolioApi[K]>,
  targetWindow: Window = window
): NonNullable<PortfolioApi[K]> {
  const portfolioNamespace = ensurePortfolioApi(targetWindow);
  portfolioNamespace[section] = value;
  return value;
}

export function clearPortfolioSection(
  section: keyof PortfolioApi,
  targetWindow: Window = window
): void {
  if (!targetWindow.portfolio) {
    return;
  }

  delete targetWindow.portfolio[section];
}

export function setPortfolioInputKeyBindings(
  value: PortfolioKeyBindingsApi,
  targetWindow: Window = window
): PortfolioKeyBindingsApi {
  const portfolioNamespace = ensurePortfolioApi(targetWindow);
  portfolioNamespace.input ??= {};
  portfolioNamespace.input.keyBindings = value;
  return value;
}

export function clearPortfolioInputKeyBindings(
  targetWindow: Window = window
): void {
  if (!targetWindow.portfolio?.input) {
    return;
  }

  delete targetWindow.portfolio.input.keyBindings;
}
