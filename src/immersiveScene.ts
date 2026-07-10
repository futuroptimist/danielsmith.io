import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Audio,
  AudioListener,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import type {
  AppReadyMarker,
  ImmersiveFatalErrorHandler,
} from './app/bootstrap';
import {
  clearPortfolioInputKeyBindings,
  clearPortfolioSection,
  setPortfolioInputKeyBindings,
  setPortfolioSection,
  type InitialCameraFramingDebug,
  type KeyBindingSnapshot,
} from './app/portfolioApi';
import {
  FLOOR_PLAN,
  FLOOR_PLAN_LEVELS,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getFloorBounds,
  type RoomCategory,
} from './assets/floorPlan';
import type { WallSegmentInstance } from './assets/floorPlan/wallSegments';
import {
  formatMessage,
  getAudioHudControlStrings,
  getAudioSubtitleStrings,
  getControlOverlayStrings,
  getDebugCoordinatesStrings,
  getDebugCollidersStrings,
  getHelpModalStrings,
  getHudCustomizationStrings,
  getLocaleDirection,
  getLocaleStrings,
  getLowFpsRecoveryStrings,
  getLocaleScript,
  getLocaleToggleStrings,
  getModeAnnouncerStrings,
  getModeToggleStrings,
  getPoiOverlayChromeStrings,
  getSiteStrings,
  getSoftwareRendererWarningStrings,
  getTutorialPanelStrings,
  getSelectableLocales,
  isI18nDebugEnabled,
  resolveInitialLocale,
  type Locale,
} from './assets/i18n';
import { createImmersiveGradientTexture } from './assets/theme/immersiveGradient';
import {
  createAvatarAccessorySuite,
  type AvatarAccessorySuite,
  type AvatarAccessoryState,
  type AvatarAccessoryId,
} from './scene/avatar/accessories';
import {
  createAvatarAccessoryManager,
  type AvatarAccessoryManager,
} from './scene/avatar/accessoryManager';
import {
  createAvatarAssetPipeline,
  type AvatarAssetPipeline,
  type AvatarAssetPipelineLoadOptions,
} from './scene/avatar/assetPipeline';
import {
  createAvatarFootIkController,
  type AvatarFootIkControllerHandle,
} from './scene/avatar/footIkController';
import {
  bindPoiInteractionAnimation,
  createAvatarInteractionAnimator,
  type AvatarInteractionAnimatorHandle,
} from './scene/avatar/interactionAnimator';
import { createAvatarLocomotionAnimator } from './scene/avatar/locomotionAnimator';
import type { AvatarLocomotionAnimatorHandle } from './scene/avatar/locomotionAnimator';
import {
  PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
  createPortfolioMannequin,
} from './scene/avatar/mannequin';
import {
  createAvatarVariantManager,
  type AvatarVariantManager,
} from './scene/avatar/variantManager';
import {
  AVATAR_VARIANTS,
  DEFAULT_AVATAR_VARIANT_ID,
  type AvatarVariantId,
} from './scene/avatar/variants';
import { resolveInitialAvatarCameraFraming } from './scene/camera/initialFraming';
import { assertDebugColliderId } from './scene/debug/colliderDebugIds';
import {
  createColliderVisualizer,
  type DebugColliderMetadata,
  type DebugColliderRegistration,
} from './scene/debug/colliderVisualizer';
import { createDebugPerformanceOverlay } from './scene/debug/performanceOverlay';
import { createSolidVisualizer } from './scene/debug/solidVisualizer';
import {
  createBackyardEnvironment,
  type BackyardEnvironmentBuild,
} from './scene/environments/backyard';
import {
  createFloorVisibilityController,
  createPoiFloorResolver,
  type FloorVisibilityController,
} from './scene/floors/visibilityController';
import {
  createMotionBlurController,
  type MotionBlurController,
} from './scene/graphics/motionBlurController';
import {
  GRAPHICS_QUALITY_PRESETS,
  createGraphicsQualityManager,
  isGraphicsQualityLevel,
  resolvePersistedGraphicsQualityLevel,
  type GraphicsQualityLevel,
  type GraphicsQualityManager,
} from './scene/graphics/qualityManager';
import {
  createSceneDetailController,
  getMiniatureSceneDetailPolicy,
  getSceneDetailPolicy,
} from './scene/graphics/sceneDetailPolicy';
import { isBackyardSourceCollider } from './scene/level/backyardCollisionPolicies';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from './scene/level/floorElevations';
import { generateFloorSurfaces } from './scene/level/generateFloorSurfaces';
import { generateWallSegmentInstances } from './scene/level/generateWalls';
import {
  PORTFOLIO_LEVEL,
  UPPER_LANDING_FLOOR_MAIN_ID,
} from './scene/level/portfolioLevel';
import {
  applySceneObjectSourceMetadata,
  createSceneObjectDefinitionsById,
  getSceneObjectColliderSourcePurpose,
  registerSceneObjectColliders,
} from './scene/level/sceneObjects';
import type { SceneObjectDefinition } from './scene/level/schema';
import {
  assertLevelSourceId,
  type LevelSourceId,
} from './scene/level/sourceIds';
import {
  createGroundStairSafetyColliders,
  createUpperStairSafetyColliders,
  type LevelSafetyCollider,
} from './scene/level/stairSafetyColliders';
import { UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES } from './scene/level/upperStairwellLandingSegments';
import { getWallColliderDebugIdentity } from './scene/level/wallColliderDebugIdentity';
import { createInteriorLightmapTextures } from './scene/lighting/bakedLightmaps';
import {
  createLightingDebugController,
  type LightingMode,
} from './scene/lighting/debugControls';
import {
  createEnvironmentLightAnimator,
  type EnvironmentLightAnimator,
} from './scene/lighting/environmentAnimator';
import {
  createLedAnimator,
  ROOM_LED_PULSE_PROGRAMS,
  type LedAnimator,
} from './scene/lighting/ledPulsePrograms';
import { createRoomLedStrips } from './scene/lighting/ledStrips';
import {
  createLightmapBounceAnimator,
  type LightmapBounceAnimator,
} from './scene/lighting/lightmapBounceAnimator';
import {
  applySeasonalLightingPreset,
  createSeasonallyAdjustedPrograms,
  resolveSeasonalLightingSchedule,
} from './scene/lighting/seasonalPresets';
import { createCrashBreadcrumbStore } from './scene/performance/crashBreadcrumbs';
import { LowFpsRecoveryMonitor } from './scene/performance/lowFpsRecoveryMonitor';
import {
  createPerformanceDiagnostics,
  type PerformanceCrashBreadcrumbApi,
} from './scene/performance/performanceDiagnostics';
import {
  getQualityFeaturePolicy,
  resolveResizedBasePixelRatio,
  resolveInitialQualityPolicy,
  resolveSoftwareRendererPolicy,
  resolveSoftwareSafeRenderCadence,
} from './scene/performance/qualityPolicy';
import { getRendererInfo } from './scene/performance/rendererCapabilities';
import { createWindowPoiAnalytics } from './scene/poi/analytics';
import {
  computePoiEmphasis,
  computePoiHaloOpacity,
  computePoiLabelOpacity,
} from './scene/poi/emphasis';
import {
  wireGitHubRepoMetrics,
  type GitHubRepoMetricsController,
} from './scene/poi/githubMetrics';
import { PoiInteractionManager } from './scene/poi/interactionManager';
import {
  createPoiInstances,
  updatePoiInstanceDefinition,
  type PoiInstance,
  type PoiInstanceOverrides,
} from './scene/poi/markers';
import {
  clearPoiModelRoots,
  getPoiModelTriangleCount,
  registerPoiModelRoot,
} from './scene/poi/modelTriangles';
import { getPoiPhysicalMetadata } from './scene/poi/physicalMetadata';
import { getPoiInteractionAnchorPosition } from './scene/poi/placements';
import { getPoiDefinitions } from './scene/poi/registry';
import {
  injectPoiStructuredData,
  injectTextPortfolioStructuredData,
} from './scene/poi/structuredData';
import { PoiTooltipOverlay } from './scene/poi/tooltipOverlay';
import type { PoiDefinition, PoiId } from './scene/poi/types';
import { updateVisitedBadge } from './scene/poi/visitedBadge';
import { PoiVisitedState } from './scene/poi/visitedState';
import {
  clearPoiVisualAnchors,
  registerPoiVisualAnchor,
  resolvePoiVisualAnchor,
} from './scene/poi/visualAnchors';
import {
  PoiWorldTooltip,
  type PoiWorldTooltipTarget,
} from './scene/poi/worldTooltip';
import {
  createAxelNavigator,
  type AxelNavigatorBuild,
} from './scene/structures/axelNavigator';
import { createRoomCeilingPanels } from './scene/structures/ceilingPanels';
import { createDoorwayOpenings } from './scene/structures/doorwayOpenings';
import {
  createF2ClipboardConsole,
  type F2ClipboardConsoleBuild,
} from './scene/structures/f2ClipboardConsole';
import {
  createFlywheelShowpiece,
  type FlywheelShowpieceBuild,
} from './scene/structures/flywheel';
import type { FlywheelEnergyTarget } from './scene/structures/flywheelEnergyNetwork';
import {
  createGabrielSentry,
  type GabrielSentryBuild,
} from './scene/structures/gabrielSentry';
import {
  createGitshelvesInstallation,
  type GitshelvesInstallationBuild,
} from './scene/structures/gitshelves';
import {
  createJobbotTerminal,
  type JobbotTerminalBuild,
} from './scene/structures/jobbotTerminal';
import {
  createLowerFloorFurnishings,
  createUpperFloorFurnishings,
} from './scene/structures/lowerFloorFurnishings';
import {
  createLivingRoomMediaWall,
  type LivingRoomMediaWallBuild,
} from './scene/structures/mediaWall';
import { createMediaWallStarBridge } from './scene/structures/mediaWallStarBridge';
import {
  createPortfolioMiniatureTable,
  resolveGroundFloorMiniaturePoiPlacements,
  type MiniaturePoiPlacement,
  type PortfolioMiniatureTableBuild,
} from './scene/structures/portfolioMiniatureTable';
import {
  CEILING_COVE_OFFSET,
  FENCE_HEIGHT,
  FENCE_THICKNESS,
  STAIRCASE_CONFIG,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from './scene/structures/portfolioSceneLayout';
import {
  createPrReaperInstallation,
  type PrReaperInstallationBuild,
} from './scene/structures/prReaperConsole';
import {
  createSelfieMirror,
  type SelfieMirrorBuild,
} from './scene/structures/selfieMirror';
import {
  createSigmaWorkbench,
  type SigmaWorkbenchBuild,
} from './scene/structures/sigmaWorkbench';
import { createStaircase } from './scene/structures/staircase';
import {
  createSugarkubeDeployment,
  type SugarkubeDeploymentBuild,
} from './scene/structures/sugarkubeDeployment';
import {
  createTokenPlaceWorkstation,
  type TokenPlaceWorkstationBuild,
} from './scene/structures/tokenPlaceWorkstation';
import {
  createUpperLandingFloorCutouts,
  createUpperLandingStairRunApproachFootprint,
} from './scene/structures/upperLandingFloorCutouts';
import {
  createUpperStairwellLanding,
  type UpperStairwellLandingCollider,
} from './scene/structures/upperStairwellLanding';
import {
  createWallPaintings,
  type WallPaintingsBuild,
} from './scene/structures/wallPaintings';
import { createWallSegmentMeshes } from './scene/structures/wallSegmentsMesh';
import {
  createWoveLoom,
  type WoveLoomBuild,
} from './scene/structures/woveLoom';
import {
  AmbientAudioController,
  type AmbientAudioBedDefinition,
  type AmbientAudioSource,
} from './systems/audio/ambientAudio';
import {
  AMBIENT_AUDIO_PREFERENCE_STORAGE_KEY,
  AmbientAudioPreference,
  bindAmbientAudioPreference,
  type AmbientAudioPreferenceBindingHandle,
} from './systems/audio/ambientAudioPreference';
import { AmbientCaptionBridge } from './systems/audio/ambientCaptionBridge';
import { getBackyardAmbientBedDescriptor } from './systems/audio/backyardAmbientCatalog';
import {
  createFootstepAudioController,
  type FootstepAudioControllerHandle,
} from './systems/audio/footstepController';
import {
  createCricketChorusBuffer,
  createDistantHumBuffer,
  createFootstepBuffer,
} from './systems/audio/proceduralBuffers';
import {
  applyPinchCameraZoom,
  applyCameraZoomStep,
  applyWheelCameraZoomStep,
  getKeyboardZoomDirection,
  isTextEntryTarget,
} from './systems/camera/zoomControls';
import { collidesWithColliders, type RectCollider } from './systems/collision';
import {
  createAccessibilityPresetControl,
  type AccessibilityPresetControlHandle,
} from './systems/controls/accessibilityPresetControl';
import {
  createAudioHudControl,
  type AudioHudControlHandle,
} from './systems/controls/audioHudControl';
import { createAvatarAccessoryControl } from './systems/controls/avatarAccessoryControl';
import { createAvatarVariantControl } from './systems/controls/avatarVariantControl';
import {
  createGraphicsQualityControl,
  type GraphicsQualityControlHandle,
} from './systems/controls/graphicsQualityControl';
import {
  KeyBindings,
  createKeyBindingAwareSource,
  formatKeyLabel,
  type KeyBindingAction,
  type KeyBindingConfig,
} from './systems/controls/keyBindings';
import { KeyboardControls } from './systems/controls/KeyboardControls';
import {
  createLocaleToggleControl,
  type LocaleToggleControlHandle,
} from './systems/controls/localeToggleControl';
import {
  createMotionBlurControl,
  type MotionBlurControlHandle,
} from './systems/controls/motionBlurControl';
import { VirtualJoystick } from './systems/controls/VirtualJoystick';
import {
  createManualModeToggle,
  type ManualModeToggleHandle,
} from './systems/failover/manualModeToggle';
import {
  clearModePreference,
  shouldPersistTextPreferenceForFallback,
  writeModePreference,
} from './systems/failover/modePreference';
import { createPerformanceFailoverHandler } from './systems/failover/performanceFailover';
import { createGitHubRepoStatsService } from './systems/github/repoStats';
import {
  createAnalyticsGlowRhythm,
  type AnalyticsGlowRhythmHandle,
} from './systems/hud/analyticsGlowRhythm';
import { getCameraRelativeMovementVector } from './systems/movement/cameraRelativeMovement';
import {
  computeCameraRelativeYaw,
  computeModelYawFromVector,
  angularDifference,
  dampYawTowards,
  getCameraRelativeDirection,
  normalizeRadians,
} from './systems/movement/facing';
import {
  computeStairLayout,
  computeStairwellOpeningBounds,
} from './systems/movement/stairLayout';
import {
  classifyStairTransitionZone,
  createStairNavigationZones,
  isWithinLanding,
  isWithinStairWidth,
  predictStairFloorId,
  sampleStairSurfaceHeight,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from './systems/movement/stairs';
import { createNavMesh, type NavMesh } from './systems/navigation/navMesh';
import {
  createInputLatencyTelemetry,
  type InputLatencyTelemetryHandle,
} from './systems/performance/inputLatencyTelemetry';
import { createTutorialController } from './systems/tutorial/tutorialController';
import { getPulseScale } from './ui/accessibility/animationPreferences';
import {
  createHudFocusAnnouncer,
  type HudFocusAnnouncerHandle,
} from './ui/accessibility/hudFocusAnnouncer';
import { InteractionTimeline } from './ui/accessibility/interactionTimeline';
import { getModeAnnouncer } from './ui/accessibility/modeAnnouncer';
import {
  ACCESSIBILITY_PRESETS,
  createAccessibilityPresetManager,
  type AccessibilityPresetManager,
} from './ui/accessibility/presetManager';
import {
  createAudioSubtitles,
  type AudioSubtitlesHandle,
} from './ui/hud/audioSubtitles';
import {
  applyControlOverlayStrings,
  applyHudMenuButtonMetadata,
} from './ui/hud/controlOverlay';
import { applyControlOverlayAccessibility } from './ui/hud/controlOverlayAccessibility';
import {
  createHudCustomizationSection,
  type HudCustomizationHandle,
} from './ui/hud/customizationSection';
import { canHandleGameplayShortcut } from './ui/hud/gameplayShortcutGating';
import { createHelpModal } from './ui/hud/helpModal';
import {
  attachHelpModalController,
  type HelpModalControllerHandle,
} from './ui/hud/helpModalController';
import {
  createHudPanelCoordinator,
  type HudPanelCoordinatorHandle,
} from './ui/hud/hudPanelCoordinator';
import {
  createHudLayoutManager,
  type HudLayout,
  type HudLayoutManagerHandle,
} from './ui/hud/layoutManager';
import {
  createMovementLegend,
  type MovementLegendHandle,
} from './ui/hud/movementLegend';
import {
  createResponsiveControlOverlay,
  type ResponsiveControlOverlayHandle,
} from './ui/hud/responsiveControlOverlay';
import { applySettingsControlOrder } from './ui/hud/settingsOrder';
import { createTutorialPanel } from './ui/hud/tutorialPanel';
import {
  createContinuousSoftwareImmersiveUrl,
  createImmersiveModeUrl,
  createSoftwareSafeImmersiveUrl,
  createImmersiveRecoveryUrl,
  createTextModeUrl,
  shouldDisablePerformanceFailover,
} from './ui/immersiveUrl';
import { createSoftwareRendererWarning } from './ui/softwareRendererWarning';

interface ImmersiveControlOverlayAccessibilityOptions {
  container: HTMLElement;
  heading?: HTMLElement | null;
  controlsButton?: HTMLButtonElement | null;
  helpButton?: HTMLButtonElement | null;
  documentTarget?: Document;
}

function getMotionBlurControlCopy(
  hudStrings: ReturnType<typeof getLocaleStrings>['hud']
) {
  return hudStrings.motionBlur;
}

export const applyImmersiveControlOverlayAccessibility = ({
  container,
  heading,
  controlsButton,
  helpButton,
  documentTarget,
}: ImmersiveControlOverlayAccessibilityOptions) => {
  applyControlOverlayAccessibility({
    container,
    heading,
    controlsButton,
    helpButton,
    documentTarget,
  });
};

const LOCALE_STORAGE_KEY = 'danielsmith.io:locale';
const DEBUG_COORDINATES_STORAGE_KEY = 'danielsmith.io::debugCoordinates::v1';
const DEBUG_COLLIDERS_STORAGE_KEY = 'danielsmith.io::debugColliders::v1';
const DEBUG_COLLIDER_IDS_STORAGE_KEY = 'danielsmith.io::debugColliderIds::v1';
const DEBUG_SOLID_IDS_STORAGE_KEY = 'danielsmith.io::debugSolidIds::v1';
const DEBUG_FPS_STORAGE_KEY = 'danielsmith.io::debugFpsCounter::v1';
const DEBUG_URL_TRUTHY_VALUES = ['1', 'true', 'yes', 'on'] as const;
const DEBUG_URL_FALSY_VALUES = ['0', 'false', 'no', 'off'] as const;
const isDebugUrlValueIn = (
  value: string | null | undefined,
  candidates: readonly string[]
) => {
  const normalizedValue = value?.toLowerCase() ?? '';
  return candidates.some((candidate) => candidate === normalizedValue);
};
const AVATAR_ASSET_REQUIRED_BONES = ['Hips', 'Spine'] as const;
const AVATAR_ASSET_REQUIRED_ANIMATIONS = ['Idle', 'Walk', 'Run'] as const;
const AVATAR_ASSET_EXPECTED_UNIT_SCALE = 1;
const AVATAR_ASSET_SCALE_TOLERANCE = 0.02;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 12;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CAMERA_ZOOM_SMOOTHING = 6;
const CAMERA_MARGIN = 1.1;
const MIN_CAMERA_ZOOM = 0.65;
const MAX_CAMERA_ZOOM = 12;
const MANNEQUIN_YAW_SMOOTHING = 8;
const BACKYARD_ROOM_ID = 'backyard';
const PENDING_SCENE_DETAIL_RELOAD_KEY =
  'portfolio::pending-scene-detail-reload-level';
const PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY =
  'portfolio::pending-scene-detail-adaptive-lock';
const PENDING_SCENE_DETAIL_RELOAD_PARAM = 'sceneDetailReloadLevel';
const PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM = 'sceneDetailAdaptiveLock';
const PENDING_PLAYER_POSITION_KEY = 'portfolio::pending-player-position';
const PENDING_PLAYER_POSITION_X_PARAM = 'pendingPlayerX';
const PENDING_PLAYER_POSITION_Y_PARAM = 'pendingPlayerY';
const PENDING_PLAYER_POSITION_Z_PARAM = 'pendingPlayerZ';

interface PendingSceneDetailReload {
  level: GraphicsQualityLevel;
  adaptivePerformanceRecoveryLocked: boolean;
}

interface PendingPlayerPosition {
  x: number;
  y: number;
  z: number;
}

function consumePendingSceneDetailReload(): PendingSceneDetailReload | null {
  try {
    const stored = window.sessionStorage.getItem(
      PENDING_SCENE_DETAIL_RELOAD_KEY
    );
    const adaptiveLock =
      window.sessionStorage.getItem(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY) ===
      '1';
    window.sessionStorage.removeItem(PENDING_SCENE_DETAIL_RELOAD_KEY);
    window.sessionStorage.removeItem(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY);
    if (isGraphicsQualityLevel(stored)) {
      return { level: stored, adaptivePerformanceRecoveryLocked: adaptiveLock };
    }
  } catch {
    // Fall through to the URL handoff used when sessionStorage is unavailable.
  }

  try {
    const url = new URL(window.location.href);
    const stored = url.searchParams.get(PENDING_SCENE_DETAIL_RELOAD_PARAM);
    const adaptiveLock =
      url.searchParams.get(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM) === '1';
    url.searchParams.delete(PENDING_SCENE_DETAIL_RELOAD_PARAM);
    url.searchParams.delete(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM);
    window.history.replaceState(window.history.state, '', url);
    return isGraphicsQualityLevel(stored)
      ? { level: stored, adaptivePerformanceRecoveryLocked: adaptiveLock }
      : null;
  } catch {
    return null;
  }
}

function persistPendingPlayerPosition(
  position: PendingPlayerPosition
): boolean {
  try {
    window.sessionStorage.setItem(
      PENDING_PLAYER_POSITION_KEY,
      JSON.stringify(position)
    );
    return window.sessionStorage.getItem(PENDING_PLAYER_POSITION_KEY) !== null;
  } catch {
    return false;
  }
}

function consumePendingPlayerPosition(): PendingPlayerPosition | null {
  try {
    const stored = window.sessionStorage.getItem(PENDING_PLAYER_POSITION_KEY);
    window.sessionStorage.removeItem(PENDING_PLAYER_POSITION_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as Partial<PendingPlayerPosition>;
    const { x, y, z } = parsed;
    return typeof x === 'number' &&
      typeof y === 'number' &&
      typeof z === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(z)
      ? { x, y, z }
      : null;
  } catch {
    // Fall through to the URL handoff used when sessionStorage is unavailable.
  }

  try {
    const url = new URL(window.location.href);
    const storedX = url.searchParams.get(PENDING_PLAYER_POSITION_X_PARAM);
    const storedY = url.searchParams.get(PENDING_PLAYER_POSITION_Y_PARAM);
    const storedZ = url.searchParams.get(PENDING_PLAYER_POSITION_Z_PARAM);
    url.searchParams.delete(PENDING_PLAYER_POSITION_X_PARAM);
    url.searchParams.delete(PENDING_PLAYER_POSITION_Y_PARAM);
    url.searchParams.delete(PENDING_PLAYER_POSITION_Z_PARAM);
    window.history.replaceState(window.history.state, '', url);
    if (storedX === null || storedY === null || storedZ === null) {
      return null;
    }
    const x = Number(storedX);
    const y = Number(storedY);
    const z = Number(storedZ);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
      ? { x, y, z }
      : null;
  } catch {
    return null;
  }
}

function persistPendingSceneDetailReload(
  pendingReload: PendingSceneDetailReload
): boolean {
  try {
    window.sessionStorage.setItem(
      PENDING_SCENE_DETAIL_RELOAD_KEY,
      pendingReload.level
    );
    window.sessionStorage.setItem(
      PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY,
      pendingReload.adaptivePerformanceRecoveryLocked ? '1' : '0'
    );
    return (
      window.sessionStorage.getItem(PENDING_SCENE_DETAIL_RELOAD_KEY) ===
        pendingReload.level &&
      window.sessionStorage.getItem(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY) ===
        (pendingReload.adaptivePerformanceRecoveryLocked ? '1' : '0')
    );
  } catch {
    return false;
  }
}

function reloadWithPendingSceneDetailParam(
  pendingReload: PendingSceneDetailReload,
  playerPosition?: PendingPlayerPosition
): boolean {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(
      PENDING_SCENE_DETAIL_RELOAD_PARAM,
      pendingReload.level
    );
    if (playerPosition) {
      url.searchParams.set(
        PENDING_PLAYER_POSITION_X_PARAM,
        String(playerPosition.x)
      );
      url.searchParams.set(
        PENDING_PLAYER_POSITION_Y_PARAM,
        String(playerPosition.y)
      );
      url.searchParams.set(
        PENDING_PLAYER_POSITION_Z_PARAM,
        String(playerPosition.z)
      );
    }
    if (pendingReload.adaptivePerformanceRecoveryLocked) {
      url.searchParams.set(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM, '1');
    } else {
      url.searchParams.delete(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM);
    }
    window.location.assign(url.toString());
    return true;
  } catch {
    return false;
  }
}

const PERFORMANCE_FAILOVER_FPS_THRESHOLD = 30;
const PERFORMANCE_FAILOVER_DURATION_MS = 5000;
const LOW_FPS_RECOVERY_THRESHOLD = 5;
const LOW_FPS_RECOVERY_WINDOW_MS = 10_000;
const LOW_FPS_RECOVERY_COOLDOWN_MS = 30_000;
const INPUT_LATENCY_P95_BUDGET_MS = 200;

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

let locomotionAnimator: AvatarLocomotionAnimatorHandle | null = null;
let avatarFootIkController: AvatarFootIkControllerHandle | null = null;
let locomotionLinearSpeed = 0;
let locomotionAngularSpeed = 0;

const LIGHTING_OPTIONS = {
  enableLedStrips: true,
  enableBloom: true,
  ledEmissiveIntensity: 3.2,
  ledLightIntensity: 1.4,
  // Further tone down bloom: barely perceptible halo
  bloomStrength: 0.12,
  bloomRadius: 0.45,
  bloomThreshold: 0.78,
} as const;

const groundColliders: RectCollider[] = [];
const namedColliderDebugNames = new Map<RectCollider, string>();
const colliderSourceMetadata = new Map<
  RectCollider,
  {
    sourceId:
      | WallSegmentInstance['sourceId']
      | LevelSafetyCollider['sourceId']
      | SceneObjectDefinition['sourceId']
      | LevelSourceId;
    sourceType: 'wall' | 'safetyCollider' | 'sceneObject' | 'generatedCollider';
    purpose?: string;
    role?: string;
    intent?: string;
    debugId?: string;
  }
>();
const upperFloorColliders: RectCollider[] = [];

const sceneObjectDefinitionsById =
  createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);

const getSceneObjectDefinition = (
  id: string
): SceneObjectDefinition | undefined => sceneObjectDefinitionsById.get(id);

const requireSceneObjectDefinition = (id: string): SceneObjectDefinition => {
  const definition = getSceneObjectDefinition(id);
  if (!definition) {
    throw new Error(`Missing scene object definition for ${id}.`);
  }
  return definition;
};

const SELFIE_MIRROR_SCENE_OBJECT_ID = 'selfie-mirror-living-room';
const SELFIE_MIRROR_SCENE_OBJECT_DEFINITION = requireSceneObjectDefinition(
  SELFIE_MIRROR_SCENE_OBJECT_ID
);
const SELFIE_MIRROR_COLLIDER_SOURCE_ID = assertLevelSourceId(
  SELFIE_MIRROR_SCENE_OBJECT_DEFINITION.sourceId
);
const SELFIE_MIRROR_COLLIDER_DEBUG_ID = assertDebugColliderId('101A');

const staticColliders: RectCollider[] = [];
const poiInstances: PoiInstance[] = [];
let backyardEnvironment: BackyardEnvironmentBuild | null = null;
let flywheelShowpiece: FlywheelShowpieceBuild | null = null;
let f2ClipboardConsole: F2ClipboardConsoleBuild | null = null;
let sigmaWorkbench: SigmaWorkbenchBuild | null = null;
let woveLoom: WoveLoomBuild | null = null;
let jobbotTerminal: JobbotTerminalBuild | null = null;
let axelNavigator: AxelNavigatorBuild | null = null;
let tokenPlaceWorkstation: TokenPlaceWorkstationBuild | null = null;
let sugarkubeDeployment: SugarkubeDeploymentBuild | null = null;
let portfolioMiniatureTable: PortfolioMiniatureTableBuild | null = null;

function disposePortfolioMiniatureTableBuild() {
  portfolioMiniatureTable?.dispose();
  portfolioMiniatureTable = null;
}
let prReaperInstallation: PrReaperInstallationBuild | null = null;

function disposePrReaperInstallationBuild() {
  prReaperInstallation?.dispose();
  prReaperInstallation = null;
}
let gabrielSentry: GabrielSentryBuild | null = null;
let gitshelvesInstallation: GitshelvesInstallationBuild | null = null;
const mediaWallStarBridge = createMediaWallStarBridge();
let livingRoomMediaWall: LivingRoomMediaWallBuild | null = null;
let futuroptimistTvModelRoot: Object3D | null = null;
let selfieMirror: SelfieMirrorBuild | null = null;
let wallPaintings: WallPaintingsBuild | null = null;
let ledStripGroup: Group | null = null;
let ledFillLightGroup: Group | null = null;
const ledStripMaterials: MeshStandardMaterial[] = [];
const ledFillLightsList: PointLight[] = [];
let ledAnimator: LedAnimator | null = null;
let lightmapAnimator: LightmapBounceAnimator | null = null;
let environmentLightAnimator: EnvironmentLightAnimator | null = null;
let ambientAudioController: AmbientAudioController | null = null;
let ambientAudioPreference: AmbientAudioPreference | null = null;
let ambientAudioPreferenceBinding: AmbientAudioPreferenceBindingHandle | null =
  null;
let footstepAudioController: FootstepAudioControllerHandle | null = null;
let footstepAudio: Audio | null = null;
let avatarInteractionAnimator: AvatarInteractionAnimatorHandle | null = null;
let removePoiInteractionAnimation: (() => void) | null = null;

const roomDefinitions = new Map(
  FLOOR_PLAN.rooms.map((room) => [room.id, room])
);

function getRoomCategory(roomId: string): RoomCategory {
  const room = roomDefinitions.get(roomId);
  return room?.category ?? 'interior';
}

function getLevelFloor(floorId: FloorId) {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Portfolio level is missing floor "${floorId}".`);
  return floor;
}

export function initializeImmersiveScene(
  container: HTMLElement,
  onFatalError: ImmersiveFatalErrorHandler,
  markAppReady: AppReadyMarker
) {
  clearPoiVisualAnchors();
  clearPoiModelRoots();
  const immersiveUrl = createImmersiveModeUrl();
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const rendererInfo = getRendererInfo(renderer);
  const softwareRendererPolicy = resolveSoftwareRendererPolicy(
    rendererInfo,
    window.location.search
  );
  let qualityStorage: Storage | undefined;
  try {
    qualityStorage = window.localStorage;
  } catch {
    qualityStorage = undefined;
  }
  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const userAgent = navigator.userAgent.toLowerCase();
  const navigatorWithMemory = navigator as Navigator & {
    deviceMemory?: number;
  };
  const persistedQualityLevel = rendererInfo.isSoftwareRenderer
    ? null
    : resolvePersistedGraphicsQualityLevel(qualityStorage);
  const initialQualityPolicy = resolveInitialQualityPolicy(
    rendererInfo,
    window.devicePixelRatio ?? 1,
    softwareRendererPolicy,
    {
      coarsePointer,
      mobileLike: /android|iphone|ipod|mobile/.test(userAgent),
      tabletLike:
        /ipad|tablet/.test(userAgent) ||
        (coarsePointer && window.innerWidth >= 700),
      deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      explicitGraphicsQualityLevel: persistedQualityLevel,
    }
  );
  const sceneDetailReloadOverride = consumePendingSceneDetailReload();
  const pendingPlayerPosition = consumePendingPlayerPosition();
  const effectiveInitialQualityLevel =
    sceneDetailReloadOverride?.level ??
    persistedQualityLevel ??
    initialQualityPolicy.initialLevel;
  const initialSceneDetailLevel =
    sceneDetailReloadOverride?.level ??
    persistedQualityLevel ??
    initialQualityPolicy.sceneDetailLevel;
  const sceneDetailController = createSceneDetailController(
    initialSceneDetailLevel
  );
  let activeSceneDetailPolicy = getSceneDetailPolicy(initialSceneDetailLevel);
  const applySceneDetailLevel = (
    level: GraphicsQualityLevel,
    options: {
      reloadScene?: boolean;
      adaptivePerformanceRecoveryLocked?: boolean;
    } = {}
  ) => {
    if (level === sceneDetailController.getLevel()) {
      activeSceneDetailPolicy = sceneDetailController.getPolicy();
      return false;
    }
    if (options.reloadScene) {
      const pendingReload = {
        level,
        adaptivePerformanceRecoveryLocked:
          options.adaptivePerformanceRecoveryLocked === true,
      } satisfies PendingSceneDetailReload;
      const playerPosition =
        typeof player !== 'undefined'
          ? {
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
            }
          : undefined;
      const didPersistPlayerPosition = playerPosition
        ? persistPendingPlayerPosition(playerPosition)
        : false;
      if (persistPendingSceneDetailReload(pendingReload)) {
        window.location.reload();
        return true;
      }
      if (
        reloadWithPendingSceneDetailParam(
          pendingReload,
          didPersistPlayerPosition ? undefined : playerPosition
        )
      ) {
        return true;
      }
      console.warn(
        '[performance] scene detail reload handoff unavailable; applying policy without reload'
      );
    }
    sceneDetailController.setLevel(level);
    activeSceneDetailPolicy = sceneDetailController.getPolicy();
    return false;
  };
  const maxPolicyPixelRatioCap = rendererInfo.isDangerousSoftwareRenderer
    ? initialQualityPolicy.basePixelRatioCap
    : rendererInfo.isSoftwareRenderer
      ? 0.75
      : 1.25;
  document.documentElement.dataset.softwareRendererMode =
    softwareRendererPolicy.mode;
  document.documentElement.dataset.dangerousRenderer = String(
    rendererInfo.isDangerousSoftwareRenderer
  );

  const crashBreadcrumbs = createCrashBreadcrumbStore({
    storage: (() => {
      try {
        return window.localStorage;
      } catch {
        try {
          return window.sessionStorage;
        } catch {
          return undefined;
        }
      }
    })(),
  });
  const adaptivePixelRatioCap = Number.POSITIVE_INFINITY;
  let basePixelRatio = initialQualityPolicy.basePixelRatioCap;
  renderer.setPixelRatio(basePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new Color(0x0d121c));
  container.appendChild(renderer.domElement);

  ledStripMaterials.length = 0;
  ledFillLightsList.length = 0;
  ledAnimator = null;
  environmentLightAnimator = null;

  let inputLatencyTelemetry: InputLatencyTelemetryHandle | null = null;
  let manualModeToggle: ManualModeToggleHandle | null = null;
  let hudLayoutManager: HudLayoutManagerHandle | null = null;
  let responsiveControlOverlay: ResponsiveControlOverlayHandle | null = null;
  let hudPanelCoordinator: HudPanelCoordinatorHandle | null = null;
  let immersiveLifecycle: 'building' | 'ready' | 'disposing' | 'disposed' =
    'building';
  let immersiveDisposed = false;
  let lowFpsRecoveryPopup: HTMLElement | null = null;
  let lowFpsRecoveryMonitor: LowFpsRecoveryMonitor | null = null;
  let beforeUnloadHandler: (() => void) | null = null;
  let audioHudHandle: AudioHudControlHandle | null = null;
  let motionBlurControl: MotionBlurControlHandle | null = null;
  let audioSubtitles: AudioSubtitlesHandle | null = null;
  let ambientCaptionBridge: AmbientCaptionBridge | null = null;
  let graphicsQualityManager: GraphicsQualityManager | null = null;
  let graphicsQualityControl: GraphicsQualityControlHandle | null = null;
  let performanceDiagnostics: ReturnType<
    typeof createPerformanceDiagnostics
  > | null = null;
  let unsubscribeGraphicsQuality: (() => void) | null = null;
  let accessibilityPresetManager: AccessibilityPresetManager | null = null;
  let accessibilityControlHandle: AccessibilityPresetControlHandle | null =
    null;
  let unsubscribeAccessibility: (() => void) | null = null;
  let avatarVariantManager: AvatarVariantManager | null = null;
  let hudCustomizationSection: HudCustomizationHandle | null = null;
  let unsubscribeAvatarVariant: (() => void) | null = null;
  let avatarAccessorySuite: AvatarAccessorySuite | null = null;
  let avatarAccessoryManager: AvatarAccessoryManager | null = null;
  let unsubscribeAvatarAccessories: (() => void) | null = null;
  let avatarAssetPipeline: AvatarAssetPipeline | null = null;
  let softwareRendererWarning: ReturnType<
    typeof createSoftwareRendererWarning
  > | null = null;
  let softwareSafeRenderRequested = true;
  const softwareSafeRenderEvents = [
    'keydown',
    'pointerdown',
    'pointermove',
    'wheel',
    'resize',
  ] as const;
  const requestSoftwareSafeRender = () => {
    softwareSafeRenderRequested = true;
  };
  const recordRendererWarning = (message: string) => {
    crashBreadcrumbs.record({
      type: 'renderer-warning',
      message,
      renderer: rendererInfo,
      softwareRendererPolicy,
    });
  };
  let hudFocusAnnouncer: HudFocusAnnouncerHandle | null = null;
  let helpModalController: HelpModalControllerHandle | null = null;
  let localeToggleControl: LocaleToggleControlHandle | null = null;
  let githubRepoMetrics: GitHubRepoMetricsController | null = null;
  let getAmbientAudioVolume = () =>
    ambientAudioController?.getMasterVolume() ?? 1;
  let setAmbientAudioVolume = (volume: number) => {
    ambientAudioController?.setMasterVolume(volume);
  };

  const stopFootstepAudio = () => {
    if (!footstepAudio) {
      return;
    }
    footstepAudio.setVolume(0);
    if (footstepAudio.isPlaying) {
      footstepAudio.stop();
    }
  };

  const hardDisableRuntimeAudio = () => {
    ambientAudioController?.disable();
    footstepAudioController?.setEnabled(false);
    stopFootstepAudio();
    ambientCaptionBridge?.clear();
    audioHudHandle?.refresh();
  };

  let globalAudioTransitionId = 0;

  const setGlobalAudioEnabled = async (
    enabled: boolean,
    source: 'control' | 'storage' = 'control'
  ) => {
    const transitionId = ++globalAudioTransitionId;

    if (!enabled) {
      hardDisableRuntimeAudio();
      ambientAudioPreference?.setEnabled(false, source);
      audioHudHandle?.refresh();
      return;
    }

    if (!ambientAudioController) {
      if (source === 'control') {
        ambientAudioPreference?.setEnabled(false, source);
      }
      audioHudHandle?.refresh();
      return;
    }

    try {
      await ambientAudioController.enable();
      if (
        transitionId !== globalAudioTransitionId ||
        (source === 'storage' &&
          !(ambientAudioPreference?.isEnabled() ?? false))
      ) {
        hardDisableRuntimeAudio();
        audioHudHandle?.refresh();
        return;
      }
      footstepAudioController?.setEnabled(true);
      ambientAudioPreference?.setEnabled(true, source);
    } catch (error) {
      hardDisableRuntimeAudio();
      if (source === 'control') {
        ambientAudioPreference?.setEnabled(false, source);
      }
      audioHudHandle?.refresh();
      throw error;
    }
    audioHudHandle?.refresh();
  };

  const getAudioDebugState = () => {
    const snapshots = ambientAudioController?.getBedSnapshots() ?? [];
    const ambientSourcesPlaying = snapshots.map((snapshot) => ({
      id: snapshot.id,
      isPlaying: snapshot.definition.source.isPlaying,
    }));
    return {
      preferenceEnabled: ambientAudioPreference?.isEnabled() ?? false,
      ambientEnabled: ambientAudioController?.isEnabled() ?? false,
      ambientSourcesPlaying,
      ambientSourcesPlayingCount: ambientSourcesPlaying.filter(
        (source) => source.isPlaying
      ).length,
      ambientBedVolumes: snapshots.map((snapshot) => ({
        id: snapshot.id,
        currentVolume: snapshot.currentVolume,
        targetVolume: snapshot.targetVolume,
      })),
      footstepEnabled: footstepAudioController?.isEnabled() ?? false,
      footstepPlaying: footstepAudio?.isPlaying ?? false,
      masterVolume: ambientAudioController?.getMasterVolume() ?? 0,
      baseVolume: getAmbientAudioVolume(),
      audioContextState: audioListener?.context?.state ?? 'unknown',
      storageKeyVersion: 'v2',
      activeStorageKey:
        ambientAudioPreference?.getStorageKey() ??
        AMBIENT_AUDIO_PREFERENCE_STORAGE_KEY,
    };
  };

  let localeStorage: Storage | undefined;
  try {
    localeStorage = window.localStorage;
  } catch {
    localeStorage = undefined;
  }

  let ambientAudioStorage: Storage | undefined;
  try {
    ambientAudioStorage = window.localStorage;
  } catch {
    try {
      ambientAudioStorage = window.sessionStorage;
    } catch {
      ambientAudioStorage = undefined;
    }
  }

  inputLatencyTelemetry = createInputLatencyTelemetry({
    windowTarget: window,
    documentTarget: document,
    budgetMs: INPUT_LATENCY_P95_BUDGET_MS,
  });

  const detectedLanguage =
    typeof navigator !== 'undefined' && navigator.language
      ? navigator.language
      : document.documentElement.lang;
  const exposePseudoLocale = isI18nDebugEnabled({
    dev: import.meta.env.DEV,
    search: window.location.search,
    storage: localeStorage ?? null,
  });
  const storedLocale = localeStorage?.getItem(LOCALE_STORAGE_KEY);
  let locale: Locale = resolveInitialLocale({
    storedLocale,
    detectedLanguage,
    exposePseudoLocale,
    clearStoredLocale: () => {
      try {
        localeStorage?.removeItem(LOCALE_STORAGE_KEY);
      } catch {
        /* ignore storage write failures */
      }
    },
  });
  document.documentElement.lang = locale === 'en-x-pseudo' ? 'en' : locale;
  const htmlDirection = getLocaleDirection(locale);
  document.documentElement.dir = htmlDirection;
  document.documentElement.dataset.localeDirection = htmlDirection;
  document.documentElement.dataset.localeScript = getLocaleScript(locale);
  let controlOverlayStrings = getControlOverlayStrings(locale);
  let helpModalStrings = getHelpModalStrings(locale);
  let tutorialPanelStrings = getTutorialPanelStrings(locale);
  let hudCustomizationStrings = getHudCustomizationStrings(locale);
  let localeToggleStrings = getLocaleToggleStrings(locale);
  let modeToggleStrings = getModeToggleStrings(locale);
  let audioHudStrings = getAudioHudControlStrings(locale);
  let audioSubtitleStrings = getAudioSubtitleStrings(locale);
  let poiOverlayStrings = getPoiOverlayChromeStrings(locale);
  let debugCoordinatesStrings = getDebugCoordinatesStrings(locale);
  let debugCollidersStrings = getDebugCollidersStrings(locale);
  let graphicsQualityStrings = getLocaleStrings(locale).hud.graphicsQuality;
  let accessibilityPresetStrings =
    getLocaleStrings(locale).hud.accessibilityPresets;
  let softwareRendererWarningStrings =
    getSoftwareRendererWarningStrings(locale);
  let lowFpsRecoveryStrings = getLowFpsRecoveryStrings(locale);
  let siteStrings = getSiteStrings(locale);
  let debugCoordinatesStorage: Storage | undefined;
  try {
    debugCoordinatesStorage = window.localStorage;
  } catch {
    debugCoordinatesStorage = undefined;
  }
  const debugCoordinatesUrlOverride = new URLSearchParams(
    window.location.search
  ).get('debugCoordinates');
  const debugCoordinatesUrlEnabled = isDebugUrlValueIn(
    debugCoordinatesUrlOverride,
    DEBUG_URL_TRUTHY_VALUES
  );
  const debugCoordinatesStoredEnabled =
    debugCoordinatesStorage?.getItem(DEBUG_COORDINATES_STORAGE_KEY) === '1';
  let debugCoordinatesEnabled =
    debugCoordinatesUrlEnabled || debugCoordinatesStoredEnabled;

  const debugCollidersUrlOverride = new URLSearchParams(
    window.location.search
  ).get('debugColliders');
  const debugCollidersUrlEnabled = isDebugUrlValueIn(
    debugCollidersUrlOverride,
    DEBUG_URL_TRUTHY_VALUES
  );
  const debugCollidersUrlDisabled = isDebugUrlValueIn(
    debugCollidersUrlOverride,
    DEBUG_URL_FALSY_VALUES
  );
  const debugCollidersStoredEnabled =
    debugCoordinatesStorage?.getItem(DEBUG_COLLIDERS_STORAGE_KEY) === '1';
  let debugCollidersEnabled = debugCollidersUrlDisabled
    ? false
    : debugCollidersUrlEnabled || debugCollidersStoredEnabled;
  const debugColliderIdsUrlOverride = new URLSearchParams(
    window.location.search
  ).get('debugColliderIds');
  const debugColliderIdsUrlEnabled = isDebugUrlValueIn(
    debugColliderIdsUrlOverride,
    DEBUG_URL_TRUTHY_VALUES
  );
  const debugColliderIdsUrlDisabled = isDebugUrlValueIn(
    debugColliderIdsUrlOverride,
    DEBUG_URL_FALSY_VALUES
  );
  const debugColliderIdsStoredEnabled =
    debugCoordinatesStorage?.getItem(DEBUG_COLLIDER_IDS_STORAGE_KEY) !== '0';
  let debugColliderIdsEnabled = debugColliderIdsUrlDisabled
    ? false
    : debugColliderIdsUrlEnabled || debugColliderIdsStoredEnabled;

  const debugSolidIdsUrlOverride = new URLSearchParams(
    window.location.search
  ).get('debugSolidIds');
  const debugSolidIdsUrlEnabled = isDebugUrlValueIn(
    debugSolidIdsUrlOverride,
    DEBUG_URL_TRUTHY_VALUES
  );
  const debugSolidIdsUrlDisabled = isDebugUrlValueIn(
    debugSolidIdsUrlOverride,
    DEBUG_URL_FALSY_VALUES
  );
  const debugSolidIdsStoredEnabled =
    debugCoordinatesStorage?.getItem(DEBUG_SOLID_IDS_STORAGE_KEY) === '1';
  let debugSolidIdsEnabled = debugSolidIdsUrlDisabled
    ? false
    : debugSolidIdsUrlEnabled || debugSolidIdsStoredEnabled;

  const debugFpsUrlOverride = new URLSearchParams(window.location.search).get(
    'debugFps'
  );
  const debugFpsUrlEnabled = isDebugUrlValueIn(
    debugFpsUrlOverride,
    DEBUG_URL_TRUTHY_VALUES
  );
  const debugFpsUrlDisabled = isDebugUrlValueIn(
    debugFpsUrlOverride,
    DEBUG_URL_FALSY_VALUES
  );
  const debugFpsStoredEnabled =
    debugCoordinatesStorage?.getItem(DEBUG_FPS_STORAGE_KEY) === '1';
  let debugFpsEnabled = debugFpsUrlDisabled
    ? false
    : debugFpsUrlEnabled || debugFpsStoredEnabled;
  const debugPerformanceOverlay = createDebugPerformanceOverlay();
  debugPerformanceOverlay.setFpsEnabled(debugFpsEnabled);

  let debugCoordinatesControl: HTMLButtonElement | null = null;
  let debugCollidersControl: HTMLButtonElement | null = null;
  let debugColliderIdsControl: HTMLButtonElement | null = null;
  let debugSolidIdsControl: HTMLButtonElement | null = null;
  let debugFpsControl: HTMLButtonElement | null = null;
  let debugCoordinatesOverlay: HTMLElement | null = null;
  let debugCoordinatesHeading: HTMLDivElement | null = null;
  let debugCoordinatesInterval: number | null = null;
  function disposePartiallyInitializedImmersiveResources() {
    if (
      immersiveLifecycle === 'disposed' ||
      immersiveLifecycle === 'disposing'
    ) {
      return;
    }
    immersiveLifecycle = 'disposing';
    if (inputLatencyTelemetry) {
      inputLatencyTelemetry.report('dispose-partial');
      inputLatencyTelemetry.dispose();
      inputLatencyTelemetry = null;
    }
    softwareSafeRenderEvents.forEach((eventName) => {
      window.removeEventListener(eventName, requestSoftwareSafeRender);
    });
    softwareRendererWarning?.dispose();
    softwareRendererWarning = null;
    lowFpsRecoveryMonitor?.reset();
    lowFpsRecoveryPopup?.remove();
    lowFpsRecoveryPopup = null;
    disposePortfolioMiniatureTableBuild();
    disposePrReaperInstallationBuild();
    clearPoiModelRoots();
    clearPoiVisualAnchors();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
    immersiveDisposed = true;
    immersiveLifecycle = 'disposed';
  }

  function disposeInitializedOrPartialImmersiveResources() {
    if (immersiveLifecycle === 'ready') {
      disposeImmersiveResources();
      return;
    }
    disposePartiallyInitializedImmersiveResources();
  }

  if (rendererInfo.isDangerousSoftwareRenderer) {
    softwareRendererWarning = createSoftwareRendererWarning({
      rendererInfo,
      safeUrl: createSoftwareSafeImmersiveUrl(),
      continuousUrl: createContinuousSoftwareImmersiveUrl(),
      textUrl: createTextModeUrl(),
      strings: softwareRendererWarningStrings,
      onContinueSafe: requestSoftwareSafeRender,
      onVisible: recordRendererWarning,
    });
  }
  const syncModeAnnouncerStrings = () => {
    const announcerStrings = getModeAnnouncerStrings(locale);
    getModeAnnouncer().setMessages(
      {
        immersiveReady: announcerStrings.immersiveReady,
        fallbackMessages: announcerStrings.fallbackReasons,
      },
      { reannounce: true }
    );
  };
  syncModeAnnouncerStrings();

  const searchParams = new URLSearchParams(window.location.search);
  const disablePerformanceFailover =
    shouldDisablePerformanceFailover(searchParams);
  let lastFailoverReason: string | null = null;

  const performanceFailover = createPerformanceFailoverHandler({
    renderer,
    container,
    immersiveUrl,
    markAppReady,
    fpsThreshold: PERFORMANCE_FAILOVER_FPS_THRESHOLD,
    minimumDurationMs: PERFORMANCE_FAILOVER_DURATION_MS,
    onTrigger: ({
      averageFps,
      durationMs,
      p95Fps,
      sampleCount,
      minFps,
      medianFps,
    }) => {
      const roundedDuration = Math.round(durationMs);
      const averaged = averageFps.toFixed(1);
      const percentile = p95Fps.toFixed(1);
      const floor = minFps.toFixed(1);
      const median = medianFps.toFixed(1);
      console.warn(
        `Switching to text fallback after ${roundedDuration}ms below ` +
          `${PERFORMANCE_FAILOVER_FPS_THRESHOLD} FPS (avg ${averaged} FPS, ` +
          `median ${median} FPS, p95 ${percentile} FPS, min ${floor} FPS across ` +
          `${sampleCount} samples).`
      );
    },
    onBeforeFallback: () => {
      disposeInitializedOrPartialImmersiveResources();
    },
    onFallback: (reason) => {
      disposeDebugPerformanceRegistration();
      lastFailoverReason = reason;
      inputLatencyTelemetry?.report(`failover-${reason}`);
    },
    disabled: disablePerformanceFailover,
    disableLowFps: true,
    consoleFailover: {
      budget: 0,
      onExceeded: ({ source, count }) => {
        const eventsLabel = count === 1 ? 'event' : 'events';
        console.warn(
          `Switching to text fallback after ${count} console ${eventsLabel} (${source}).`
        );
      },
    },
  });

  const handleFatalError = (error: unknown) => {
    crashBreadcrumbs.record({
      type: 'fatal-error',
      message: error instanceof Error ? error.message : String(error),
      renderer: rendererInfo,
      softwareRendererPolicy,
      snapshot: performanceDiagnostics?.methods.getSnapshot(),
    });
    disposeInitializedOrPartialImmersiveResources();
    onFatalError(error, { renderer });
  };

  const scene = new Scene();
  scene.background = createImmersiveGradientTexture();

  const poiOverrides: PoiInstanceOverrides = {};
  let poiDefinitions = getPoiDefinitions(locale);
  let poiDefinitionsById = new Map(
    poiDefinitions.map((definition) => [definition.id, definition] as const)
  );
  injectPoiStructuredData(poiDefinitions, {
    siteName: siteStrings.name,
    locale,
  });
  injectTextPortfolioStructuredData(poiDefinitions, {
    siteName: siteStrings.name,
    locale,
  });

  const floorBounds = getFloorBounds(FLOOR_PLAN);
  const floorCenter = new Vector3(
    (floorBounds.minX + floorBounds.maxX) / 2,
    0,
    (floorBounds.minZ + floorBounds.maxZ) / 2
  );

  const initialRoom = FLOOR_PLAN.rooms[0];
  const initialPlayerPosition = new Vector3(
    (initialRoom.bounds.minX + initialRoom.bounds.maxX) / 2,
    GROUND_FLOOR_TOP_ELEVATION,
    (initialRoom.bounds.minZ + initialRoom.bounds.maxZ) / 2
  );

  const halfWidth = (floorBounds.maxX - floorBounds.minX) / 2;
  const distanceToNorthEdge = floorBounds.maxZ - initialPlayerPosition.z;
  const distanceToSouthEdge = initialPlayerPosition.z - floorBounds.minZ;
  const largestHalfExtent = Math.max(
    halfWidth,
    distanceToNorthEdge,
    distanceToSouthEdge
  );
  const baseCameraSize = largestHalfExtent + CAMERA_MARGIN;
  let cameraZoom = 1;
  let cameraZoomTarget = 1;
  let initialCameraFraming: InitialCameraFramingDebug | null = null;
  let resetMotionBlurHistory: (() => void) | null = null;

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new OrthographicCamera(
    -baseCameraSize * aspect,
    baseCameraSize * aspect,
    baseCameraSize,
    -baseCameraSize,
    0.1,
    1000
  );
  const audioListener = new AudioListener();
  camera.add(audioListener);
  const cameraBaseOffset = new Vector3(
    baseCameraSize * 1.06,
    baseCameraSize * 1.08,
    baseCameraSize * 1.06
  );
  const cameraForwardPlanar = new Vector3();
  const cameraWorldUp = new Vector3();

  const cameraFocusOffsetY = PLAYER_RADIUS;
  const cameraCenter = initialPlayerPosition
    .clone()
    .add(new Vector3(0, cameraFocusOffsetY, 0));
  camera.position.copy(cameraCenter).add(cameraBaseOffset);
  camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);
  initialCameraFraming = resolveInitialAvatarCameraFraming({
    avatarHeight: PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
    baseCameraSize,
    cameraWorldUpY: cameraWorldUp
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion).y,
    minZoom: MIN_CAMERA_ZOOM,
    maxZoom: MAX_CAMERA_ZOOM,
  });
  cameraZoom = initialCameraFraming.zoom;
  cameraZoomTarget = initialCameraFraming.zoom;

  camera.getWorldDirection(cameraForwardPlanar);
  cameraForwardPlanar.y = 0;
  if (cameraForwardPlanar.lengthSq() <= 1e-6) {
    cameraForwardPlanar.set(0, 0, -1);
  } else {
    cameraForwardPlanar.normalize();
  }

  const ambientLight = new AmbientLight(0xf5f7ff, 0.38);
  const hemisphericLight = new HemisphereLight(0x324a6d, 0x131a17, 0.22);
  const directionalLight = new DirectionalLight(0xf1f0ff, 0.64);
  directionalLight.position.set(20, 30, 10);
  directionalLight.target.position.set(floorCenter.x, 0, floorCenter.z);
  scene.add(ambientLight);
  scene.add(hemisphericLight);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  const seasonalSchedule = resolveSeasonalLightingSchedule();
  const seasonalPreset = seasonalSchedule.active;

  const defaultEnvironmentTint = new Color('#ffe4c9');
  let environmentTint = defaultEnvironmentTint.clone();
  if (seasonalPreset?.tintHex) {
    try {
      environmentTint = new Color(seasonalPreset.tintHex);
    } catch {
      environmentTint = defaultEnvironmentTint.clone();
    }
  }
  const normalizedTintStrength = MathUtils.clamp(
    typeof seasonalPreset?.tintStrength === 'number'
      ? seasonalPreset.tintStrength
      : 0,
    0,
    1
  );
  const tintStrengthScale = MathUtils.clamp(
    1 + normalizedTintStrength * 0.4,
    0,
    1.4
  );
  const cycleScale =
    typeof seasonalPreset?.cycleScale === 'number' &&
    Number.isFinite(seasonalPreset.cycleScale) &&
    seasonalPreset.cycleScale > 0
      ? seasonalPreset.cycleScale
      : 1;
  environmentLightAnimator = createEnvironmentLightAnimator({
    ambient: ambientLight,
    hemisphere: hemisphericLight,
    directional: directionalLight,
    cycleSeconds: 48 * cycleScale,
    tintColor: environmentTint,
    tintStrengthScale,
  });
  environmentLightAnimator.captureBaseline();

  const groundEnvironmentGroup = new Group();
  groundEnvironmentGroup.name = 'GroundEnvironmentVisuals';
  scene.add(groundEnvironmentGroup);

  const groundStructureGroup = new Group();
  groundStructureGroup.name = 'GroundStructureVisuals';
  scene.add(groundStructureGroup);

  const upperStructureGroup = new Group();
  upperStructureGroup.name = 'UpperStructureVisuals';
  scene.add(upperStructureGroup);

  const backyardRoom = FLOOR_PLAN.rooms.find(
    (room) => room.id === BACKYARD_ROOM_ID
  );
  if (backyardRoom) {
    backyardEnvironment = createBackyardEnvironment(backyardRoom.bounds, {
      seasonalPreset,
      detailPolicy: activeSceneDetailPolicy,
    });
    groundEnvironmentGroup.add(backyardEnvironment.group);
    registerPoiVisualAnchor(
      'dspace-backyard-rocket',
      backyardEnvironment.modelRocketAnchor,
      'environment'
    );
    // Remove the enclosing sky dome to avoid a bright circular spheroid.
    // We want a dark void beyond the property in runtime.
    const skyDome =
      backyardEnvironment.group.getObjectByName('BackyardSkyDome');
    if (skyDome) {
      skyDome.visible = false;
    }
    backyardEnvironment.colliders.forEach((collider) => {
      if (isBackyardSourceCollider(collider)) {
        namedColliderDebugNames.set(collider, collider.name);
        colliderSourceMetadata.set(collider, {
          sourceId: collider.sourceId,
          sourceType: collider.sourceType,
          purpose: collider.purpose,
          role: collider.role,
          intent: collider.intent,
          debugId: collider.debugId,
        });
      }
      groundColliders.push(collider);
    });
  }

  const groundFloorGroup = new Group();
  groundFloorGroup.name = 'GroundFloorVisuals';
  scene.add(groundFloorGroup);

  const floorMaterial = new MeshStandardMaterial({
    color: 0x2a3547,
    roughness: 0.58,
    metalness: 0.18,
  });
  const floorTiles = generateFloorSurfaces(getLevelFloor('ground'), {
    material: floorMaterial,
    elevation: GROUND_FLOOR_TOP_ELEVATION,
    groupName: 'GroundFloorTiles',
  });
  groundFloorGroup.add(floorTiles.group);

  const wallMaterial = new MeshStandardMaterial({ color: 0x3d4a63 });
  const fenceMaterial = new MeshStandardMaterial({ color: 0x4a5668 });
  const doorwayTrimMaterial = new MeshStandardMaterial({
    color: new Color(0x556278),
    emissive: new Color(0x111b29),
    emissiveIntensity: 0.12,
    roughness: 0.46,
    metalness: 0.3,
  });

  const interiorLightmaps = createInteriorLightmapTextures({
    floorSize: {
      width: floorBounds.maxX - floorBounds.minX,
      depth: floorBounds.maxZ - floorBounds.minZ,
    },
  });
  floorMaterial.lightMap = interiorLightmaps.floor;
  floorMaterial.lightMapIntensity = 0.078;
  wallMaterial.lightMap = interiorLightmaps.wall;
  wallMaterial.lightMapIntensity = 0.68;
  fenceMaterial.lightMap = interiorLightmaps.wall;
  fenceMaterial.lightMapIntensity = 0.56;
  const groundWallInstances = generateWallSegmentInstances(
    getLevelFloor('ground'),
    {
      coordinateScale: FLOOR_PLAN_SCALE,
      baseElevation: GROUND_FLOOR_TOP_ELEVATION,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    }
  );
  const groundWallMeshes = createWallSegmentMeshes({
    instances: groundWallInstances,
    groupName: 'GroundWallSegments',
    getMaterial(instance) {
      return instance.isFence ? fenceMaterial : wallMaterial;
    },
  });
  groundFloorGroup.add(groundWallMeshes.group);
  groundWallInstances.forEach((instance) => {
    const debugIdentity = getWallColliderDebugIdentity('ground', instance);
    groundColliders.push(instance.collider);
    namedColliderDebugNames.set(instance.collider, debugIdentity.name);
    colliderSourceMetadata.set(instance.collider, {
      sourceId: instance.sourceId,
      sourceType: 'wall',
      debugId: debugIdentity.debugId,
    });
  });

  const doorwayOpenings = createDoorwayOpenings(FLOOR_PLAN, {
    wallHeight: WALL_HEIGHT,
    baseElevation: GROUND_FLOOR_TOP_ELEVATION,
    doorHeight: WALL_HEIGHT * 0.72,
    jambThickness: WALL_THICKNESS * 0.76,
    lintelThickness: 0.26,
    trimDepth: WALL_THICKNESS * 0.92,
    material: doorwayTrimMaterial,
  });
  groundFloorGroup.add(doorwayOpenings.group);

  const ceilings = createRoomCeilingPanels(FLOOR_PLAN.rooms, {
    height: WALL_HEIGHT - 0.15,
    inset: 1.1,
    thickness: 0.32,
    tintIntensity: 0.24,
    opacity: 0.08,
    lightMap: interiorLightmaps.ceiling,
    lightMapIntensity: 0.52,
  });
  groundFloorGroup.add(ceilings.group);

  const livingRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'livingRoom');
  if (livingRoom) {
    const mediaWall = createLivingRoomMediaWall(
      livingRoom.bounds,
      activeSceneDetailPolicy
    );
    groundFloorGroup.add(mediaWall.group);
    livingRoomMediaWall = mediaWall;
    mediaWallStarBridge.attach(mediaWall.controller);

    const tvBinding = mediaWall.poiBindings.futuroptimistTv;
    const tvHitArea = tvBinding.screen.clone();
    const tvHitMaterial = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    tvHitArea.material = tvHitMaterial;
    tvHitArea.visible = true;
    tvHitArea.renderOrder = tvBinding.glow.renderOrder + 1;
    mediaWall.group.add(tvHitArea);
    futuroptimistTvModelRoot = tvBinding.glow;
    registerPoiVisualAnchor(
      'futuroptimist-living-room-tv',
      tvBinding.anchor,
      'wall',
      { replace: true }
    );

    poiOverrides['futuroptimist-living-room-tv'] = {
      mode: 'display',
      hitArea: tvHitArea,
      highlight: {
        mesh: tvBinding.glow,
        material: tvBinding.glowMaterial,
        baseOpacity: tvBinding.glowMaterial.opacity,
        focusOpacity: 0.55,
      },
    };

    const livingRoomCenterX =
      (livingRoom.bounds.minX + livingRoom.bounds.maxX) / 2;
    const livingRoomCenterZ =
      (livingRoom.bounds.minZ + livingRoom.bounds.maxZ) / 2;
    const selfiePosition = {
      x: livingRoom.bounds.maxX - 3.2,
      y: 0,
      z: livingRoom.bounds.minZ + 9.2,
    };
    const selfieOrientation = Math.atan2(
      livingRoomCenterX - selfiePosition.x,
      livingRoomCenterZ - selfiePosition.z
    );
    const mirror = createSelfieMirror({
      position: selfiePosition,
      orientationRadians: selfieOrientation,
      width: 3.4,
      height: 4.1,
    });
    groundFloorGroup.add(mirror.group);
    namedColliderDebugNames.set(
      mirror.collider,
      'LivingRoomSelfieMirrorCollider'
    );
    colliderSourceMetadata.set(mirror.collider, {
      sourceId: SELFIE_MIRROR_COLLIDER_SOURCE_ID,
      sourceType: 'sceneObject',
      intent: 'physical-boundary',
      role: 'selfieMirror',
      purpose: getSceneObjectColliderSourcePurpose(
        SELFIE_MIRROR_SCENE_OBJECT_DEFINITION
      ),
      debugId: SELFIE_MIRROR_COLLIDER_DEBUG_ID,
    });
    // Keep 101A source-backed: this collider intentionally blocks the visible
    // SelfieMirror footprint. It is not redundant just because geometry/reachability
    // audits classify it as isolated or ambiguous.
    groundColliders.push(mirror.collider);
    selfieMirror = mirror;
  }

  const staircase = createStaircase(STAIRCASE_CONFIG);
  scene.add(staircase.group);
  const stairTotalRise = staircase.totalRise;
  const stairCenterX = STAIRCASE_CONFIG.basePosition.x;
  const stairHalfWidth = STAIRCASE_CONFIG.step.width / 2;
  const stairRun = STAIRCASE_CONFIG.step.run;
  const stairBottomZ = STAIRCASE_CONFIG.basePosition.z;
  const stairLandingDepth = STAIRCASE_CONFIG.landing.depth;
  const stairTransitionMargin = toWorldUnits(0.6);
  const stairLandingTriggerMargin = toWorldUnits(0.2);
  const stairwellMarginX = toWorldUnits(0.2);
  const stairwellMarginZ = toWorldUnits(0.4);
  const stairLayout = computeStairLayout({
    baseZ: stairBottomZ,
    stepRun: stairRun,
    stepCount: STAIRCASE_CONFIG.step.count,
    landingDepth: stairLandingDepth,
    direction: STAIRCASE_CONFIG.direction,
    guardMargin: stairTransitionMargin,
    stairwellMargin: stairwellMarginZ,
  });
  const stairTopZ = stairLayout.topZ;
  const stairLandingMinZ = stairLayout.landingMinZ;
  const stairLandingMaxZ = stairLayout.landingMaxZ;
  const upperFloorElevation = UPPER_FLOOR_TOP_ELEVATION;
  const stairGeometry: StairGeometry = {
    centerX: stairCenterX,
    halfWidth: stairHalfWidth,
    bottomZ: stairBottomZ,
    topZ: stairTopZ,
    landingMinZ: stairLandingMinZ,
    landingMaxZ: stairLandingMaxZ,
    totalRise: stairTotalRise,
    direction: stairLayout.directionMultiplier,
  };
  const stairBehavior: StairBehavior = {
    transitionMargin: stairTransitionMargin,
    landingTriggerMargin: stairLandingTriggerMargin,
    stepRise: STAIRCASE_CONFIG.step.rise,
    descentCorridorInset: PLAYER_RADIUS,
  };
  const stairNavigationZones = createStairNavigationZones(
    stairGeometry,
    stairBehavior
  );
  const groundStairNavZones = [
    stairNavigationZones.lowerStairEntrance,
    stairNavigationZones.stairRampBody,
  ];
  const upperStairNavZones = [stairNavigationZones.upperLanding];
  const stairGuardThickness = toWorldUnits(0.22);
  const stairGuardMinZ = stairLayout.guardRange.minZ;
  const stairGuardMaxZ = stairLayout.guardRange.maxZ;

  groundColliders.push({
    minX: stairCenterX - stairHalfWidth - stairGuardThickness,
    maxX: stairCenterX - stairHalfWidth,
    minZ: stairGuardMinZ,
    maxZ: stairGuardMaxZ,
  });
  groundColliders.push({
    minX: stairCenterX + stairHalfWidth,
    maxX: stairCenterX + stairHalfWidth + stairGuardThickness,
    minZ: stairGuardMinZ,
    maxZ: stairGuardMaxZ,
  });

  const registerSafetyCollider = (collider: LevelSafetyCollider) => {
    const targetColliders =
      collider.floor === 'ground' ? groundColliders : upperFloorColliders;
    targetColliders.push(collider.bounds);
    namedColliderDebugNames.set(collider.bounds, collider.name);
    colliderSourceMetadata.set(collider.bounds, {
      sourceId: collider.sourceId,
      sourceType: collider.sourceType,
      purpose: collider.purpose,
      intent: collider.intent,
      role: collider.role,
      debugId: collider.debugId,
    });
  };

  createGroundStairSafetyColliders(stairGeometry, stairBehavior, {
    playerRadius: PLAYER_RADIUS,
    guardThickness: stairGuardThickness,
  }).forEach(registerSafetyCollider);

  wallPaintings = createWallPaintings();
  groundStructureGroup.add(wallPaintings.groundGroup);
  upperStructureGroup.add(wallPaintings.upperGroup);

  const lowerFloorFurnishings = createLowerFloorFurnishings();
  groundStructureGroup.add(lowerFloorFurnishings.group);
  lowerFloorFurnishings.colliders.forEach((collider) => {
    groundColliders.push(collider);
    namedColliderDebugNames.set(collider, collider.debugName);
    colliderSourceMetadata.set(collider, {
      sourceId: assertLevelSourceId(collider.sourceId),
      sourceType: 'generatedCollider',
      purpose: 'lower-floor-furnishing',
      role: collider.category,
    });
  });

  const upperFloorFurnishings = createUpperFloorFurnishings({
    baseElevation: UPPER_FLOOR_TOP_ELEVATION,
  });
  upperStructureGroup.add(upperFloorFurnishings.group);
  upperFloorFurnishings.colliders.forEach((collider) => {
    upperFloorColliders.push(collider);
    namedColliderDebugNames.set(collider, collider.debugName);
    colliderSourceMetadata.set(collider, {
      sourceId: assertLevelSourceId(collider.sourceId),
      sourceType: 'generatedCollider',
      purpose: 'upper-floor-furnishing',
      role: collider.category,
    });
  });

  const upperFloorGroup = new Group();
  upperFloorGroup.visible = false;
  scene.add(upperFloorGroup);

  const upperFloorMaterial = new MeshStandardMaterial({
    color: 0x263149,
    roughness: 0.62,
    metalness: 0.12,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const doorwayPadding = PLAYER_RADIUS * 0.6;
  const doorwayDepth = WALL_THICKNESS + PLAYER_RADIUS * 2;

  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  const upperStairwellOpening = upperLandingRoom
    ? computeStairwellOpeningBounds({
        centerX: stairCenterX,
        halfWidth: stairHalfWidth,
        marginX: stairwellMarginX,
        roomBounds: upperLandingRoom.bounds,
        layout: stairLayout,
      })
    : undefined;
  const registerUpperFloorGeneratedCollider = (
    collider: UpperStairwellLandingCollider
  ) => {
    upperFloorColliders.push(collider.bounds);
    namedColliderDebugNames.set(collider.bounds, collider.name);
    colliderSourceMetadata.set(collider.bounds, {
      sourceId: collider.sourceId,
      sourceType: collider.sourceType,
      purpose: collider.purpose,
      intent: collider.intent,
      role: collider.role,
      debugId: collider.debugId,
    });
  };

  const upperStairWestEgressLaneX =
    stairCenterX - stairHalfWidth + PLAYER_RADIUS * 0.75;
  const upperStairWestEgressBlockerMinX =
    upperStairWestEgressLaneX + PLAYER_RADIUS + 0.01;

  // The upper-floor stairwell cutout intentionally comes from the same
  // computeStairLayout result used by movement. It removes both the stair
  // landing void and the hidden ramp run below the landing lip.
  if (upperLandingRoom && upperStairwellOpening) {
    createUpperStairSafetyColliders({
      stairCenterX,
      stairHalfWidth,
      playerRadius: PLAYER_RADIUS,
      wallThickness: WALL_THICKNESS,
      doorwayDepth,
      stairwellMarginX,
      stairTopZ,
      stairLandingTriggerMargin,
      stairLayoutDirectionMultiplier: stairLayout.directionMultiplier,
      upperLandingRoomBounds: upperLandingRoom.bounds,
      upperStairwellOpening,
      stairNavigationZones,
      upperStairBannisterThickness: STAIRCASE_CONFIG.landing.guard.thickness,
    }).forEach(registerSafetyCollider);
  }

  const staircaseLandingFootprint = {
    minX: stairCenterX - stairHalfWidth,
    maxX: stairCenterX + stairHalfWidth,
    minZ: stairLandingMinZ,
    maxZ: stairLandingMaxZ,
  };
  const finalStairStepFootprint = {
    minX: stairCenterX - stairHalfWidth,
    maxX: stairCenterX + stairHalfWidth,
    minZ: Math.min(
      stairTopZ,
      stairTopZ - stairLayout.directionMultiplier * stairRun
    ),
    maxZ: Math.max(
      stairTopZ,
      stairTopZ - stairLayout.directionMultiplier * stairRun
    ),
  };
  const stairRunApproachFootprint =
    upperLandingRoom && upperStairwellOpening
      ? createUpperLandingStairRunApproachFootprint({
          stairCenterX,
          stairHalfWidth,
          stairwellOpening: upperStairwellOpening,
          upperLandingRoomBounds: upperLandingRoom.bounds,
        })
      : undefined;
  const upperLandingCutouts =
    upperLandingRoom && upperStairwellOpening && stairRunApproachFootprint
      ? {
          upperLanding: createUpperLandingFloorCutouts({
            staircaseLandingFootprint,
            finalStairStepFootprint,
            stairRunApproachFootprint,
            stairwellOpening: upperStairwellOpening,
            hiddenRunVoidMinX: upperStairWestEgressBlockerMinX,
          }),
        }
      : undefined;
  const upperFloorSurfaceCutouts =
    upperLandingCutouts &&
    upperLandingRoom &&
    upperStairwellOpening &&
    stairRunApproachFootprint
      ? {
          [UPPER_LANDING_FLOOR_MAIN_ID]: [
            ...upperLandingCutouts.upperLanding,
            {
              minX: stairRunApproachFootprint.minX,
              maxX: stairRunApproachFootprint.maxX,
              minZ: upperLandingRoom.bounds.minZ,
              maxZ: upperStairwellOpening.minZ,
            },
          ],
        }
      : undefined;
  const upperFloorTiles = generateFloorSurfaces(getLevelFloor('upper'), {
    material: upperFloorMaterial,
    elevation: upperFloorElevation,
    thickness: STAIRCASE_CONFIG.landing.thickness,
    groupName: 'UpperFloorTiles',
    cutoutsBySurfaceId: upperFloorSurfaceCutouts,
  });
  upperFloorGroup.add(upperFloorTiles.group);

  if (upperLandingRoom && upperStairwellOpening) {
    const upperStairwellGuardOpening = {
      minX: stairNavigationZones.explicitDescentCorridor.minX + PLAYER_RADIUS,
      maxX: upperStairwellOpening.maxX,
      minZ: upperStairwellOpening.minZ,
      maxZ: Math.min(upperLandingRoom.bounds.maxZ, stairLandingMaxZ),
    };
    const upperStairwellLanding = createUpperStairwellLanding({
      roomBounds: upperLandingRoom.bounds,
      openingBounds: upperStairwellGuardOpening,
      descentCorridorBounds: {
        ...stairNavigationZones.explicitDescentCorridor,
        maxX: stairNavigationZones.explicitDescentCorridor.maxX + PLAYER_RADIUS,
      },
      elevation: upperFloorElevation,
      guard: {
        height: 0.56,
        thickness: toWorldUnits(0.12),
        material: {
          color: 0x2a3241,
          roughness: 0.72,
          metalness: 0.05,
        },
      },
      segments: UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
    });
    upperFloorGroup.add(upperStairwellLanding.group);
    upperStairwellLanding.colliders.forEach(
      registerUpperFloorGeneratedCollider
    );
  }

  const upperWallMaterial = new MeshStandardMaterial({ color: 0x46536a });
  const upperWallInstances = generateWallSegmentInstances(
    getLevelFloor('upper'),
    {
      coordinateScale: FLOOR_PLAN_SCALE,
      baseElevation: upperFloorElevation,
      wallHeight: WALL_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: FENCE_HEIGHT,
      fenceThickness: FENCE_THICKNESS,
      getRoomCategory,
    }
  );

  const upperWallMeshes = createWallSegmentMeshes({
    instances: upperWallInstances,
    groupName: 'UpperWallSegments',
    getMaterial() {
      return upperWallMaterial;
    },
  });
  upperFloorGroup.add(upperWallMeshes.group);
  upperWallInstances.forEach((instance) => {
    const debugIdentity = getWallColliderDebugIdentity('upper', instance);
    upperFloorColliders.push(instance.collider);
    namedColliderDebugNames.set(instance.collider, debugIdentity.name);
    colliderSourceMetadata.set(instance.collider, {
      sourceId: instance.sourceId,
      sourceType: 'wall',
      debugId: debugIdentity.debugId,
    });
  });

  const floorColliders: Record<FloorId, RectCollider[]> = {
    ground: groundColliders,
    upper: upperFloorColliders,
  };

  const navMeshes: Record<FloorId, NavMesh> = {
    ground: createNavMesh(FLOOR_PLAN, {
      padding: doorwayPadding,
      depth: doorwayDepth,
      extraZones: groundStairNavZones,
    }),
    upper: createNavMesh(UPPER_FLOOR_PLAN, {
      padding: doorwayPadding,
      depth: doorwayDepth,
      extraZones: upperStairNavZones,
    }),
  };

  const seasonalPrograms = Array.from(
    createSeasonallyAdjustedPrograms(ROOM_LED_PULSE_PROGRAMS, seasonalPreset)
  );

  if (LIGHTING_OPTIONS.enableLedStrips) {
    const ledBuild = createRoomLedStrips({
      plan: FLOOR_PLAN,
      getRoomCategory,
      ledHeight: WALL_HEIGHT - CEILING_COVE_OFFSET,
      baseColor: 0x101623,
      emissiveIntensity: LIGHTING_OPTIONS.ledEmissiveIntensity,
      fillLightIntensity: LIGHTING_OPTIONS.ledLightIntensity,
      wallThickness: WALL_THICKNESS,
    });

    ledStripGroup = ledBuild.group;
    ledFillLightGroup = ledBuild.fillLightGroup;
    ledStripMaterials.push(...ledBuild.materials);
    ledFillLightsList.push(...ledBuild.fillLights);

    applySeasonalLightingPreset({
      preset: seasonalPreset,
      nextPreset: seasonalSchedule.next,
      nextPresetStart: seasonalSchedule.nextStartDate,
      targets: ledBuild.seasonalTargets,
      documentElement: document.documentElement,
    });

    const ledTargets = Array.from(ledBuild.materialsByRoom.entries()).map(
      ([roomId, material]) => ({
        roomId,
        material,
        fillLight: ledBuild.fillLightsByRoom.get(roomId),
      })
    );

    ledAnimator = createLedAnimator({
      programs: seasonalPrograms,
      targets: ledTargets,
    });
    ledAnimator.captureBaseline();

    scene.add(ledBuild.group);
    scene.add(ledBuild.fillLightGroup);
  } else {
    applySeasonalLightingPreset({
      preset: seasonalPreset,
      nextPreset: seasonalSchedule.next,
      nextPresetStart: seasonalSchedule.nextStartDate,
      targets: [],
      documentElement: document.documentElement,
    });
  }

  lightmapAnimator = createLightmapBounceAnimator({
    floorMaterial,
    wallMaterial,
    fenceMaterial,
    ceilingPanels: ceilings.panels,
    programs: seasonalPrograms,
  });
  lightmapAnimator.captureBaseline();

  let activeFloorId: FloorId = 'ground';

  const groundPoiGroup = new Group();
  groundPoiGroup.name = 'GroundPoiVisuals';
  scene.add(groundPoiGroup);

  const upperPoiGroup = new Group();
  upperPoiGroup.name = 'UpperPoiVisuals';
  scene.add(upperPoiGroup);

  const getPoiFloorId = createPoiFloorResolver(FLOOR_PLAN_LEVELS);
  const builtPoiInstances = createPoiInstances(poiDefinitions, poiOverrides, {
    detailPolicy: activeSceneDetailPolicy,
  });
  builtPoiInstances.forEach((poi) => {
    if (!poi.group.parent) {
      const poiGroup =
        getPoiFloorId(poi.definition) === 'upper'
          ? upperPoiGroup
          : groundPoiGroup;
      poiGroup.add(poi.group);
    }
    // POI interaction markers stay clickable, but walking blockers are registered
    // from each rendered POI model/structure below so labels, halos, and generous
    // interaction radii never consume floor space.
    poiInstances.push(poi);
  });

  const floorVisibilityController: FloorVisibilityController =
    createFloorVisibilityController({
      initialFloorId: activeFloorId,
      groundGroups: [
        groundFloorGroup,
        groundPoiGroup,
        groundEnvironmentGroup,
        groundStructureGroup,
      ],
      upperGroups: [upperFloorGroup, upperPoiGroup, upperStructureGroup],
      groundLedGroups: [ledStripGroup, ledFillLightGroup].filter(
        (group): group is Group => group !== null
      ),
      poiInstances,
      getPoiFloorId,
    });

  const poiAnalytics = createWindowPoiAnalytics();
  const interactionTimeline = new InteractionTimeline();
  let currentHoveredPoi: PoiDefinition | null = null;
  let currentSelectedPoi: PoiDefinition | null = null;
  let poiInteractionManager: PoiInteractionManager | null = null;
  const isMobilePoiLayout = (layoutOverride?: HudLayout): boolean =>
    (layoutOverride ?? hudLayoutManager?.getLayout()) === 'mobile';
  const poiTooltipOverlay = new PoiTooltipOverlay({
    container,
    locale,
    getDebugDetails: (definition) => ({
      anchor: definition.position,
      modelTriangles: getPoiModelTriangleCount(definition.id) ?? 0,
    }),
    interactionTimeline,
    discoveryAnnouncer: {
      format: (poi, strings) =>
        formatMessage(strings.discoveryAnnouncementTemplate, {
          title: poi.title,
          summary: poi.summary ?? '',
        }),
    },
    onDismiss: () => {
      dismissActivePoiDetail();
    },
  });
  poiTooltipOverlay.setStrings(poiOverlayStrings, locale);
  const poiWorldTooltip = new PoiWorldTooltip({
    parent: scene,
    camera,
  });
  const isBlockingPoiDetailPanel = (): boolean =>
    (hudPanelCoordinator?.getActivePanel() ?? null) === 'settings';
  const isControlsPanelOpen = (): boolean =>
    (hudPanelCoordinator?.getActivePanel() ?? null) === 'controls';
  const hasMobileKeyboardPoiTarget = (): boolean =>
    isControlsPanelOpen() && currentHoveredPoi !== null;
  const canShowPoiDetailOverlay = (layoutOverride?: HudLayout): boolean =>
    !isBlockingPoiDetailPanel() &&
    (!isMobilePoiLayout(layoutOverride) ||
      currentSelectedPoi !== null ||
      hasMobileKeyboardPoiTarget());
  const syncCombinedPoiPanelState = (poiDetailVisible: boolean) => {
    const root = document.documentElement;
    const activePanel = hudPanelCoordinator?.getActivePanel() ?? null;
    const controlsOpen = activePanel === 'controls';
    const tutorialOpen = activePanel === 'tutorial';
    root.toggleAttribute('data-hud-controls-open', controlsOpen);
    root.toggleAttribute('data-hud-tutorial-open', tutorialOpen);
    if (activePanel) {
      root.dataset.activeHudPanel = activePanel;
    } else {
      delete root.dataset.activeHudPanel;
    }
    root.toggleAttribute('data-poi-detail-visible', poiDetailVisible);
  };
  const isPoiVisibleOnActiveFloor = (poi: PoiDefinition | null): boolean =>
    poi !== null && floorVisibilityController.isPoiVisibleOnActiveFloor(poi);
  const getFloorVisiblePoi = (
    poi: PoiDefinition | null
  ): PoiDefinition | null => (isPoiVisibleOnActiveFloor(poi) ? poi : null);
  const syncPoiDetailOverlay = (layoutOverride?: HudLayout) => {
    const canShowDetail = canShowPoiDetailOverlay(layoutOverride);
    const showHover =
      canShowDetail && !isMobilePoiLayout(layoutOverride)
        ? getFloorVisiblePoi(currentHoveredPoi)
        : null;
    const mobileKeyboardTarget = isMobilePoiLayout(layoutOverride)
      ? (currentHoveredPoi ?? currentSelectedPoi)
      : currentSelectedPoi;
    const showSelected = canShowDetail
      ? getFloorVisiblePoi(mobileKeyboardTarget)
      : null;
    poiTooltipOverlay.setHovered(showHover);
    poiTooltipOverlay.setSelected(showSelected);
    poiWorldTooltip.setHovered(resolveWorldTooltipTarget(showHover));
    poiWorldTooltip.setSelected(resolveWorldTooltipTarget(showSelected));
    syncCombinedPoiPanelState(showHover !== null || showSelected !== null);
  };
  const clearPoiDetailState = (
    inputMethod: 'keyboard' | 'pointer' | 'touch' = 'pointer'
  ) => {
    currentHoveredPoi = null;
    currentSelectedPoi = null;
    poiInteractionManager?.clearHover(inputMethod);
    poiInteractionManager?.clearSelection(inputMethod);
    syncPoiDetailOverlay();
  };
  const dismissActivePoiDetail = (
    inputMethod: 'keyboard' | 'pointer' | 'touch' = 'pointer'
  ) => {
    clearPoiDetailState(inputMethod);
    hudPanelCoordinator?.closeAllPanels();
  };

  const githubRepoStatsService = createGitHubRepoStatsService();
  setPortfolioSection('githubMetrics', {
    getDiagnostics: () => githubRepoStatsService.getDiagnostics(),
  });
  setPortfolioSection('audio', {
    getState: getAudioDebugState,
  });
  const wirePoiGitHubMetrics = () => {
    githubRepoMetrics?.dispose();
    githubRepoMetrics = wireGitHubRepoMetrics({
      definitions: poiDefinitions,
      service: githubRepoStatsService,
      onMetricsUpdated: (poiId) => {
        poiTooltipOverlay.notifyPoiUpdated(poiId);
        poiWorldTooltip.notifyPoiUpdated(poiId);
      },
      onRepoStatsUpdated: ({ poiId, stats }) => {
        if (poiId === 'futuroptimist-living-room-tv') {
          mediaWallStarBridge.updateStarCount(stats?.stars ?? null);
        }
      },
    });
    githubRepoMetrics.refreshAll().catch(() => {
      /* GitHub may be unreachable; metrics will remain on fallback values. */
    });
  };
  wirePoiGitHubMetrics();
  const poiVisitedState = new PoiVisitedState();

  const resolveWorldTooltipTarget = (
    poi: PoiDefinition | null
  ): PoiWorldTooltipTarget | null => {
    if (!poi) {
      return null;
    }
    const instance = poiInstances.find(
      (candidate) => candidate.definition.id === poi.id
    );
    if (!instance) {
      return null;
    }
    return {
      poi,
      floorId: getPoiFloorId(poi),
      getAnchorPosition: (out: Vector3) => {
        if (instance.label) {
          return out.copy(instance.labelWorldPosition);
        }
        instance.group.getWorldPosition(out);
        return out;
      },
    };
  };

  const ensurePoiApi = () => {
    setPortfolioSection('poi', {
      getTooltipState() {
        const overlayState = poiTooltipOverlay.getState();
        const worldState = poiWorldTooltip.getState();
        const visibleMarkerLabels = poiInstances.filter(
          (poi) =>
            poi.label?.visible &&
            poi.labelMaterial &&
            poi.labelMaterial.opacity > 0.05
        );
        const visibleMarkerLabelPoiIds = visibleMarkerLabels.map(
          (poi) => poi.definition.id
        );
        const worldTooltipTitle =
          poiDefinitions.find(
            (definition) => definition.id === worldState.poiId
          )?.title ?? null;
        const activePoiId = worldState.visible
          ? worldState.poiId
          : overlayState.visible
            ? overlayState.poiId
            : null;
        const activePoiMarkerLabel = activePoiId
          ? visibleMarkerLabels.find((poi) => poi.definition.id === activePoiId)
          : null;
        const activeWorldTooltipVisible =
          Boolean(activePoiId) &&
          worldState.visible &&
          worldState.poiId === activePoiId;
        const activeMarkerLabelVisible = Boolean(activePoiMarkerLabel);
        const totalInWorldTooltipCount =
          (worldState.visible ? 1 : 0) + visibleMarkerLabels.length;
        return {
          overlayVisiblePoiId: overlayState.visible ? overlayState.poiId : null,
          worldTooltipVisible: worldState.visible,
          worldTooltipPoiId: worldState.visible ? worldState.poiId : null,
          worldTooltipTitle,
          markerLabelVisible: activeMarkerLabelVisible,
          markerLabelPoiId: activePoiMarkerLabel?.definition.id ?? null,
          visibleMarkerLabelCount: visibleMarkerLabels.length,
          visibleMarkerLabelPoiIds,
          activePoiMarkerLabelVisible: activeMarkerLabelVisible,
          activeInWorldTooltipCount:
            (activeWorldTooltipVisible ? 1 : 0) +
            (activeMarkerLabelVisible ? 1 : 0),
          totalInWorldTooltipCount,
        };
      },
    });
  };
  ensurePoiApi();

  const handleVisitedUpdate = (visited: ReadonlySet<string>) => {
    for (const poi of poiInstances) {
      const isVisited = visited.has(poi.definition.id);
      if (poi.visited !== isVisited) {
        poi.visited = isVisited;
      }
    }
    poiTooltipOverlay.setVisitedPoiIds(visited);
  };

  const removeVisitedSubscription =
    poiVisitedState.subscribe(handleVisitedUpdate);

  const futuroptimistPoi = poiInstances.find(
    (poi) => poi.definition.id === 'futuroptimist-living-room-tv'
  );
  const flywheelPoi = poiInstances.find(
    (poi) => poi.definition.id === 'flywheel-studio-flywheel'
  );
  if (futuroptimistPoi && futuroptimistTvModelRoot) {
    registerPoiModelRoot(
      futuroptimistPoi.definition.id,
      futuroptimistTvModelRoot
    );
  }

  const jobbotPoi = poiInstances.find(
    (poi) => poi.definition.id === 'jobbot-studio-terminal'
  );
  const f2ClipboardPoi = poiInstances.find(
    (poi) => poi.definition.id === 'f2clipboard-kitchen-console'
  );
  const sigmaPoi = poiInstances.find(
    (poi) => poi.definition.id === 'sigma-kitchen-workbench'
  );
  const wovePoi = poiInstances.find(
    (poi) => poi.definition.id === 'wove-kitchen-loom'
  );
  const axelPoi = poiInstances.find(
    (poi) => poi.definition.id === 'axel-studio-tracker'
  );
  const tokenPlacePoi = poiInstances.find(
    (poi) => poi.definition.id === 'tokenplace-studio-cluster'
  );
  const sugarkubePoi = poiInstances.find(
    (poi) => poi.definition.id === 'sugarkube-backyard-greenhouse'
  );
  const portfolioTablePoi = poiInstances.find(
    (poi) => poi.definition.id === 'danielsmith-portfolio-table'
  );
  const gabrielPoi = poiInstances.find(
    (poi) => poi.definition.id === 'gabriel-studio-sentry'
  );
  const gitshelvesPoi = poiInstances.find(
    (poi) => poi.definition.id === 'gitshelves-living-room-installation'
  );
  const prReaperPoi = poiInstances.find(
    (poi) => poi.definition.id === 'pr-reaper-backyard-console'
  );
  const studioRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'studio');
  const poiStructureColliderIds = new Set<PoiId>();
  const addPoiStructure = (poi: PoiInstance, group: Object3D) => {
    (getPoiFloorId(poi.definition) === 'upper'
      ? upperStructureGroup
      : groundStructureGroup
    ).add(group);
    poiStructureColliderIds.add(poi.definition.id);
    registerPoiModelRoot(poi.definition.id, group);
    registerPoiVisualAnchor(poi.definition.id, group, 'floor');
  };
  const getPoiColliderTarget = (poi: PoiInstance) =>
    getPoiFloorId(poi.definition) === 'upper'
      ? upperFloorColliders
      : groundColliders;
  const registerMarkerOnlyPoiColliders = () => {
    poiInstances.forEach((poi) => {
      if (
        poi.visualMode !== 'pedestal' ||
        !poi.collider ||
        poiStructureColliderIds.has(poi.definition.id)
      ) {
        return;
      }

      // Marker-only POIs have no rendered structure collider to register below,
      // so keep their pedestal footprint blocked while avoiding label/orb blockers
      // for POIs that do provide tighter model-derived colliders.
      getPoiColliderTarget(poi).push(poi.collider);
    });
  };

  const resolveFlywheelEnergyTargets = (): {
    targets: FlywheelEnergyTarget[];
    diagnostics: string[];
  } => {
    const targets: FlywheelEnergyTarget[] = [];
    const diagnostics: string[] = [];
    for (const poi of poiInstances) {
      const poiId = poi.definition.id;
      if (poiId === 'flywheel-studio-flywheel') continue;
      const floorId = getPoiFloorId(poi.definition);
      if (floorId !== 'ground') continue;
      const anchor = resolvePoiVisualAnchor(poiId);
      const source = anchor?.object ?? poi.group;
      if (!anchor) {
        diagnostics.push(`missing-visual-anchor:${poiId}`);
      }
      try {
        source.updateMatrixWorld(true);
        const worldPosition = source.getWorldPosition(new Vector3());
        targets.push({
          poiId,
          label: poi.definition.title ?? poiId,
          floorId,
          worldPosition: {
            x: worldPosition.x,
            y: worldPosition.y,
            z: worldPosition.z,
          },
        });
      } catch (error) {
        diagnostics.push(
          `target-resolution-failed:${poiId}:${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    return { targets, diagnostics };
  };

  if (studioRoom) {
    const showpiece = createFlywheelShowpiece({
      position: {
        x:
          flywheelPoi?.group.position.x ??
          (studioRoom.bounds.minX + studioRoom.bounds.maxX) / 2,
        y: flywheelPoi?.group.position.y ?? 0,
        z:
          flywheelPoi?.group.position.z ??
          (studioRoom.bounds.minZ + studioRoom.bounds.maxZ) / 2,
      },
      roomBounds: studioRoom.bounds,
      orientationRadians: flywheelPoi?.group.rotation.y ?? 0,
      detailPolicy: activeSceneDetailPolicy,
    });
    const flywheelSceneObject = getSceneObjectDefinition(
      'flywheel-studio-flywheel'
    );
    if (flywheelSceneObject) {
      applySceneObjectSourceMetadata(showpiece.group, flywheelSceneObject);
      registerSceneObjectColliders(
        showpiece.colliders,
        flywheelSceneObject,
        groundColliders,
        colliderSourceMetadata
      );
    } else {
      showpiece.colliders.forEach((collider) => groundColliders.push(collider));
    }
    if (flywheelPoi) {
      addPoiStructure(flywheelPoi, showpiece.group);
    } else {
      groundStructureGroup.add(showpiece.group);
    }
    flywheelShowpiece = showpiece;

    const terminalOrientation = jobbotPoi?.group.rotation.y ?? -Math.PI / 2;
    const terminal = createJobbotTerminal({
      position: {
        x: jobbotPoi?.group.position.x ?? 11.4,
        y: jobbotPoi?.group.position.y ?? 0,
        z: jobbotPoi?.group.position.z ?? -0.6,
      },
      orientationRadians: terminalOrientation,
      detailPolicy: activeSceneDetailPolicy,
    });
    const jobbotSceneObject = getSceneObjectDefinition(
      'jobbot-studio-terminal'
    );
    const fallbackJobbotStructureGroup =
      jobbotSceneObject?.floorId === 'upper'
        ? upperStructureGroup
        : groundStructureGroup;
    const jobbotColliderTarget = jobbotPoi
      ? getPoiColliderTarget(jobbotPoi)
      : jobbotSceneObject?.floorId === 'upper'
        ? upperFloorColliders
        : groundColliders;
    if (jobbotSceneObject) {
      applySceneObjectSourceMetadata(terminal.group, jobbotSceneObject);
      registerSceneObjectColliders(
        terminal.colliders,
        jobbotSceneObject,
        jobbotColliderTarget,
        colliderSourceMetadata
      );
    } else {
      terminal.colliders.forEach((collider) =>
        jobbotColliderTarget.push(collider)
      );
    }
    if (jobbotPoi) {
      addPoiStructure(jobbotPoi, terminal.group);
    } else {
      fallbackJobbotStructureGroup.add(terminal.group);
    }
    jobbotTerminal = terminal;

    if (axelPoi) {
      const navigator = createAxelNavigator({
        position: {
          x: axelPoi.group.position.x,
          y: axelPoi.group.position.y,
          z: axelPoi.group.position.z,
        },
        orientationRadians: axelPoi.group.rotation.y ?? 0,
      });
      const axelSceneObject = getSceneObjectDefinition('axel-studio-tracker');
      if (axelSceneObject) {
        applySceneObjectSourceMetadata(navigator.group, axelSceneObject);
        registerSceneObjectColliders(
          navigator.colliders,
          axelSceneObject,
          getPoiColliderTarget(axelPoi),
          colliderSourceMetadata
        );
      } else {
        navigator.colliders.forEach((collider) =>
          getPoiColliderTarget(axelPoi).push(collider)
        );
      }
      addPoiStructure(axelPoi, navigator.group);
      axelNavigator = navigator;
    }

    if (tokenPlacePoi) {
      const workstation = createTokenPlaceWorkstation({
        position: {
          x: tokenPlacePoi.group.position.x,
          y: tokenPlacePoi.group.position.y,
          z: tokenPlacePoi.group.position.z,
        },
        orientationRadians: tokenPlacePoi.group.rotation.y ?? 0,
        detailPolicy: activeSceneDetailPolicy,
      });
      addPoiStructure(tokenPlacePoi, workstation.group);
      workstation.colliders.forEach((collider) =>
        getPoiColliderTarget(tokenPlacePoi).push(collider)
      );
      tokenPlaceWorkstation = workstation;
    }

    if (gabrielPoi) {
      const sentry = createGabrielSentry({
        position: {
          x: gabrielPoi.group.position.x,
          y: gabrielPoi.group.position.y,
          z: gabrielPoi.group.position.z,
        },
        orientationRadians: gabrielPoi.group.rotation.y ?? 0,
      });
      addPoiStructure(gabrielPoi, sentry.group);
      sentry.colliders.forEach((collider) =>
        getPoiColliderTarget(gabrielPoi).push(collider)
      );
      gabrielSentry = sentry;
    }
  }

  if (sugarkubePoi) {
    const livingRoom = FLOOR_PLAN.rooms.find(
      (room) => room.id === 'livingRoom'
    );
    const wallEndpoint = (() => {
      if (!livingRoom) {
        return {
          x: sugarkubePoi.group.position.x,
          y: sugarkubePoi.group.position.y + 0.48,
          z: sugarkubePoi.group.position.z - 5,
          orientationRadians: 0,
        };
      }
      const cornerClearance = 1.2;
      return {
        x: MathUtils.clamp(
          sugarkubePoi.group.position.x,
          livingRoom.bounds.minX + cornerClearance,
          livingRoom.bounds.maxX - cornerClearance
        ),
        y: sugarkubePoi.group.position.y + 0.48,
        z: livingRoom.bounds.minZ + WALL_THICKNESS / 2 + 0.03,
        orientationRadians: 0,
      };
    })();
    const deployment = createSugarkubeDeployment({
      position: {
        x: sugarkubePoi.group.position.x,
        y: sugarkubePoi.group.position.y,
        z: sugarkubePoi.group.position.z,
      },
      orientationRadians: sugarkubePoi.group.rotation.y ?? 0,
      detailPolicy: activeSceneDetailPolicy,
      wallNetworkEndpoint: wallEndpoint,
    });
    addPoiStructure(sugarkubePoi, deployment.group);
    const triangleCount = getPoiModelTriangleCount(sugarkubePoi.definition.id);
    if (triangleCount !== null) {
      const formattedTriangles = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
      }).format(triangleCount);
      const modelMetric = sugarkubePoi.definition.metrics?.find(
        (metric) => metric.label === 'Model'
      );
      if (modelMetric) {
        modelMetric.value = `${formattedTriangles} triangles`;
      } else {
        sugarkubePoi.definition.metrics = [
          ...(sugarkubePoi.definition.metrics ?? []),
          { label: 'Model', value: `${formattedTriangles} triangles` },
        ];
      }
    }
    deployment.colliders.forEach((collider) =>
      getPoiColliderTarget(sugarkubePoi).push(collider)
    );
    sugarkubeDeployment = deployment;
  }

  if (prReaperPoi) {
    disposePrReaperInstallationBuild();
    const installation = createPrReaperInstallation({
      position: {
        x: prReaperPoi.group.position.x,
        y: prReaperPoi.group.position.y,
        z: prReaperPoi.group.position.z,
      },
      orientationRadians: prReaperPoi.group.rotation.y ?? 0,
      detailPolicy: activeSceneDetailPolicy,
    });
    const prReaperSceneObject = getSceneObjectDefinition(
      'pr-reaper-backyard-console'
    );
    if (prReaperSceneObject) {
      applySceneObjectSourceMetadata(installation.group, prReaperSceneObject);
      registerSceneObjectColliders(
        installation.colliders,
        prReaperSceneObject,
        getPoiColliderTarget(prReaperPoi),
        colliderSourceMetadata
      );
    } else {
      installation.colliders.forEach((collider) =>
        getPoiColliderTarget(prReaperPoi).push(collider)
      );
    }
    addPoiStructure(prReaperPoi, installation.group);
    prReaperInstallation = installation;
  }

  if (gitshelvesPoi) {
    const installation = createGitshelvesInstallation({
      position: {
        x: gitshelvesPoi.group.position.x,
        y: gitshelvesPoi.group.position.y,
        z: gitshelvesPoi.group.position.z,
      },
      orientationRadians: gitshelvesPoi.group.rotation.y ?? 0,
    });
    addPoiStructure(gitshelvesPoi, installation.group);
    installation.colliders.forEach((collider) =>
      getPoiColliderTarget(gitshelvesPoi).push(collider)
    );
    gitshelvesInstallation = installation;
  }

  if (f2ClipboardPoi) {
    const console = createF2ClipboardConsole({
      position: {
        x: f2ClipboardPoi.group.position.x,
        y: f2ClipboardPoi.group.position.y,
        z: f2ClipboardPoi.group.position.z,
      },
      orientationRadians: f2ClipboardPoi.group.rotation.y ?? 0,
    });
    addPoiStructure(f2ClipboardPoi, console.group);
    console.colliders.forEach((collider) =>
      getPoiColliderTarget(f2ClipboardPoi).push(collider)
    );
    f2ClipboardConsole = console;
  }

  if (sigmaPoi) {
    const workbench = createSigmaWorkbench({
      position: {
        x: sigmaPoi.group.position.x,
        y: sigmaPoi.group.position.y,
        z: sigmaPoi.group.position.z,
      },
      orientationRadians: sigmaPoi.group.rotation.y ?? 0,
    });
    addPoiStructure(sigmaPoi, workbench.group);
    workbench.colliders.forEach((collider) =>
      getPoiColliderTarget(sigmaPoi).push(collider)
    );
    sigmaWorkbench = workbench;
  }

  if (wovePoi) {
    const loom = createWoveLoom({
      position: {
        x: wovePoi.group.position.x,
        y: wovePoi.group.position.y,
        z: wovePoi.group.position.z,
      },
      orientationRadians: wovePoi.group.rotation.y ?? 0,
    });
    const woveSceneObject = getSceneObjectDefinition('wove-kitchen-loom');
    if (woveSceneObject) {
      applySceneObjectSourceMetadata(loom.group, woveSceneObject);
      registerSceneObjectColliders(
        loom.colliders,
        woveSceneObject,
        getPoiColliderTarget(wovePoi),
        colliderSourceMetadata
      );
    } else {
      loom.colliders.forEach((collider) =>
        getPoiColliderTarget(wovePoi).push(collider)
      );
    }
    addPoiStructure(wovePoi, loom.group);
    woveLoom = loom;
  }

  registerMarkerOnlyPoiColliders();

  // Keep tabletop construction after all POI visual-anchor producers so
  // ground-floor miniature placement can resolve every rendered anchor.
  if (portfolioTablePoi) {
    const metadata = getPoiPhysicalMetadata('danielsmith-portfolio-table');
    if (!metadata) {
      throw new Error(
        'Missing physical metadata for danielsmith-portfolio-table.'
      );
    }
    portfolioTablePoi.group.updateMatrixWorld(true);
    const selfWorldPosition = portfolioTablePoi.group.getWorldPosition(
      new Vector3()
    );
    const finiteSelfPlacement: MiniaturePoiPlacement = {
      id: portfolioTablePoi.definition.id,
      position: {
        x: selfWorldPosition.x,
        y: selfWorldPosition.y,
        z: selfWorldPosition.z,
      },
      headingRadians: portfolioTablePoi.group.rotation.y ?? 0,
      floor: getPoiFloorId(portfolioTablePoi.definition),
      roomId: portfolioTablePoi.definition.roomId,
      footprint: portfolioTablePoi.definition.footprint,
      definition: portfolioTablePoi.definition,
      anchorKind: 'floor',
      placementSource: 'visual-model-anchor',
    };
    const placementResolution = resolveGroundFloorMiniaturePoiPlacements(
      poiDefinitions,
      resolvePoiVisualAnchor,
      getPoiFloorId,
      finiteSelfPlacement
    );
    if (placementResolution.missingAnchorIds.length > 0) {
      crashBreadcrumbs.record({
        type: 'snapshot',
        message:
          'miniature-missing-visual-anchors:' +
          placementResolution.missingAnchorIds.join(','),
        renderer: rendererInfo,
        softwareRendererPolicy,
      });
    }
    const table = createPortfolioMiniatureTable({
      position: {
        x: portfolioTablePoi.group.position.x,
        y: portfolioTablePoi.group.position.y,
        z: portfolioTablePoi.group.position.z,
      },
      orientationRadians: portfolioTablePoi.group.rotation.y ?? 0,
      tableDetailPolicy: activeSceneDetailPolicy,
      miniatureDetailPolicy: getMiniatureSceneDetailPolicy(
        effectiveInitialQualityLevel
      ),
      poiDefinitions,
      poiPlacements: placementResolution.placements,
    });
    addPoiStructure(portfolioTablePoi, table.group);
    getPoiColliderTarget(portfolioTablePoi).push(table.collider);
    namedColliderDebugNames.set(
      table.collider,
      'PortfolioMiniatureTableCollider'
    );
    portfolioMiniatureTable = table;
  }

  if (flywheelShowpiece) {
    const { targets, diagnostics } = resolveFlywheelEnergyTargets();
    if (targets.length === 0) {
      diagnostics.push('no-ground-floor-energy-targets');
    }
    flywheelShowpiece.setEnergyTargets(targets, diagnostics);
    if (diagnostics.length > 0) {
      crashBreadcrumbs.record({
        type: 'snapshot',
        message: `flywheel-energy-target-diagnostics:${diagnostics.join(',')}`,
        renderer: rendererInfo,
        softwareRendererPolicy,
      });
    }
  }

  poiInteractionManager = new PoiInteractionManager(
    renderer.domElement,
    camera,
    poiInstances,
    {
      isPoiEnabled: (poi) =>
        floorVisibilityController.isPoiVisibleOnActiveFloor(poi.definition),
      shouldHandleKeyboardEvent: (event) =>
        canHandleGameplayShortcut(
          event,
          hudPanelCoordinator?.getActivePanel() ?? null
        ),
    },
    poiAnalytics
  );
  const removeHoverListener = poiInteractionManager.addHoverListener((poi) => {
    currentHoveredPoi = poi;
    syncPoiDetailOverlay();
  });
  const removeSelectionStateListener =
    poiInteractionManager.addSelectionStateListener((poi, context) => {
      currentSelectedPoi = poi;
      if (
        poi &&
        (hudPanelCoordinator?.getActivePanel() ?? null) === 'settings'
      ) {
        hudPanelCoordinator?.closeAllPanels();
      }
      poiTooltipOverlay.setSelected(
        canShowPoiDetailOverlay()
          ? getFloorVisiblePoi(currentSelectedPoi)
          : null,
        context
      );
      poiWorldTooltip.setSelected(
        resolveWorldTooltipTarget(
          canShowPoiDetailOverlay()
            ? getFloorVisiblePoi(currentSelectedPoi)
            : null
        )
      );
      syncPoiDetailOverlay();
    });
  const removeSelectionListener = poiInteractionManager.addSelectionListener(
    (poi) => {
      poiVisitedState.markVisited(poi.id);
      tutorialController.syncVisitedPois(poiVisitedState.snapshot());
    }
  );
  poiInteractionManager.start();
  const handlePoiDetailEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) {
      return;
    }
    if ((hudPanelCoordinator?.getActivePanel() ?? null) === 'tutorial') {
      event.preventDefault();
      event.stopImmediatePropagation();
      hudPanelCoordinator?.closeActivePanel();
      return;
    }
    if (!poiTooltipOverlay.getState().visible) {
      return;
    }
    // Escape intentionally dismisses any visible POI detail state—selected, hovered,
    // or recommended—because HUD panel opens clear/hide POI detail before their own
    // Escape handlers run, so this capture listener should not swallow panel Escape.
    event.preventDefault();
    event.stopImmediatePropagation();
    dismissActivePoiDetail('keyboard');
  };
  document.addEventListener('keydown', handlePoiDetailEscape, {
    capture: true,
  });
  beforeUnloadHandler = () => {
    inputLatencyTelemetry?.report('beforeunload');
    disposeImmersiveResources();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const mannequin = createPortfolioMannequin({
    collisionRadius: PLAYER_RADIUS,
    detailPolicy: activeSceneDetailPolicy,
  });
  const player = mannequin.group;
  const mannequinHeight = mannequin.height;
  if (pendingPlayerPosition) {
    player.position.copy(pendingPlayerPosition);
  } else {
    player.position.copy(initialPlayerPosition);
  }
  scene.add(player);

  const footstepStereoPanner =
    typeof audioListener.context.createStereoPanner === 'function'
      ? audioListener.context.createStereoPanner()
      : null;
  const footstepSample = createFootstepBuffer(audioListener.context);
  const footstepAudioNode = new Audio(audioListener);
  footstepAudioNode.name = 'FootstepAudio';
  footstepAudioNode.setLoop(false);
  footstepAudioNode.setVolume(0);
  footstepAudioNode.setBuffer(footstepSample);
  if (footstepStereoPanner) {
    footstepAudioNode.setFilter(footstepStereoPanner);
  }
  player.add(footstepAudioNode);
  footstepAudio = footstepAudioNode;

  footstepAudioController = createFootstepAudioController({
    player: {
      play: ({ volume, playbackRate, pan }) => {
        if (!(ambientAudioPreference?.isEnabled() ?? false)) {
          stopFootstepAudio();
          return;
        }
        const clampedVolume = MathUtils.clamp(volume, 0, 1);
        const clampedRate = MathUtils.clamp(playbackRate, 0.25, 3);
        if (footstepStereoPanner && typeof pan === 'number') {
          const clampedPan = MathUtils.clamp(pan, -1, 1);
          footstepStereoPanner.pan.setTargetAtTime(
            clampedPan,
            audioListener.context.currentTime,
            0.01
          );
        }
        footstepAudioNode.setVolume(clampedVolume);
        footstepAudioNode.setPlaybackRate(clampedRate);
        if (footstepAudioNode.isPlaying) {
          footstepAudioNode.stop();
        }
        footstepAudioNode.play();
      },
      stop: stopFootstepAudio,
    },
    initialEnabled: ambientAudioPreference?.isEnabled() ?? false,
    maxLinearSpeed: PLAYER_SPEED,
    minActivationSpeed: PLAYER_SPEED * 0.12,
    intervalRange: { min: 0.26, max: 0.58 },
    volumeRange: { min: 0.32, max: 0.7 },
    pitchRange: { min: 0.88, max: 1.18 },
    stereoSeparation: 0.22,
  });

  const mannequinMixer = new AnimationMixer(player);
  const createStaticClip = (name: string) => new AnimationClip(name, -1, []);
  locomotionAnimator = createAvatarLocomotionAnimator({
    mixer: mannequinMixer,
    clips: {
      idle: createStaticClip('MannequinIdle'),
      walk: createStaticClip('MannequinWalk'),
      run: createStaticClip('MannequinRun'),
      turnLeft: createStaticClip('MannequinTurnLeft'),
      turnRight: createStaticClip('MannequinTurnRight'),
    },
    maxLinearSpeed: PLAYER_SPEED,
    thresholds: {
      idleToWalk: PLAYER_SPEED * 0.18,
      walkToRun: PLAYER_SPEED * 0.62,
    },
    smoothing: {
      linear: 6,
      turn: 10,
    },
    timeScale: {
      min: 0.4,
      max: 2.2,
      walkReferenceSpeed: PLAYER_SPEED * 0.3,
      runReferenceSpeed: PLAYER_SPEED * 0.82,
      turnReferenceSpeed: Math.PI,
    },
    turn: {
      threshold: 0.9,
      max: 2.6,
      linearSpeedLimit: PLAYER_SPEED * 0.24,
    },
  });

  const mannequinRightArm = player.getObjectByName(
    'PortfolioMannequinArmRight'
  ) as Object3D | null;
  const mannequinLeftArm = player.getObjectByName(
    'PortfolioMannequinArmLeft'
  ) as Object3D | null;
  const mannequinTorso = player.getObjectByName(
    'PortfolioMannequinTorso'
  ) as Object3D | null;
  const mannequinLeftFoot = player.getObjectByName(
    'PortfolioMannequinFootLeft'
  ) as Object3D | null;
  const mannequinRightFoot = player.getObjectByName(
    'PortfolioMannequinFootRight'
  ) as Object3D | null;

  if (mannequinRightArm && mannequinLeftArm && mannequinTorso) {
    avatarInteractionAnimator = createAvatarInteractionAnimator({
      mixer: mannequinMixer,
      targets: {
        rightArm: mannequinRightArm,
        leftArm: mannequinLeftArm,
        torso: mannequinTorso,
      },
    });
    removePoiInteractionAnimation = bindPoiInteractionAnimation({
      source: poiInteractionManager,
      animator: avatarInteractionAnimator,
    });
  } else {
    console.warn(
      'Avatar interaction animation targets missing; skipping bind.'
    );
  }

  if (mannequinLeftFoot && mannequinRightFoot) {
    avatarFootIkController = createAvatarFootIkController({
      leftFoot: mannequinLeftFoot,
      rightFoot: mannequinRightFoot,
      pelvis: mannequinTorso ?? undefined,
      maxFootOffset: 0.22,
      maxFootPitch: Math.PI / 5,
      slopeSampleDistance: 0.34,
      smoothing: {
        foot: 10,
        rotation: 10,
        pelvis: 8,
      },
      pelvisWeight: 0.6,
      maxPelvisOffset: 0.18,
      contact: { offsetTolerance: 0.018 },
      events: {
        onFootContact: ({ foot }) => {
          footstepAudioController?.notifyFootfall(foot);
        },
      },
    });
  } else {
    console.warn(
      'Avatar foot IK requires both foot targets; skipping alignment.'
    );
  }

  let avatarVariantStorage: Storage | undefined;
  try {
    avatarVariantStorage = window.localStorage;
  } catch {
    avatarVariantStorage = undefined;
  }

  avatarAccessorySuite = createAvatarAccessorySuite({ mannequin });
  avatarAccessoryManager = createAvatarAccessoryManager({
    suite: avatarAccessorySuite,
    storage: avatarVariantStorage,
    storageKey: 'danielsmith.io:avatarAccessories',
    initialPalette: mannequin.getPalette(),
  });

  portfolioMiniatureTable?.setPlayerPalette(mannequin.getPalette());

  avatarVariantManager = createAvatarVariantManager({
    target: {
      applyPalette: (palette) => {
        mannequin.applyPalette(palette);
        avatarAccessoryManager?.applyPalette(palette);
        portfolioMiniatureTable?.setPlayerPalette(palette);
      },
    },
    storage: avatarVariantStorage,
  });
  ensureAvatarApi();

  const controlOverlay = document.getElementById('control-overlay');
  if (controlOverlay) {
    applyControlOverlayStrings(controlOverlay, controlOverlayStrings);
  }
  const analyticsGlow: AnalyticsGlowRhythmHandle = createAnalyticsGlowRhythm({
    element: controlOverlay ?? null,
    getPulseScale: () => getPulseScale(),
  });
  const keyBindings = new KeyBindings();
  const KEY_BINDINGS_STORAGE_KEY = 'danielsmith.io:keyBindings';
  const bindingActions: KeyBindingAction[] = [
    'moveForward',
    'moveBackward',
    'moveLeft',
    'moveRight',
    'interact',
    'help',
    'toggleControls',
    'toggleTutorial',
  ];
  const bindingActionSet = new Set<KeyBindingAction>(bindingActions);

  const getBindingSnapshot = (): KeyBindingSnapshot => {
    const snapshot = {} as KeyBindingSnapshot;
    for (const action of bindingActions) {
      snapshot[action] = [...keyBindings.getBindings(action)];
    }
    return snapshot;
  };

  const loadStoredKeyBindings = () => {
    try {
      const stored = window.localStorage?.getItem(KEY_BINDINGS_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as KeyBindingConfig;
      if (parsed && typeof parsed === 'object') {
        keyBindings.update(parsed);
      }
    } catch (error) {
      console.warn('Failed to load key bindings from storage', error);
    }
  };

  const saveKeyBindings = () => {
    try {
      window.localStorage?.setItem(
        KEY_BINDINGS_STORAGE_KEY,
        JSON.stringify(getBindingSnapshot())
      );
    } catch (error) {
      console.warn('Failed to save key bindings', error);
    }
  };

  loadStoredKeyBindings();

  const ensureKeyBindingApi = () => {
    setPortfolioInputKeyBindings({
      getBindings() {
        return getBindingSnapshot();
      },
      setBinding(action, keys) {
        if (!bindingActionSet.has(action)) {
          throw new Error(`Unknown key binding action: ${action}`);
        }
        keyBindings.setBindings(action, Array.from(keys));
        saveKeyBindings();
      },
      resetBinding(action) {
        if (!bindingActionSet.has(action)) {
          throw new Error(`Unknown key binding action: ${action}`);
        }
        keyBindings.reset(action);
        saveKeyBindings();
      },
      resetAll() {
        keyBindings.resetAll();
        saveKeyBindings();
      },
    });
  };

  ensureKeyBindingApi();
  const ensureWorldApi = () => {
    setPortfolioSection('world', {
      getActiveFloor() {
        return activeFloorId;
      },
      canOccupyPosition(target: { x: number; z: number; floorId?: FloorId }) {
        const floorId =
          target.floorId ?? predictFloorId(target.x, target.z, activeFloorId);
        return canOccupyPosition(target.x, target.z, floorId);
      },
      setActiveFloor(next: FloorId) {
        resetUpperDescentBlend();
        setActiveFloorId(next);
        updatePlayerVerticalPosition();
      },
      movePlayerTo(target: { x: number; z: number; floorId?: FloorId }) {
        const { x, z, floorId } = target;
        const predictedFloor = floorId ?? predictFloorId(x, z, activeFloorId);
        if (!canOccupyPosition(x, z, predictedFloor)) {
          throw new Error(
            `Cannot occupy (${x.toFixed(2)}, ${z.toFixed(2)}) on floor ${predictedFloor}`
          );
        }
        resetUpperDescentBlend();
        player.position.x = x;
        player.position.z = z;
        setActiveFloorId(predictedFloor);
        updatePlayerVerticalPosition();
      },
      stepPlayerForTest(step: { dx: number; dz: number }) {
        return applyPlayerMovementStep(step.dx, step.dz, {
          includeDiagnostics: true,
        });
      },
      // Test helpers – intentionally minimal and unavailable outside debug/test handles.
      getPlayerPosition() {
        return {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        };
      },
      predictFloorAt(target: { x: number; z: number; currentFloor?: FloorId }) {
        return predictFloorId(
          target.x,
          target.z,
          target.currentFloor ?? activeFloorId
        );
      },
      getStairTransitionZone(target: {
        x: number;
        z: number;
        currentFloor?: FloorId;
      }) {
        return classifyStairTransitionZone(
          stairGeometry,
          stairBehavior,
          target.x,
          target.z,
          target.currentFloor ?? activeFloorId
        );
      },
      getStairMetrics() {
        return {
          stairCenterX,
          stairHalfWidth,
          stairBottomZ,
          stairTopZ,
          stairLandingMinZ,
          stairLandingMaxZ,
          stairLandingDepth: stairLandingDepth,
          stairDirection: stairLayout.directionMultiplier,
          upperFloorElevation,
        };
      },
      // Test helpers – expose current mannequin yaw in radians.
      getPlayerYaw() {
        return normalizeRadians(mannequinRelativeYaw);
      },
      getCeilingOpacities(): number[] {
        return ceilings.panels.map((p) => {
          const material = p.mesh.material as MeshStandardMaterial;
          return material.opacity;
        });
      },
      getFloorVisibilitySnapshot() {
        const isEffectivelyVisible = (
          object: Object3D | null
        ): boolean | null => {
          if (!object) {
            return null;
          }
          let current: Object3D | null = object;
          while (current) {
            if (!current.visible) {
              return false;
            }
            current = current.parent;
          }
          return true;
        };

        return {
          activeFloorId,
          groundFloorVisible: groundFloorGroup.visible,
          groundPoiVisible: groundPoiGroup.visible,
          upperPoiVisible: upperPoiGroup.visible,
          groundEnvironmentVisible: groundEnvironmentGroup.visible,
          groundStructureVisible: groundStructureGroup.visible,
          upperFloorVisible: upperFloorGroup.visible,
          backyardEnvironmentVisible: isEffectivelyVisible(
            backyardEnvironment?.group ?? null
          ),
        };
      },
    });
  };
  ensureWorldApi();
  const getAvatarAssetPipeline = () => {
    if (!avatarAssetPipeline) {
      avatarAssetPipeline = createAvatarAssetPipeline({
        importerOptions: {
          requiredBones: AVATAR_ASSET_REQUIRED_BONES,
          requiredAnimations: AVATAR_ASSET_REQUIRED_ANIMATIONS,
        },
        expectedUnitScale: AVATAR_ASSET_EXPECTED_UNIT_SCALE,
        scaleTolerance: AVATAR_ASSET_SCALE_TOLERANCE,
      });
    }
    return avatarAssetPipeline;
  };
  function ensureAvatarApi() {
    setPortfolioSection('avatar', {
      getActiveVariant(): AvatarVariantId {
        return avatarVariantManager?.getVariant() ?? DEFAULT_AVATAR_VARIANT_ID;
      },
      setActiveVariant(variant: AvatarVariantId) {
        avatarVariantManager?.setVariant(variant);
      },
      listVariants() {
        const variantStrings =
          getLocaleStrings(locale).hud.customization.variants;
        return AVATAR_VARIANTS.map(({ id }) => ({
          id,
          ...variantStrings.options[id],
        }));
      },
      listAccessories() {
        const accessoryStrings =
          getLocaleStrings(locale).hud.customization.accessories;
        return (
          avatarAccessorySuite?.definitions.map(({ id }) => ({
            id,
            ...accessoryStrings.options[id],
            enabled: avatarAccessoryManager?.isEnabled(id) ?? false,
          })) ?? []
        );
      },
      getAccessories(): AvatarAccessoryState[] {
        return avatarAccessoryManager?.getState() ?? [];
      },
      setAccessoryEnabled(id: AvatarAccessoryId, enabled: boolean) {
        avatarAccessoryManager?.setEnabled(id, enabled);
      },
      toggleAccessory(id: AvatarAccessoryId) {
        avatarAccessoryManager?.toggle(id);
      },
      loadAsset(options: AvatarAssetPipelineLoadOptions) {
        return getAvatarAssetPipeline().load(options);
      },
    });
  }
  const interactControl = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact"]'
  );
  const interactDescription = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact-description"]'
  );
  const controlOverlayHeading = controlOverlay?.querySelector<HTMLElement>(
    '[data-control-text="heading"]'
  );
  const controlsButton = controlOverlay?.querySelector<HTMLButtonElement>(
    '[data-role="controls-button"]'
  );
  const helpButton = controlOverlay?.querySelector<HTMLButtonElement>(
    '[data-control="help"]'
  );
  const tutorialButton = controlOverlay?.querySelector<HTMLButtonElement>(
    '[data-role="tutorial-button"]'
  );
  const textModeButton = controlOverlay?.querySelector<HTMLButtonElement>(
    '[data-role="text-mode-button"]'
  );
  let interactLabelFallback = controlOverlayStrings.interact.defaultLabel;
  let interactDescriptionFallback = controlOverlayStrings.interact.description;
  const movementLegend: MovementLegendHandle | null = controlOverlay
    ? createMovementLegend({
        container: controlOverlay,
        locale,
        interactLabels: {
          keyboard:
            formatKeyLabel(keyBindings.getPrimaryBinding('interact')) ||
            interactLabelFallback,
        },
        focusTarget: controlOverlay,
        focusLabel: controlOverlayStrings.heading,
      })
    : null;
  if (controlOverlay) {
    // Normal desktop immersive startup must not focus Controls: doing so creates
    // the initial visual HUD highlight. Semantic metadata still applies here;
    // focusOnInit remains reserved for explicit opt-in accessibility flows.
    applyImmersiveControlOverlayAccessibility({
      container: controlOverlay,
      heading: controlOverlayHeading,
      controlsButton,
      helpButton,
      documentTarget: document,
    });
  }
  responsiveControlOverlay = controlOverlay
    ? createResponsiveControlOverlay({
        container: controlOverlay,
        list: controlOverlay.querySelector<HTMLElement>(
          '[data-role="control-list"]'
        ),
        button: controlsButton,
        popover: controlOverlay.querySelector<HTMLElement>(
          '[data-role="controls-popover"]'
        ),
        closeButton: controlOverlay.querySelector<HTMLButtonElement>(
          '[data-role="controls-close"]'
        ),
        strings: controlOverlayStrings,
        initialLayout: 'desktop',
        manageButtonClick: false,
        onOpenChange: () => syncPoiDetailOverlay(),
      })
    : null;
  const updateControlsButtonLabel = () => {
    const label =
      formatKeyLabel(keyBindings.getPrimaryBinding('toggleControls')) ||
      controlOverlayStrings.menu.controls.keyHint;
    responsiveControlOverlay?.setControlsShortcutLabel(label);
  };
  const updateTutorialButtonLabel = () => {
    if (!tutorialButton) {
      return;
    }
    const label =
      formatKeyLabel(keyBindings.getPrimaryBinding('toggleTutorial')) ||
      controlOverlayStrings.menu.tutorial.keyHint;
    applyHudMenuButtonMetadata(
      tutorialButton,
      controlOverlayStrings.menu.tutorial,
      label
    );
  };
  updateControlsButtonLabel();
  updateTutorialButtonLabel();
  const helpModal = createHelpModal({
    container: document.body,
    content: helpModalStrings,
  });
  let tutorialStorage: Storage | null = null;
  try {
    tutorialStorage = window.localStorage;
  } catch (error) {
    console.warn(
      'Unable to access localStorage for tutorial preferences.',
      error
    );
  }
  const tutorialController = createTutorialController({
    storage: tutorialStorage,
    onDismiss: () => hudPanelCoordinator?.closeActivePanel(),
  });
  const tutorialPanel = createTutorialPanel({
    container: document.body,
    strings: tutorialPanelStrings,
    state: tutorialController.getState(),
    showOnStartup: tutorialController.getShowOnStartup(),
    onOpenChange: () => syncPoiDetailOverlay(),
    onRequestClose: () => tutorialController.dismiss(),
    onSelectPage: (pageId) => tutorialController.selectPage(pageId),
    onPrevious: () => tutorialController.previousPage(),
    onNext: () => tutorialController.nextPage(),
    onToggleShowOnStartup: (value) =>
      tutorialController.setShowOnStartup(value),
    onTextMode: () => activateTextMode(),
  });
  tutorialController.setPanel(tutorialPanel);
  tutorialController.syncVisitedPois(poiVisitedState.snapshot());
  const hudSettingsContainer =
    helpModal.settingsContainer ??
    (() => {
      const fallback = document.createElement('div');
      fallback.className = 'help-modal__settings';
      helpModal.element.appendChild(fallback);
      return fallback;
    })();
  const hudSettingsStack = document.createElement('div');
  hudSettingsStack.className = 'hud-settings';
  hudSettingsContainer.appendChild(hudSettingsStack);
  const hudControlElements = new Set<HTMLElement>();
  const registerHudControlElement = (element?: HTMLElement | null) => {
    if (!element) {
      return;
    }
    element.hidden = true;
    hudControlElements.add(element);
  };
  const showHudControlElements = () => {
    hudControlElements.forEach((element) => {
      element.hidden = false;
    });
  };
  const hideHudControlElements = () => {
    hudControlElements.forEach((element) => {
      element.hidden = true;
    });
  };

  const hasVariantControl = Boolean(avatarVariantManager);
  const hasAccessoryControl = Boolean(
    avatarAccessoryManager && avatarAccessorySuite
  );
  if (hasVariantControl || hasAccessoryControl) {
    hudCustomizationSection = createHudCustomizationSection({
      container: hudSettingsStack,
      strings: hudCustomizationStrings,
      createVariantControl: hasVariantControl
        ? ({ container: customizationContainer, title, description }) =>
            createAvatarVariantControl({
              container: customizationContainer,
              options: AVATAR_VARIANTS.map(({ id, palette }) => ({
                id,
                palette,
                ...hudCustomizationStrings.variants.options[id],
              })),
              strings: {
                title,
                description,
                options: AVATAR_VARIANTS.map(({ id }) => ({
                  id,
                  ...hudCustomizationStrings.variants.options[id],
                })),
                selectedAnnouncementTemplate:
                  hudCustomizationStrings.variants.selectedAnnouncementTemplate,
              },
              getActiveVariant: () =>
                avatarVariantManager?.getVariant() ?? DEFAULT_AVATAR_VARIANT_ID,
              setActiveVariant: (variant) => {
                avatarVariantManager?.setVariant(variant);
              },
            })
        : undefined,
      createAccessoryControl: hasAccessoryControl
        ? ({ container: customizationContainer, title, description }) =>
            createAvatarAccessoryControl({
              container: customizationContainer,
              options: avatarAccessorySuite!.definitions.map(({ id }) => ({
                id,
                ...hudCustomizationStrings.accessories.options[id],
              })),
              strings: {
                title,
                description,
                options: avatarAccessorySuite!.definitions.map(({ id }) => ({
                  id,
                  ...hudCustomizationStrings.accessories.options[id],
                })),
                enabledAnnouncementTemplate:
                  hudCustomizationStrings.accessories
                    .enabledAnnouncementTemplate,
                disabledAnnouncementTemplate:
                  hudCustomizationStrings.accessories
                    .disabledAnnouncementTemplate,
              },
              isAccessoryEnabled: (id) =>
                avatarAccessoryManager?.isEnabled(id) ?? false,
              setAccessoryEnabled: (id, enabled) => {
                avatarAccessoryManager?.setEnabled(id, enabled);
              },
            })
        : undefined,
    });
    registerHudControlElement(hudCustomizationSection.element);
  }
  if (avatarVariantManager) {
    unsubscribeAvatarVariant = avatarVariantManager.onChange(() => {
      hudCustomizationSection?.refresh();
    });
  }
  if (avatarAccessoryManager) {
    unsubscribeAvatarAccessories = avatarAccessoryManager.onChange(() => {
      hudCustomizationSection?.refresh();
    });
  }
  hudFocusAnnouncer = createHudFocusAnnouncer({
    documentTarget: document,
    container: document.body,
  });
  helpModalController = attachHelpModalController({
    helpModal,
    helpButton,
    onOpen: showHudControlElements,
    onClose: hideHudControlElements,
    onOpenChange: () => syncPoiDetailOverlay(),
    hudFocusAnnouncer,
    announcements: helpModalStrings.announcements,
  });
  const activateTextMode = () => {
    hudPanelCoordinator?.closeAllPanels();
    if (performanceFailover.hasTriggered()) {
      clearModePreference();
      window.location.assign(createImmersiveRecoveryUrl());
      return;
    }
    if (shouldPersistTextPreferenceForFallback('manual')) {
      writeModePreference('text');
    }
    performanceFailover.triggerFallback('manual');
  };

  lowFpsRecoveryPopup = document.createElement('aside');
  lowFpsRecoveryPopup.className = 'performance-recovery-popup';
  lowFpsRecoveryPopup.setAttribute('role', 'dialog');
  lowFpsRecoveryPopup.setAttribute('aria-modal', 'false');
  lowFpsRecoveryPopup.hidden = true;
  container.appendChild(lowFpsRecoveryPopup);

  const getNextLowerGraphicsLevel = () => {
    const current = graphicsQualityManager?.getLevel();
    if (current === 'cinematic') {
      return 'balanced' as const;
    }
    if (current === 'balanced') {
      return 'performance' as const;
    }
    return null;
  };

  const reportLowFpsRecoveryAction = (action: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent('lowfpsrecovery', { detail: { action } })
      );
    } catch (error) {
      console.warn('Failed to dispatch low-FPS recovery event.', error);
    }
  };

  const renderLowFpsRecoveryPopup = () => {
    const popup = lowFpsRecoveryPopup;
    if (!popup) return;
    popup.replaceChildren();
    const title = document.createElement('h2');
    title.className = 'performance-recovery-popup__title';
    title.id = 'performance-recovery-popup-title';
    title.textContent = lowFpsRecoveryStrings.title;
    const body = document.createElement('p');
    body.className = 'performance-recovery-popup__body';
    body.id = 'performance-recovery-popup-body';
    body.textContent = lowFpsRecoveryStrings.body;
    popup.setAttribute('aria-labelledby', title.id);
    popup.setAttribute('aria-describedby', body.id);
    const actions = document.createElement('div');
    actions.className = 'performance-recovery-popup__actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = lowFpsRecoveryStrings.dismissLabel;
    dismiss.addEventListener('click', () => {
      lowFpsRecoveryMonitor?.dismiss();
      popup.hidden = true;
      reportLowFpsRecoveryAction('dismiss');
    });
    actions.appendChild(dismiss);
    const nextLevel = getNextLowerGraphicsLevel();
    if (nextLevel) {
      const downgrade = document.createElement('button');
      downgrade.type = 'button';
      downgrade.textContent =
        nextLevel === 'balanced'
          ? lowFpsRecoveryStrings.downgradeBalancedLabel
          : lowFpsRecoveryStrings.downgradePerformanceLabel;
      downgrade.addEventListener('click', () => {
        reportLowFpsRecoveryAction(`downgrade-${nextLevel}`);
        lowFpsRecoveryMonitor?.dismiss();
        popup.hidden = true;
        if (nextLevel === 'performance') {
          pendingLowFpsPerformanceRecoveryReload = true;
        }
        graphicsQualityManager?.setLevel(nextLevel, { source: 'user' });
      });
      actions.appendChild(downgrade);
    }
    const textMode = document.createElement('button');
    textMode.type = 'button';
    textMode.textContent = lowFpsRecoveryStrings.textModeLabel;
    textMode.addEventListener('click', () => {
      lowFpsRecoveryMonitor?.dismiss();
      popup.hidden = true;
      reportLowFpsRecoveryAction('text-mode');
      activateTextMode();
    });
    actions.appendChild(textMode);
    popup.append(title, body, actions);
  };

  lowFpsRecoveryMonitor = new LowFpsRecoveryMonitor({
    fpsThreshold: LOW_FPS_RECOVERY_THRESHOLD,
    windowMs: LOW_FPS_RECOVERY_WINDOW_MS,
    cooldownMs: LOW_FPS_RECOVERY_COOLDOWN_MS,
    onTrigger: () => {
      renderLowFpsRecoveryPopup();
      if (lowFpsRecoveryPopup) {
        lowFpsRecoveryPopup.hidden = false;
      }
      hudFocusAnnouncer?.announce(lowFpsRecoveryStrings.announcement);
      reportLowFpsRecoveryAction('shown');
    },
  });
  const toggleHelpMenu = (force?: boolean) => {
    if (hudPanelCoordinator) {
      hudPanelCoordinator.toggleSettings(force);
      return;
    }
    helpModal.toggle(force);
  };
  const normalizeKeyboardEventKey = (event: KeyboardEvent): string =>
    event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const normalizeBindingKey = (binding: string): string =>
    binding.length === 1 ? binding.toLowerCase() : binding;
  const matchesKeyBinding = (
    event: KeyboardEvent,
    action: KeyBindingAction
  ): boolean => {
    const normalizedKey = normalizeKeyboardEventKey(event);
    return keyBindings
      .getBindings(action)
      .some((binding) => normalizeBindingKey(binding) === normalizedKey);
  };
  const hasConflictingKeyBinding = (
    event: KeyboardEvent,
    action: KeyBindingAction
  ): boolean => {
    const normalizedKey = normalizeKeyboardEventKey(event);
    return bindingActions.some(
      (candidate) =>
        candidate !== action &&
        keyBindings
          .getBindings(candidate)
          .some((binding) => normalizeBindingKey(binding) === normalizedKey)
    );
  };
  const handleHudPanelKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    if (isTextEntryTarget(event.target)) {
      return;
    }
    if (
      matchesKeyBinding(event, 'toggleTutorial') &&
      !hasConflictingKeyBinding(event, 'toggleTutorial')
    ) {
      event.preventDefault();
      hudPanelCoordinator?.toggleTutorial();
    }
  };
  const handleControlsKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    if (isTextEntryTarget(event.target)) {
      return;
    }
    if (
      !matchesKeyBinding(event, 'toggleControls') ||
      hasConflictingKeyBinding(event, 'toggleControls')
    ) {
      return;
    }
    event.preventDefault();
    if (hudPanelCoordinator) {
      hudPanelCoordinator.toggleControls();
      return;
    }
    responsiveControlOverlay?.toggle();
  };
  window.addEventListener('keydown', handleHudPanelKeydown);
  window.addEventListener('keydown', handleControlsKeydown);
  hudPanelCoordinator = createHudPanelCoordinator({
    controls: responsiveControlOverlay ?? {
      open() {},
      close() {},
      toggle() {},
      isOpen: () => false,
    },
    settings: helpModal,
    tutorial: tutorialPanel,
    controlsButton,
    settingsButton: helpButton,
    tutorialButton,
    textButton: textModeButton,
    onTextMode: activateTextMode,
    onActivePanelChange: (panel) => {
      if (panel === 'settings') {
        clearPoiDetailState();
      }
      syncPoiDetailOverlay();
    },
  });
  const maybeOpenTutorialOnFirstReadyFrame = () => {
    if (!tutorialController.getShowOnStartup()) {
      return;
    }
    if (softwareRendererWarning?.element.isConnected) {
      return;
    }
    if (lowFpsRecoveryPopup && !lowFpsRecoveryPopup.hidden) {
      return;
    }
    hudPanelCoordinator?.openTutorial();
  };

  let interactablePoi: PoiInstance | null = null;

  const controls = new KeyboardControls();
  const keyPressSource = createKeyBindingAwareSource(controls);
  const joystick = new VirtualJoystick(renderer.domElement);
  const clock = new Clock();
  const targetVelocity = new Vector3();
  const velocity = new Vector3();
  const moveDirection = new Vector3();
  const mannequinFacingDirection = new Vector3();
  let mannequinRelativeYaw = 0;
  let mannequinRelativeYawTarget = 0;
  const cameraPan = new Vector3();
  const cameraPanTarget = new Vector3();
  let wasCameraPanInputActive = false;
  const poiLabelLookTarget = new Vector3();
  const poiPlayerOffset = new Vector2();
  let cameraPanLimitX = 0;
  let cameraPanLimitZ = 0;
  let interactKeyWasPressed = false;
  const pinchPointers = new Map<number, { x: number; y: number }>();
  let pinchStartDistance: number | null = null;
  let pinchStartZoomTarget = cameraZoomTarget;
  const mouseCameraInput = new Vector2();
  const mouseCameraStart = new Vector2();
  let mouseCameraPointerId: number | null = null;

  let helpKeyWasPressed = false;
  let helpLabelFallback = controlOverlayStrings.helpButton.shortcutFallback;
  const buildHelpButtonText = (shortcut: string) =>
    formatMessage(controlOverlayStrings.helpButton.labelTemplate, {
      shortcut,
    });
  const buildHelpAnnouncement = (shortcut: string) =>
    formatMessage(controlOverlayStrings.helpButton.announcementTemplate, {
      shortcut,
    });
  const updateHelpButtonLabel = () => {
    if (!helpButton) {
      return;
    }
    const label =
      formatKeyLabel(keyBindings.getPrimaryBinding('help')) ||
      helpLabelFallback;
    const settingsLabel = helpButton.querySelector(
      '[data-hud-menu-label="settings"]'
    );
    if (!(settingsLabel instanceof HTMLElement)) {
      helpButton.textContent = buildHelpButtonText(label);
    }
    applyHudMenuButtonMetadata(
      helpButton,
      controlOverlayStrings.menu.settings,
      label,
      buildHelpAnnouncement(label)
    );
  };
  updateHelpButtonLabel();

  const applyLocaleUpdate = (nextLocale: Locale) => {
    if (locale === nextLocale) {
      return;
    }
    locale = nextLocale;
    if (localeStorage) {
      try {
        localeStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch (error) {
        console.warn('Failed to persist locale preference.', error);
      }
    }
    const direction = getLocaleDirection(locale);
    document.documentElement.dir = direction;
    document.documentElement.dataset.localeDirection = direction;
    document.documentElement.dataset.localeScript = getLocaleScript(locale);
    document.documentElement.lang = locale === 'en-x-pseudo' ? 'en' : locale;

    controlOverlayStrings = getControlOverlayStrings(locale);
    helpModalStrings = getHelpModalStrings(locale);
    tutorialPanelStrings = getTutorialPanelStrings(locale);
    hudCustomizationStrings = getHudCustomizationStrings(locale);
    localeToggleStrings = getLocaleToggleStrings(locale);
    modeToggleStrings = getModeToggleStrings(locale);
    audioHudStrings = getAudioHudControlStrings(locale);
    audioSubtitleStrings = getAudioSubtitleStrings(locale);
    debugCoordinatesStrings = getDebugCoordinatesStrings(locale);
    debugCollidersStrings = getDebugCollidersStrings(locale);
    graphicsQualityStrings = getLocaleStrings(locale).hud.graphicsQuality;
    accessibilityPresetStrings =
      getLocaleStrings(locale).hud.accessibilityPresets;
    helpModalController?.setAnnouncements(helpModalStrings.announcements);
    poiOverlayStrings = getPoiOverlayChromeStrings(locale);
    softwareRendererWarningStrings = getSoftwareRendererWarningStrings(locale);
    lowFpsRecoveryStrings = getLowFpsRecoveryStrings(locale);
    if (lowFpsRecoveryPopup && !lowFpsRecoveryPopup.hidden) {
      renderLowFpsRecoveryPopup();
    }
    siteStrings = getSiteStrings(locale);
    syncModeAnnouncerStrings();
    interactLabelFallback = controlOverlayStrings.interact.defaultLabel;
    interactDescriptionFallback = controlOverlayStrings.interact.description;
    helpLabelFallback = controlOverlayStrings.helpButton.shortcutFallback;

    const selectedId = currentSelectedPoi?.id ?? null;
    const hoveredId = currentHoveredPoi?.id ?? null;
    poiDefinitions = getPoiDefinitions(locale);
    poiDefinitionsById = new Map(
      poiDefinitions.map((definition) => [definition.id, definition] as const)
    );
    for (const poi of poiInstances) {
      const nextDefinition = poiDefinitionsById.get(poi.definition.id);
      if (nextDefinition) {
        updatePoiInstanceDefinition(poi, nextDefinition);
      }
    }
    currentSelectedPoi = selectedId
      ? (poiDefinitionsById.get(selectedId) ?? null)
      : null;
    currentHoveredPoi = hoveredId
      ? (poiDefinitionsById.get(hoveredId) ?? null)
      : null;
    wirePoiGitHubMetrics();
    injectPoiStructuredData(poiDefinitions, {
      siteName: siteStrings.name,
      locale,
    });
    injectTextPortfolioStructuredData(poiDefinitions, {
      siteName: siteStrings.name,
      locale,
    });

    if (controlOverlay) {
      applyControlOverlayStrings(controlOverlay, controlOverlayStrings);
    }
    analyticsGlow.setElement(controlOverlay ?? null);
    responsiveControlOverlay?.setStrings(controlOverlayStrings);
    updateControlsButtonLabel();
    updateTutorialButtonLabel();
    responsiveControlOverlay?.refresh();
    movementLegend?.setLocale(locale);
    if (movementLegend) {
      const keyboardLabel =
        formatKeyLabel(keyBindings.getPrimaryBinding('interact')) ||
        interactLabelFallback;
      movementLegend.setKeyboardInteractLabel(keyboardLabel);
    }
    manualModeToggle?.setStrings(modeToggleStrings);
    audioHudHandle?.setStrings(audioHudStrings);
    motionBlurControl?.setStrings(
      getMotionBlurControlCopy(getLocaleStrings(locale).hud)
    );
    softwareRendererWarning?.setStrings(softwareRendererWarningStrings);
    helpModal.setContent(helpModalStrings);
    tutorialPanel.setStrings(tutorialPanelStrings);
    hudCustomizationSection?.setStrings(hudCustomizationStrings);
    graphicsQualityControl?.setStrings({
      ...graphicsQualityStrings,
      options: GRAPHICS_QUALITY_PRESETS.map(({ id }) => ({
        id,
        ...graphicsQualityStrings.options[id],
      })),
    });
    accessibilityControlHandle?.setStrings({
      ...accessibilityPresetStrings,
      options: ACCESSIBILITY_PRESETS.map(({ id }) => ({
        id,
        ...accessibilityPresetStrings.options[id],
      })),
    });
    localeToggleControl?.setStrings(localeToggleStrings);
    poiTooltipOverlay.setStrings(poiOverlayStrings, locale);
    audioSubtitles?.setLabels(audioSubtitleStrings);
    refreshDebugCoordinatesStrings();
    refreshDebugCollidersStrings();
    updateHelpButtonLabel();
    localeToggleControl?.refresh();
    syncPoiDetailOverlay();
    refreshInteractablePoiPrompt();
  };

  const canonicalLocaleOptions = getLocaleToggleStrings('en').options;
  const localeOptionIds = getSelectableLocales({ exposePseudoLocale });
  const localeOptions = localeOptionIds.map((id) => ({
    id,
    ...(localeToggleStrings.options[id] ?? canonicalLocaleOptions[id]),
  }));

  localeToggleControl = createLocaleToggleControl({
    container: hudSettingsStack,
    options: localeOptions,
    getActiveLocale: () => locale,
    setActiveLocale: (nextLocale) => {
      applyLocaleUpdate(nextLocale);
    },
    strings: localeToggleStrings,
  });
  registerHudControlElement(localeToggleControl?.element ?? null);

  const keyBindingUnsubscribes: Array<() => void> = [];
  keyBindingUnsubscribes.push(
    keyBindings.subscribe((action, bindings) => {
      if (action === 'interact' && movementLegend) {
        const label = formatKeyLabel(bindings[0]) || interactLabelFallback;
        movementLegend.setKeyboardInteractLabel(label);
      }
      if (action === 'help') {
        updateHelpButtonLabel();
      }
      if (action === 'toggleControls') {
        updateControlsButtonLabel();
      }
      if (action === 'toggleTutorial') {
        updateTutorialButtonLabel();
      }
      saveKeyBindings();
    })
  );

  const predictFloorId = (x: number, z: number, current: FloorId): FloorId =>
    predictStairFloorId(stairGeometry, stairBehavior, x, z, current);

  const canOccupyPosition = (
    x: number,
    z: number,
    floorId: FloorId
  ): boolean => {
    const navMesh = navMeshes[floorId];
    if (!navMesh.contains(x, z)) {
      return false;
    }

    if (collidesWithColliders(x, z, PLAYER_RADIUS, floorColliders[floorId])) {
      return false;
    }

    if (
      floorId === 'ground' &&
      collidesWithColliders(x, z, PLAYER_RADIUS, staticColliders)
    ) {
      return false;
    }

    return true;
  };

  const setActiveFloorId = (next: FloorId) => {
    if (activeFloorId === next) {
      return;
    }
    activeFloorId = next;
    floorVisibilityController.setActiveFloorId(next);
    poiWorldTooltip.setActiveFloorId(next);
    syncPoiDetailOverlay();
    document.documentElement.dataset.activeFloor = next;
    colliderVisualizer.setActiveFloor(next);
  };

  // Persists the intentional upper→ground descent context after the floor handoff so
  // slow movement keeps using the upper lip blend across the whole transition band.
  let upperDescentBlendActive = false;

  const getVerticalSurfaceFloor = (surfaceFloor: FloorId): FloorId => {
    if (surfaceFloor === 'upper') {
      return 'upper';
    }

    if (
      upperDescentBlendActive &&
      classifyStairTransitionZone(
        stairGeometry,
        stairBehavior,
        player.position.x,
        player.position.z,
        'upper'
      ) === 'explicitDescentCorridor'
    ) {
      return 'upper';
    }

    return surfaceFloor;
  };

  const resetUpperDescentBlend = () => {
    upperDescentBlendActive = false;
  };

  const updatePlayerVerticalPosition = (
    surfaceFloor: FloorId = activeFloorId
  ) => {
    const verticalSurfaceFloor = getVerticalSurfaceFloor(surfaceFloor);
    const baseHeight = sampleStairSurfaceHeight({
      geometry: stairGeometry,
      behavior: stairBehavior,
      x: player.position.x,
      z: player.position.z,
      currentFloor: verticalSurfaceFloor,
      upperFloorElevation,
    });
    player.position.y = baseHeight;
  };

  const collidesWithCollider = (
    x: number,
    z: number,
    radius: number,
    collider: RectCollider
  ): boolean => {
    const closestX = MathUtils.clamp(x, collider.minX, collider.maxX);
    const closestZ = MathUtils.clamp(z, collider.minZ, collider.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  };

  const getBlockingNamesAt = (
    x: number,
    z: number,
    floorId: FloorId
  ): string[] => {
    const blockedBy = new Set<string>();
    const navMesh = navMeshes[floorId];
    if (!navMesh.contains(x, z)) {
      blockedBy.add(`${floorId}NavMesh`);
    }

    for (const collider of floorColliders[floorId]) {
      if (collidesWithCollider(x, z, PLAYER_RADIUS, collider)) {
        blockedBy.add(
          namedColliderDebugNames.get(collider) ?? `${floorId}Collider`
        );
      }
    }

    if (floorId === 'ground') {
      for (const collider of staticColliders) {
        if (collidesWithCollider(x, z, PLAYER_RADIUS, collider)) {
          blockedBy.add(
            namedColliderDebugNames.get(collider) ?? 'StaticCollider'
          );
        }
      }
    }

    return Array.from(blockedBy);
  };

  const applyPlayerMovementStep = (
    stepX: number,
    stepZ: number,
    options: { includeDiagnostics?: boolean } = {}
  ) => {
    // Height sampling uses the floor from the start of the step and the persisted
    // descent context so upper→ground descent keeps the lip blend after handoff.
    const surfaceFloorBeforeStep = activeFloorId;
    const blockedBy = options.includeDiagnostics ? new Set<string>() : null;
    let movedX = false;
    let movedZ = false;

    if (stepX !== 0) {
      const candidateX = player.position.x + stepX;
      const predictedFloor = predictFloorId(
        candidateX,
        player.position.z,
        activeFloorId
      );
      if (canOccupyPosition(candidateX, player.position.z, predictedFloor)) {
        player.position.x = candidateX;
        setActiveFloorId(predictedFloor);
        movedX = true;
      } else if (blockedBy) {
        getBlockingNamesAt(
          candidateX,
          player.position.z,
          predictedFloor
        ).forEach((name) => blockedBy.add(name));
      }
    }

    if (stepZ !== 0) {
      const candidateZ = player.position.z + stepZ;
      const predictedFloor = predictFloorId(
        player.position.x,
        candidateZ,
        activeFloorId
      );
      if (canOccupyPosition(player.position.x, candidateZ, predictedFloor)) {
        player.position.z = candidateZ;
        setActiveFloorId(predictedFloor);
        movedZ = true;
      } else if (blockedBy) {
        getBlockingNamesAt(
          player.position.x,
          candidateZ,
          predictedFloor
        ).forEach((name) => blockedBy.add(name));
      }
    }

    const usingUpperDescentBlend =
      (surfaceFloorBeforeStep === 'upper' || upperDescentBlendActive) &&
      activeFloorId === 'ground' &&
      classifyStairTransitionZone(
        stairGeometry,
        stairBehavior,
        player.position.x,
        player.position.z,
        'upper'
      ) === 'explicitDescentCorridor';
    upperDescentBlendActive = usingUpperDescentBlend;

    updatePlayerVerticalPosition(surfaceFloorBeforeStep);

    const blockingNames = blockedBy ? Array.from(blockedBy) : [];
    return {
      movedX,
      movedZ,
      activeFloor: activeFloorId,
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      ...(blockingNames.length > 0 ? { blockedBy: blockingNames } : {}),
    };
  };

  updatePlayerVerticalPosition();
  document.documentElement.dataset.activeFloor = activeFloorId;

  const createDebugColliderRegistrations = (
    colliders: readonly RectCollider[],
    options: {
      floor: DebugColliderRegistration['floor'];
      category: string;
      namePrefix: string;
      elevation?: number;
    }
  ): DebugColliderRegistration[] =>
    colliders.map((bounds, index) => {
      const sourceMetadata = colliderSourceMetadata.get(bounds);
      return {
        floor: options.floor,
        category: options.category,
        name:
          namedColliderDebugNames.get(bounds) ??
          `${options.namePrefix}-${index + 1}`,
        bounds,
        elevation: options.elevation,
        sourceId: sourceMetadata?.sourceId,
        sourceType: sourceMetadata?.sourceType,
        purpose: sourceMetadata?.purpose,
        role: sourceMetadata?.role,
        intent: sourceMetadata?.intent,
        debugId: sourceMetadata?.debugId,
      };
    });

  const colliderVisualizer = createColliderVisualizer({
    activeFloorId,
    enabled: debugCollidersEnabled,
  });
  colliderVisualizer.setIdsEnabled(debugColliderIdsEnabled);
  colliderVisualizer.register([
    ...createDebugColliderRegistrations(groundColliders, {
      floor: 'ground',
      category: 'ground',
      namePrefix: 'ground-collider',
    }),
    ...createDebugColliderRegistrations(staticColliders, {
      floor: 'ground',
      category: 'static',
      namePrefix: 'static-collider',
    }),
    ...createDebugColliderRegistrations(upperFloorColliders, {
      floor: 'upper',
      category: 'upper',
      namePrefix: 'upper-collider',
      elevation: upperFloorElevation,
    }),
  ]);
  scene.add(colliderVisualizer.group);

  const solidVisualizer = createSolidVisualizer({
    enabled: debugSolidIdsEnabled,
  });
  let solidVisualizerRegistered = false;
  const ensureSolidVisualizerRegistered = () => {
    if (solidVisualizerRegistered) {
      return;
    }
    solidVisualizer.register(
      scene,
      new Set(colliderVisualizer.getColliders().map((collider) => collider.id))
    );
    solidVisualizerRegistered = true;
  };
  if (debugSolidIdsEnabled) {
    ensureSolidVisualizerRegistered();
  }
  scene.add(solidVisualizer.group);

  const containsRectPoint = (
    rect: { minX: number; maxX: number; minZ: number; maxZ: number },
    x: number,
    z: number
  ): boolean =>
    x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;

  const getCurrentRoomId = (): string | null => {
    const plan = activeFloorId === 'upper' ? UPPER_FLOOR_PLAN : FLOOR_PLAN;
    const room = plan.rooms.find(({ bounds }) =>
      containsRectPoint(bounds, player.position.x, player.position.z)
    );
    return room?.id ?? null;
  };

  const getDebugCoordinatesState = () => {
    const x = Number(player.position.x.toFixed(2));
    const y = Number(player.position.y.toFixed(2));
    const z = Number(player.position.z.toFixed(2));
    const stairZone = classifyStairTransitionZone(
      stairGeometry,
      stairBehavior,
      player.position.x,
      player.position.z,
      activeFloorId
    );
    const insideStairNavArea = Object.values(stairNavigationZones).some(
      (zone) => containsRectPoint(zone, player.position.x, player.position.z)
    );

    return {
      enabled: debugCoordinatesEnabled,
      x,
      y,
      z,
      activeFloorId,
      predictedStairFloorId: predictFloorId(
        player.position.x,
        player.position.z,
        activeFloorId
      ),
      cameraZoom: Number(camera.zoom.toFixed(2)),
      insideStairWidth: isWithinStairWidth(stairGeometry, player.position.x),
      insideLanding: isWithinLanding(
        stairGeometry,
        player.position.x,
        player.position.z
      ),
      insideStairNavArea,
      stairZone,
      currentRoomId: getCurrentRoomId(),
    };
  };

  const formatDebugBoolean = (value: boolean): string =>
    value
      ? debugCoordinatesStrings.values.yes
      : debugCoordinatesStrings.values.no;

  type DebugCoordinatesRowId =
    | 'position'
    | 'activeFloor'
    | 'predictedFloor'
    | 'cameraZoom'
    | 'stairWidth'
    | 'landing'
    | 'stairNav'
    | 'stairZone'
    | 'room';

  const debugCoordinatesRows = new Map<
    DebugCoordinatesRowId,
    { term: HTMLElement; detail: HTMLElement }
  >();
  const debugCoordinatesRowOrder: DebugCoordinatesRowId[] = [
    'position',
    'activeFloor',
    'predictedFloor',
    'cameraZoom',
    'stairWidth',
    'landing',
    'stairNav',
    'stairZone',
    'room',
  ];

  const updateDebugCoordinatesLabels = () => {
    if (!debugCoordinatesHeading) {
      return;
    }
    debugCoordinatesHeading.textContent = debugCoordinatesStrings.overlayLabel;
    for (const rowId of debugCoordinatesRowOrder) {
      const row = debugCoordinatesRows.get(rowId);
      if (row) {
        row.term.textContent = debugCoordinatesStrings.labels[rowId];
      }
    }
  };

  const createDebugCoordinatesOverlayContent = () => {
    if (!debugCoordinatesOverlay || debugCoordinatesHeading) {
      return;
    }
    debugCoordinatesHeading = document.createElement('div');
    debugCoordinatesHeading.className = 'debug-coordinates__heading';

    const list = document.createElement('dl');
    list.className = 'debug-coordinates__list';

    for (const rowId of debugCoordinatesRowOrder) {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      debugCoordinatesRows.set(rowId, { term, detail });
      list.append(term, detail);
    }

    debugCoordinatesOverlay.append(debugCoordinatesHeading, list);
    updateDebugCoordinatesLabels();
  };

  const syncDebugCoordinatesOverlayVisibility = () => {
    if (!debugCoordinatesOverlay) {
      return;
    }
    debugCoordinatesOverlay.hidden = !debugCoordinatesEnabled;
    debugCoordinatesOverlay.setAttribute(
      'aria-hidden',
      debugCoordinatesEnabled ? 'false' : 'true'
    );
  };

  const setDebugCoordinatesRowValue = (
    rowId: DebugCoordinatesRowId,
    value: string
  ) => {
    const detail = debugCoordinatesRows.get(rowId)?.detail;
    if (detail) {
      detail.textContent = value;
    }
  };

  const updateDebugCoordinatesOverlay = () => {
    if (!debugCoordinatesOverlay || !debugCoordinatesEnabled) {
      return;
    }
    createDebugCoordinatesOverlayContent();

    const state = getDebugCoordinatesState();
    setDebugCoordinatesRowValue(
      'position',
      `${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)}`
    );
    setDebugCoordinatesRowValue('activeFloor', state.activeFloorId);
    setDebugCoordinatesRowValue('predictedFloor', state.predictedStairFloorId);
    setDebugCoordinatesRowValue('cameraZoom', state.cameraZoom.toFixed(2));
    setDebugCoordinatesRowValue(
      'stairWidth',
      formatDebugBoolean(state.insideStairWidth)
    );
    setDebugCoordinatesRowValue(
      'landing',
      formatDebugBoolean(state.insideLanding)
    );
    setDebugCoordinatesRowValue(
      'stairNav',
      formatDebugBoolean(state.insideStairNavArea)
    );
    setDebugCoordinatesRowValue('stairZone', state.stairZone);
    setDebugCoordinatesRowValue(
      'room',
      state.currentRoomId ?? debugCoordinatesStrings.values.none
    );
  };

  const refreshDebugCoordinatesControl = () => {
    if (!debugCoordinatesControl) {
      return;
    }
    const label = debugCoordinatesEnabled
      ? debugCoordinatesStrings.labelEnabled
      : debugCoordinatesStrings.labelDisabled;
    const description = debugCoordinatesEnabled
      ? debugCoordinatesStrings.descriptionEnabled
      : debugCoordinatesStrings.descriptionDisabled;
    debugCoordinatesControl.textContent = label;
    debugCoordinatesControl.dataset.state = debugCoordinatesEnabled
      ? 'enabled'
      : 'disabled';
    debugCoordinatesControl.setAttribute(
      'aria-pressed',
      debugCoordinatesEnabled ? 'true' : 'false'
    );
    debugCoordinatesControl.setAttribute('aria-label', description);
    debugCoordinatesControl.title = description;
    debugCoordinatesControl.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const refreshDebugCollidersControl = () => {
    if (!debugCollidersControl) {
      return;
    }
    const label = debugCollidersEnabled
      ? debugCollidersStrings.labelEnabled
      : debugCollidersStrings.labelDisabled;
    const description = debugCollidersEnabled
      ? debugCollidersStrings.descriptionEnabled
      : debugCollidersStrings.descriptionDisabled;
    debugCollidersControl.textContent = label;
    debugCollidersControl.dataset.state = debugCollidersEnabled
      ? 'enabled'
      : 'disabled';
    debugCollidersControl.setAttribute(
      'aria-pressed',
      debugCollidersEnabled ? 'true' : 'false'
    );
    debugCollidersControl.setAttribute('aria-label', description);
    debugCollidersControl.title = description;
    debugCollidersControl.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const refreshDebugColliderIdsControl = () => {
    if (!debugColliderIdsControl) {
      return;
    }
    const effectiveEnabled = debugCollidersEnabled && debugColliderIdsEnabled;
    const label = debugColliderIdsEnabled
      ? debugCollidersStrings.idsLabelEnabled
      : debugCollidersStrings.idsLabelDisabled;
    const description = debugColliderIdsEnabled
      ? debugCollidersStrings.idsDescriptionEnabled
      : debugCollidersStrings.idsDescriptionDisabled;
    debugColliderIdsControl.textContent = label;
    debugColliderIdsControl.disabled = !debugCollidersEnabled;
    debugColliderIdsControl.dataset.state = effectiveEnabled
      ? 'enabled'
      : 'disabled';
    debugColliderIdsControl.setAttribute(
      'aria-pressed',
      effectiveEnabled ? 'true' : 'false'
    );
    debugColliderIdsControl.setAttribute('aria-label', description);
    debugColliderIdsControl.title = description;
    debugColliderIdsControl.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const refreshDebugFpsControl = () => {
    if (!debugFpsControl) {
      return;
    }
    const label = debugFpsEnabled
      ? debugCollidersStrings.fpsLabelEnabled
      : debugCollidersStrings.fpsLabelDisabled;
    const description = debugFpsEnabled
      ? debugCollidersStrings.fpsDescriptionEnabled
      : debugCollidersStrings.fpsDescriptionDisabled;
    debugFpsControl.textContent = label;
    debugFpsControl.dataset.state = debugFpsEnabled ? 'enabled' : 'disabled';
    debugFpsControl.setAttribute(
      'aria-pressed',
      debugFpsEnabled ? 'true' : 'false'
    );
    debugFpsControl.setAttribute('aria-label', description);
    debugFpsControl.title = description;
    debugFpsControl.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const refreshDebugSolidIdsControl = () => {
    if (!debugSolidIdsControl) {
      return;
    }
    const label = debugSolidIdsEnabled
      ? debugCollidersStrings.solidIdsLabelEnabled
      : debugCollidersStrings.solidIdsLabelDisabled;
    const description = debugSolidIdsEnabled
      ? debugCollidersStrings.solidIdsDescriptionEnabled
      : debugCollidersStrings.solidIdsDescriptionDisabled;
    debugSolidIdsControl.textContent = label;
    debugSolidIdsControl.dataset.state = debugSolidIdsEnabled
      ? 'enabled'
      : 'disabled';
    debugSolidIdsControl.setAttribute(
      'aria-pressed',
      debugSolidIdsEnabled ? 'true' : 'false'
    );
    debugSolidIdsControl.setAttribute('aria-label', description);
    debugSolidIdsControl.title = description;
    debugSolidIdsControl.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const setDebugCollidersEnabled = (
    enabled: boolean,
    options: { persist?: boolean } = { persist: true }
  ) => {
    debugCollidersEnabled = enabled;
    colliderVisualizer.setEnabled(enabled);
    refreshDebugCollidersControl();
    refreshDebugColliderIdsControl();
    if (options.persist !== false && debugCoordinatesStorage) {
      try {
        debugCoordinatesStorage.setItem(
          DEBUG_COLLIDERS_STORAGE_KEY,
          enabled ? '1' : '0'
        );
      } catch (error) {
        console.warn('Failed to persist debug collider preference.', error);
      }
    }
  };

  const setDebugColliderIdsEnabled = (
    enabled: boolean,
    options: { persist?: boolean } = { persist: true }
  ) => {
    debugColliderIdsEnabled = enabled;
    colliderVisualizer.setIdsEnabled(enabled);
    refreshDebugColliderIdsControl();
    if (options.persist !== false && debugCoordinatesStorage) {
      try {
        debugCoordinatesStorage.setItem(
          DEBUG_COLLIDER_IDS_STORAGE_KEY,
          enabled ? '1' : '0'
        );
      } catch (error) {
        console.warn('Failed to persist debug collider ID preference.', error);
      }
    }
  };

  const setDebugFpsEnabled = (
    enabled: boolean,
    options: { persist?: boolean } = { persist: true }
  ) => {
    debugFpsEnabled = enabled;
    debugPerformanceOverlay.setFpsEnabled(enabled);
    refreshDebugFpsControl();
    if (options.persist !== false && debugCoordinatesStorage) {
      try {
        debugCoordinatesStorage.setItem(
          DEBUG_FPS_STORAGE_KEY,
          enabled ? '1' : '0'
        );
      } catch (error) {
        console.warn('Failed to persist debug FPS counter preference.', error);
      }
    }
  };

  const setDebugSolidIdsEnabled = (
    enabled: boolean,
    options: { persist?: boolean } = { persist: true }
  ) => {
    debugSolidIdsEnabled = enabled;
    if (enabled) {
      ensureSolidVisualizerRegistered();
    }
    solidVisualizer.setEnabled(enabled);
    refreshDebugSolidIdsControl();
    if (options.persist !== false && debugCoordinatesStorage) {
      try {
        debugCoordinatesStorage.setItem(
          DEBUG_SOLID_IDS_STORAGE_KEY,
          enabled ? '1' : '0'
        );
      } catch (error) {
        console.warn('Failed to persist debug solid ID preference.', error);
      }
    }
  };

  const setDebugCoordinatesEnabled = (
    enabled: boolean,
    options: { persist?: boolean } = { persist: true }
  ) => {
    debugCoordinatesEnabled = enabled;
    syncDebugCoordinatesOverlayVisibility();
    refreshDebugCoordinatesControl();
    poiTooltipOverlay.setDebugDetailsEnabled(enabled);
    if (enabled) {
      updateDebugCoordinatesOverlay();
    }
    if (options.persist !== false && debugCoordinatesStorage) {
      try {
        debugCoordinatesStorage.setItem(
          DEBUG_COORDINATES_STORAGE_KEY,
          enabled ? '1' : '0'
        );
      } catch (error) {
        console.warn('Failed to persist debug coordinates preference.', error);
      }
    }
  };

  const refreshDebugCoordinatesStrings = () => {
    refreshDebugCoordinatesControl();
    updateDebugCoordinatesLabels();
    updateDebugCoordinatesOverlay();
  };

  const refreshDebugCollidersStrings = () => {
    refreshDebugCollidersControl();
    refreshDebugColliderIdsControl();
    refreshDebugSolidIdsControl();
    refreshDebugFpsControl();
  };

  poiTooltipOverlay.setDebugDetailsEnabled(debugCoordinatesEnabled);

  debugCoordinatesOverlay = document.createElement('aside');
  debugCoordinatesOverlay.className = 'debug-coordinates';
  syncDebugCoordinatesOverlayVisibility();
  document.body.appendChild(debugCoordinatesOverlay);
  createDebugCoordinatesOverlayContent();

  debugCoordinatesControl = document.createElement('button');
  debugCoordinatesControl.type = 'button';
  debugCoordinatesControl.className = 'tour-toggle debug-coordinates-toggle';
  debugCoordinatesControl.addEventListener('click', () => {
    setDebugCoordinatesEnabled(!debugCoordinatesEnabled);
  });
  hudSettingsStack.appendChild(debugCoordinatesControl);
  registerHudControlElement(debugCoordinatesControl);
  refreshDebugCoordinatesControl();

  debugCollidersControl = document.createElement('button');
  debugCollidersControl.type = 'button';
  debugCollidersControl.className = 'tour-toggle debug-colliders-toggle';
  debugCollidersControl.addEventListener('click', () => {
    setDebugCollidersEnabled(!debugCollidersEnabled);
  });
  hudSettingsStack.appendChild(debugCollidersControl);
  registerHudControlElement(debugCollidersControl);
  refreshDebugCollidersControl();

  debugColliderIdsControl = document.createElement('button');
  debugColliderIdsControl.type = 'button';
  debugColliderIdsControl.className = 'tour-toggle debug-collider-ids-toggle';
  debugColliderIdsControl.addEventListener('click', () => {
    setDebugColliderIdsEnabled(!debugColliderIdsEnabled);
  });
  hudSettingsStack.appendChild(debugColliderIdsControl);
  registerHudControlElement(debugColliderIdsControl);
  refreshDebugColliderIdsControl();

  debugSolidIdsControl = document.createElement('button');
  debugSolidIdsControl.type = 'button';
  debugSolidIdsControl.className = 'tour-toggle debug-solid-ids-toggle';
  debugSolidIdsControl.addEventListener('click', () => {
    setDebugSolidIdsEnabled(!debugSolidIdsEnabled);
  });
  hudSettingsStack.appendChild(debugSolidIdsControl);
  registerHudControlElement(debugSolidIdsControl);
  refreshDebugSolidIdsControl();

  debugFpsControl = document.createElement('button');
  debugFpsControl.type = 'button';
  debugFpsControl.className = 'tour-toggle debug-fps-toggle';
  debugFpsControl.addEventListener('click', () => {
    setDebugFpsEnabled(!debugFpsEnabled);
  });
  hudSettingsStack.appendChild(debugFpsControl);
  registerHudControlElement(debugFpsControl);
  refreshDebugFpsControl();
  updateDebugCoordinatesOverlay();
  debugCoordinatesInterval = window.setInterval(
    updateDebugCoordinatesOverlay,
    250
  );

  const getBlockingDebugCollidersAt = (target: {
    x: number;
    z: number;
    floorId?: FloorId;
  }): DebugColliderMetadata[] => {
    const floorId =
      target.floorId ?? predictFloorId(target.x, target.z, activeFloorId);

    return colliderVisualizer
      .getColliders()
      .filter(
        (collider) =>
          (collider.floor === floorId || collider.floor === 'all') &&
          collidesWithColliders(target.x, target.z, PLAYER_RADIUS, [
            collider.bounds,
          ])
      );
  };

  setPortfolioSection('debugColliders', {
    getState: () => colliderVisualizer.getState(),
    setEnabled: (enabled: boolean) => {
      setDebugCollidersEnabled(enabled);
    },
    setIdsEnabled: (enabled: boolean) => {
      setDebugColliderIdsEnabled(enabled);
    },
    getColliders: () => colliderVisualizer.getColliders(),
    getBlockingCollidersAt: getBlockingDebugCollidersAt,
    getColliderById: (id: unknown) => colliderVisualizer.getColliderById(id),
    getColliderBySourceId: (sourceId: unknown) =>
      colliderVisualizer.getColliderBySourceId(sourceId),
    getCollidersBySourceId: (sourceId: unknown) =>
      colliderVisualizer.getCollidersBySourceId(sourceId),
  });

  setPortfolioSection('debugSolids', {
    getState: () => solidVisualizer.getState(),
    setEnabled: (enabled: boolean) => {
      setDebugSolidIdsEnabled(enabled);
    },
    getSolids: () => {
      ensureSolidVisualizerRegistered();
      return solidVisualizer.getSolids();
    },
    getSolidById: (id: unknown) => {
      ensureSolidVisualizerRegistered();
      return solidVisualizer.getSolidById(id);
    },
    getSolidBySourceId: (sourceId: unknown) => {
      ensureSolidVisualizerRegistered();
      return solidVisualizer.getSolidBySourceId(sourceId);
    },
    getSolidsBySourceId: (sourceId: unknown) => {
      ensureSolidVisualizerRegistered();
      return solidVisualizer.getSolidsBySourceId(sourceId);
    },
  });

  setPortfolioSection('debugPerformance', {
    getState: () => debugPerformanceOverlay.getState(),
    setFpsEnabled: (enabled: boolean) => {
      setDebugFpsEnabled(enabled);
    },
    getLowFpsRecoveryState: () =>
      lowFpsRecoveryMonitor?.getState() ?? {
        averageFps: 0,
        elapsedMs: 0,
        frameCount: 0,
        visible: false,
        cooldownRemainingMs: 0,
      },
    forceLowFpsRecoveryPopup: () => lowFpsRecoveryMonitor?.forceTrigger(),
    recordLowFpsRecoveryFrame: (deltaSeconds: number, nowMs?: number) => {
      lowFpsRecoveryMonitor?.recordFrame(deltaSeconds, nowMs);
    },
    dismissLowFpsRecoveryPopup: (nowMs?: number) => {
      lowFpsRecoveryMonitor?.dismiss(nowMs);
      if (lowFpsRecoveryPopup) {
        lowFpsRecoveryPopup.hidden = true;
      }
    },
  });

  setPortfolioSection('debugCoordinates', {
    getState: getDebugCoordinatesState,
    setEnabled: (enabled: boolean) => {
      setDebugCoordinatesEnabled(enabled);
    },
  });

  const setCameraZoomTarget = (next: number) => {
    cameraZoomTarget = MathUtils.clamp(next, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
    tutorialController.recordZoomProgress({
      currentZoom: cameraZoom,
      currentZoomTarget: cameraZoomTarget,
      minZoom: MIN_CAMERA_ZOOM,
      maxZoom: MAX_CAMERA_ZOOM,
    });
  };

  const updateCameraPanLimits = (aspect: number) => {
    const effectiveHalfWidth = (baseCameraSize * aspect) / cameraZoom;
    const effectiveHalfHeight = baseCameraSize / cameraZoom;
    cameraPanLimitX = Math.max(0, effectiveHalfWidth - PLAYER_RADIUS);
    cameraPanLimitZ = Math.max(0, effectiveHalfHeight - PLAYER_RADIUS);
    cameraPanTarget.x = MathUtils.clamp(
      cameraPanTarget.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPanTarget.z = MathUtils.clamp(
      cameraPanTarget.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );
    cameraPan.x = MathUtils.clamp(
      cameraPan.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPan.z = MathUtils.clamp(
      cameraPan.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );
  };

  const updateCameraProjection = (aspect: number) => {
    camera.left = -baseCameraSize * aspect;
    camera.right = baseCameraSize * aspect;
    camera.top = baseCameraSize;
    camera.bottom = -baseCameraSize;
    camera.zoom = cameraZoom;
    camera.updateProjectionMatrix();
    updateCameraPanLimits(aspect);
    resetMotionBlurHistory?.();
  };

  const getPinchDistance = () => {
    const points = Array.from(pinchPointers.values());
    if (points.length < 2) {
      return 0;
    }
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  updateCameraProjection(aspect);

  const handleKeyboardZoom = (event: KeyboardEvent) => {
    const activePanel = hudPanelCoordinator?.getActivePanel() ?? null;
    if (!canHandleGameplayShortcut(event, activePanel)) {
      return;
    }
    const direction = getKeyboardZoomDirection(event);
    if (direction === null) {
      return;
    }
    event.preventDefault();
    setCameraZoomTarget(
      applyCameraZoomStep({
        currentZoomTarget: cameraZoomTarget,
        direction,
        source: 'keyboard',
        minZoom: MIN_CAMERA_ZOOM,
        maxZoom: MAX_CAMERA_ZOOM,
      })
    );
  };

  const handleWheelZoom = (event: WheelEvent) => {
    event.preventDefault();
    setCameraZoomTarget(
      applyWheelCameraZoomStep({
        currentZoomTarget: cameraZoomTarget,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        viewportHeight: window.innerHeight,
        minZoom: MIN_CAMERA_ZOOM,
        maxZoom: MAX_CAMERA_ZOOM,
      })
    );
  };

  const handlePointerDownForZoom = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (pinchPointers.size >= 2 && !pinchPointers.has(event.pointerId)) {
      return;
    }
    pinchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pinchPointers.size === 2) {
      pinchStartDistance = getPinchDistance();
      pinchStartZoomTarget = cameraZoomTarget;
    }
  };

  const handlePointerMoveForZoom = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (!pinchPointers.has(event.pointerId)) {
      return;
    }
    pinchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pinchPointers.size < 2) {
      return;
    }
    const distance = getPinchDistance();
    if (!isFinite(distance) || distance <= 0) {
      return;
    }
    if (pinchStartDistance === null || pinchStartDistance <= 0) {
      pinchStartDistance = distance;
      pinchStartZoomTarget = cameraZoomTarget;
      return;
    }
    setCameraZoomTarget(
      applyPinchCameraZoom({
        startZoomTarget: pinchStartZoomTarget,
        startDistance: pinchStartDistance,
        currentDistance: distance,
        minZoom: MIN_CAMERA_ZOOM,
        maxZoom: MAX_CAMERA_ZOOM,
      })
    );
  };

  const handlePointerEndForZoom = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (!pinchPointers.has(event.pointerId)) {
      return;
    }
    pinchPointers.delete(event.pointerId);
    if (pinchPointers.size < 2) {
      pinchStartDistance = null;
      pinchStartZoomTarget = cameraZoomTarget;
      return;
    }
    pinchStartDistance = getPinchDistance();
    pinchStartZoomTarget = cameraZoomTarget;
  };

  const updateMouseCameraInput = (clientX: number, clientY: number) => {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;
    const dx = clientX - mouseCameraStart.x;
    const dy = clientY - mouseCameraStart.y;
    mouseCameraInput.set(
      halfWidth <= 0 ? 0 : MathUtils.clamp(dx / halfWidth, -1, 1),
      halfHeight <= 0 ? 0 : MathUtils.clamp(dy / halfHeight, -1, 1)
    );
  };

  let mouseCameraDragging = false;

  const handlePointerDownForCameraPan = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }
    renderer.domElement.setPointerCapture?.(event.pointerId);
    mouseCameraPointerId = event.pointerId;
    mouseCameraStart.set(event.clientX, event.clientY);
    mouseCameraInput.set(0, 0);
    mouseCameraDragging = false;
  };

  const handlePointerMoveForCameraPan = (event: PointerEvent) => {
    if (
      event.pointerType !== 'mouse' ||
      event.pointerId !== mouseCameraPointerId
    ) {
      return;
    }
    if (!mouseCameraDragging) {
      const deltaX = event.clientX - mouseCameraStart.x;
      const deltaY = event.clientY - mouseCameraStart.y;
      if (deltaX === 0 && deltaY === 0) {
        return;
      }
      mouseCameraDragging = true;
    }
    event.preventDefault();
    updateMouseCameraInput(event.clientX, event.clientY);
  };

  const handlePointerUpForCameraPan = (event: PointerEvent) => {
    if (
      event.pointerType !== 'mouse' ||
      event.pointerId !== mouseCameraPointerId
    ) {
      return;
    }
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    mouseCameraPointerId = null;
    mouseCameraInput.set(0, 0);
    mouseCameraDragging = false;
  };

  window.addEventListener('keydown', handleKeyboardZoom);
  renderer.domElement.addEventListener('wheel', handleWheelZoom, {
    passive: false,
  });
  renderer.domElement.addEventListener('pointerdown', handlePointerDownForZoom);
  renderer.domElement.addEventListener(
    'pointerdown',
    handlePointerDownForCameraPan
  );
  window.addEventListener('pointermove', handlePointerMoveForZoom);
  window.addEventListener('pointerup', handlePointerEndForZoom);
  window.addEventListener('pointercancel', handlePointerEndForZoom);
  window.addEventListener('pointermove', handlePointerMoveForCameraPan);
  window.addEventListener('pointerup', handlePointerUpForCameraPan);
  window.addEventListener('pointercancel', handlePointerUpForCameraPan);

  audioSubtitles = createAudioSubtitles({
    container: document.body,
    labels: audioSubtitleStrings.labels,
    dismissLabels: audioSubtitleStrings.dismissLabels,
  });

  if (!ambientAudioController) {
    const audioBeds: AmbientAudioBedDefinition[] = [];
    const audioContext: AudioContext = audioListener.context;

    const createLoopingSource = (
      id: string,
      bufferFactory: (context: AudioContext) => AudioBuffer
    ): AmbientAudioSource => {
      const audio = new Audio(audioListener);
      audio.setLoop(true);
      audio.setVolume(0);
      const buffer = bufferFactory(audioContext);
      audio.setBuffer(buffer);
      return {
        id,
        get isPlaying() {
          return audio.isPlaying;
        },
        play: () => {
          if (!audio.isPlaying) {
            audio.play();
          }
        },
        stop: () => {
          if (audio.isPlaying) {
            audio.stop();
          }
        },
        setVolume: (volume: number) => {
          audio.setVolume(volume);
        },
      };
    };

    const homeHalfExtent = Math.max(
      (floorBounds.maxX - floorBounds.minX) / 2,
      (floorBounds.maxZ - floorBounds.minZ) / 2
    );
    audioBeds.push({
      id: 'interior-hum',
      center: {
        x: (floorBounds.minX + floorBounds.maxX) / 2,
        z: (floorBounds.minZ + floorBounds.maxZ) / 2,
      },
      innerRadius: homeHalfExtent * 0.55,
      outerRadius: homeHalfExtent * 1.2,
      baseVolume: 0.32,
      falloffCurve: 'smoothstep',
      caption: 'Interior hum wraps the home shell with a calm pulse.',
      source: createLoopingSource('interior-hum', (context) =>
        createDistantHumBuffer(context)
      ),
    });

    if (backyardRoom) {
      const bounds = backyardRoom.bounds;
      const backyardHalfExtent = Math.max(
        (bounds.maxX - bounds.minX) / 2,
        (bounds.maxZ - bounds.minZ) / 2
      );
      audioBeds.push({
        id: 'backyard-crickets',
        center: {
          x: (bounds.minX + bounds.maxX) / 2,
          z: (bounds.minZ + bounds.maxZ) / 2,
        },
        innerRadius: backyardHalfExtent * 0.6,
        outerRadius: backyardHalfExtent + toWorldUnits(6),
        baseVolume: 0.65,
        falloffCurve: 'smoothstep',
        caption: 'Backyard crickets swell into a dusk chorus beyond the fence.',
        source: createLoopingSource('backyard-crickets', (context) =>
          createCricketChorusBuffer(context)
        ),
      });

      if (backyardEnvironment) {
        backyardEnvironment.ambientAudioBeds.forEach((bed) => {
          const descriptor = getBackyardAmbientBedDescriptor(bed);
          if (!descriptor) {
            return;
          }
          audioBeds.push({
            ...bed,
            caption: descriptor.caption,
            captionPriority: descriptor.captionPriority,
            captionThreshold: descriptor.captionThreshold,
            source: createLoopingSource(bed.id, descriptor.bufferFactory),
          });
        });
      }
    }

    ambientAudioController = new AmbientAudioController(audioBeds, {
      smoothing: 3.2,
      onEnable: async () => {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      },
    });

    if (!ambientAudioPreference) {
      ambientAudioPreference = new AmbientAudioPreference({
        storage: ambientAudioStorage ?? null,
        windowTarget: window,
      });
    }
    if (ambientAudioPreferenceBinding) {
      ambientAudioPreferenceBinding.dispose();
      ambientAudioPreferenceBinding = null;
    }
    ambientAudioPreferenceBinding = bindAmbientAudioPreference({
      controller: {
        enable: () => setGlobalAudioEnabled(true, 'storage'),
        disable: () => {
          void setGlobalAudioEnabled(false, 'storage');
        },
        isEnabled: () => ambientAudioController?.isEnabled() ?? false,
      },
      preference: ambientAudioPreference,
      windowTarget: window,
      logger: console,
    });
    if (!ambientAudioPreference.isEnabled()) {
      hardDisableRuntimeAudio();
    }

    if (!ambientCaptionBridge && audioSubtitles) {
      ambientCaptionBridge = new AmbientCaptionBridge({
        controller: ambientAudioController,
        subtitles: {
          show: (message) => audioSubtitles?.show(message),
          clear: (messageId) => audioSubtitles?.clear(messageId),
          dismissAll: () => audioSubtitles?.dismissAll(),
          dispose: () => audioSubtitles?.dispose(),
          getCurrent: () => audioSubtitles?.getCurrent() ?? null,
          getQueueLength: () => audioSubtitles?.getQueueLength() ?? 0,
          isVisible: () => audioSubtitles?.isVisible() ?? false,
          getDismissCount: () => audioSubtitles?.getDismissCount() ?? 0,
          getLastDismissedAt: () =>
            audioSubtitles?.getLastDismissedAt() ?? null,
          setLabels: (options) => audioSubtitles?.setLabels(options),
        },
      });
    }

    audioHudHandle = createAudioHudControl({
      container: hudSettingsStack,
      getEnabled: () => ambientAudioController?.isEnabled() ?? false,
      setEnabled: async (enabled) => {
        try {
          await setGlobalAudioEnabled(enabled, 'control');
        } catch (error) {
          console.warn('Ambient audio failed to start', error);
        }
      },
      getVolume: () => getAmbientAudioVolume(),
      setVolume: (volume) => {
        setAmbientAudioVolume(volume);
      },
      strings: audioHudStrings,
    });
    registerHudControlElement(audioHudHandle?.element);

    manualModeToggle = createManualModeToggle({
      container: hudSettingsStack,
      strings: modeToggleStrings,
      getIsFallbackActive: () => performanceFailover.hasTriggered(),
      onToggle: activateTextMode,
    });
    registerHudControlElement(manualModeToggle?.element ?? null);
  }

  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let motionBlurController: MotionBlurController | null = null;

  hudLayoutManager = createHudLayoutManager({
    root: document.documentElement,
    windowTarget: window,
    onLayoutChange: (layout) => {
      responsiveControlOverlay?.setLayout(layout);
    },
  });
  if (hudLayoutManager) {
    const initialHudLayout = hudLayoutManager.getLayout();
    responsiveControlOverlay?.setLayout(initialHudLayout);
  }

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  if (LIGHTING_OPTIONS.enableBloom) {
    bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      LIGHTING_OPTIONS.bloomStrength,
      LIGHTING_OPTIONS.bloomRadius,
      LIGHTING_OPTIONS.bloomThreshold
    );
    composer.addPass(bloomPass);
  }

  motionBlurController = createMotionBlurController({ intensity: 0 });
  resetMotionBlurHistory = () => motionBlurController?.resetHistory();
  composer.addPass(motionBlurController.pass);

  graphicsQualityManager = createGraphicsQualityManager({
    renderer,
    bloomPass: bloomPass ?? undefined,
    ledStripMaterials,
    ledFillLights: ledFillLightsList,
    basePixelRatio,
    initialLevel: effectiveInitialQualityLevel,
    preferInitialLevel:
      rendererInfo.isSoftwareRenderer || sceneDetailReloadOverride !== null,
    baseBloom: {
      strength: LIGHTING_OPTIONS.bloomStrength,
      radius: LIGHTING_OPTIONS.bloomRadius,
      threshold: LIGHTING_OPTIONS.bloomThreshold,
    },
    baseLed: {
      emissiveIntensity: LIGHTING_OPTIONS.ledEmissiveIntensity,
      lightIntensity: LIGHTING_OPTIONS.ledLightIntensity,
    },
    storage: qualityStorage,
  });
  ledAnimator?.captureBaseline();
  environmentLightAnimator?.captureBaseline();

  // Runtime low-FPS recovery is intentionally user-directed via the
  // LowFpsRecoveryMonitor popup. Do not instantiate adaptive quality here;
  // startup heuristics may pick an initial level, but runtime low FPS must not
  // silently downgrade quality, reduce DPR, reload the scene, or switch modes.

  let accessibilityStorage: Storage | undefined;
  try {
    accessibilityStorage = window.localStorage;
  } catch {
    accessibilityStorage = undefined;
  }

  accessibilityPresetManager = createAccessibilityPresetManager({
    documentElement: document.documentElement,
    graphicsQualityManager,
    bloomPass: bloomPass ?? undefined,
    ledStripMaterials,
    ledFillLights: ledFillLightsList,
    ambientAudioController: ambientAudioController ?? undefined,
    motionBlurController: motionBlurController ?? undefined,
    storage: accessibilityStorage,
  });

  ledAnimator?.captureBaseline();
  environmentLightAnimator?.captureBaseline();

  if (accessibilityPresetManager) {
    getAmbientAudioVolume = () =>
      accessibilityPresetManager?.getBaseAudioVolume() ??
      ambientAudioController?.getMasterVolume() ??
      1;
    setAmbientAudioVolume = (volume: number) => {
      if (accessibilityPresetManager) {
        accessibilityPresetManager.setBaseAudioVolume(volume);
      } else {
        ambientAudioController?.setMasterVolume(volume);
      }
    };
    accessibilityPresetManager.refresh();
    ledAnimator?.captureBaseline();
    environmentLightAnimator?.captureBaseline();
    audioHudHandle?.refresh();
  }

  motionBlurControl = createMotionBlurControl({
    container: hudSettingsStack,
    getIntensity: () =>
      accessibilityPresetManager?.getBaseMotionBlurIntensity() ??
      motionBlurController?.getIntensity() ??
      0,
    strings: getMotionBlurControlCopy(getLocaleStrings(locale).hud),
    setIntensity: (intensity) => {
      if (accessibilityPresetManager) {
        accessibilityPresetManager.setBaseMotionBlurIntensity(intensity);
        return;
      }
      const clamped = Math.min(Math.max(intensity, 0), 1);
      motionBlurController?.setIntensity(clamped);
      document.documentElement.dataset.accessibilityMotionBlur =
        String(clamped);
    },
  });
  if (manualModeToggle) {
    hudSettingsStack.insertBefore(
      motionBlurControl.element,
      manualModeToggle.element
    );
  }

  const ensureGraphicsApi = () => {
    setPortfolioSection('graphics', {
      getLevel() {
        return graphicsQualityManager?.getLevel() ?? 'balanced';
      },
      setLevel(level: string) {
        if (
          level === 'cinematic' ||
          level === 'balanced' ||
          level === 'performance'
        ) {
          graphicsQualityManager?.setLevel(level, { source: 'user' });
        }
      },
      getMotionBlurIntensity() {
        return motionBlurController?.getIntensity() ?? 0;
      },
      setMotionBlurIntensity(intensity: number) {
        const clamped = MathUtils.clamp(
          Number.isFinite(intensity) ? intensity : 0,
          0,
          1
        );
        if (accessibilityPresetManager) {
          accessibilityPresetManager.setBaseMotionBlurIntensity(clamped);
          motionBlurControl?.refresh();
          return;
        }
        motionBlurController?.setIntensity(clamped);
        document.documentElement.dataset.accessibilityMotionBlur =
          String(clamped);
        motionBlurControl?.refresh();
      },
      getMotionBlurState() {
        const historyState = motionBlurController?.getHistoryState();
        return {
          enabled: motionBlurController?.pass.enabled ?? false,
          damp: motionBlurController?.pass.uniforms.damp.value ?? 0,
          intensity: motionBlurController?.getIntensity() ?? 0,
          pendingHistoryReset: historyState?.pendingReset ?? false,
          historyResetRequestCount: historyState?.resetRequestCount ?? 0,
          lastHistoryResetDamp: historyState?.lastResetDamp ?? null,
        };
      },
      resetMotionBlurHistory() {
        motionBlurController?.resetHistory();
      },
      getCameraZoom() {
        return cameraZoom;
      },
      getCameraZoomTarget() {
        return cameraZoomTarget;
      },
      getInitialCameraFraming() {
        return initialCameraFraming ? { ...initialCameraFraming } : undefined;
      },
      setCameraPanForTest(input: { x: number; y: number }) {
        const x = MathUtils.clamp(
          Number.isFinite(input.x) ? input.x : 0,
          -1,
          1
        );
        const y = MathUtils.clamp(
          Number.isFinite(input.y) ? input.y : 0,
          -1,
          1
        );
        mouseCameraPointerId =
          Math.abs(x) > 1e-3 || Math.abs(y) > 1e-3 ? -1 : null;
        mouseCameraInput.set(x, y);
      },
    });
  };
  ensureGraphicsApi();

  accessibilityControlHandle = createAccessibilityPresetControl({
    container: hudSettingsStack,
    options: ACCESSIBILITY_PRESETS.map(({ id }) => ({
      id,
      ...accessibilityPresetStrings.options[id],
    })),
    strings: {
      title: accessibilityPresetStrings.title,
      description: accessibilityPresetStrings.description,
      options: ACCESSIBILITY_PRESETS.map(({ id }) => ({
        id,
        ...accessibilityPresetStrings.options[id],
      })),
      selectedAnnouncementTemplate:
        accessibilityPresetStrings.selectedAnnouncementTemplate,
    },
    getActivePreset: () =>
      accessibilityPresetManager?.getPreset() ?? ACCESSIBILITY_PRESETS[0].id,
    setActivePreset: (preset) => {
      accessibilityPresetManager?.setPreset(preset);
    },
  });
  registerHudControlElement(accessibilityControlHandle?.element ?? null);

  unsubscribeAccessibility = accessibilityPresetManager.onChange(() => {
    accessibilityControlHandle?.refresh();
    audioHudHandle?.refresh();
    motionBlurControl?.refresh();
    ledAnimator?.captureBaseline();
    environmentLightAnimator?.captureBaseline();
  });

  graphicsQualityControl = createGraphicsQualityControl({
    container: hudSettingsStack,
    presets: GRAPHICS_QUALITY_PRESETS.map(({ id }) => ({
      id,
      ...graphicsQualityStrings.options[id],
    })),
    strings: {
      title: graphicsQualityStrings.title,
      description: graphicsQualityStrings.description,
      options: GRAPHICS_QUALITY_PRESETS.map(({ id }) => ({
        id,
        ...graphicsQualityStrings.options[id],
      })),
      selectedAnnouncementTemplate:
        graphicsQualityStrings.selectedAnnouncementTemplate,
    },
    getActiveLevel: () =>
      graphicsQualityManager?.getLevel() ?? GRAPHICS_QUALITY_PRESETS[0].id,
    setActiveLevel: (level) => {
      graphicsQualityManager?.setLevel(level);
    },
  });
  registerHudControlElement(graphicsQualityControl?.element ?? null);
  applySettingsControlOrder({
    container: hudSettingsStack,
    graphicsQuality: graphicsQualityControl?.element ?? null,
    customization: hudCustomizationSection?.element ?? null,
  });

  let pendingLowFpsPerformanceRecoveryReload = false;

  const applyFeaturePolicy = (
    options: {
      reloadScene?: boolean;
      adaptivePerformanceRecoveryLocked?: boolean;
    } = {}
  ) => {
    const policy = getQualityFeaturePolicy(
      graphicsQualityManager?.getLevel() ?? initialQualityPolicy.initialLevel,
      rendererInfo.isSoftwareRenderer
    );
    selfieMirror?.setRenderPolicy({
      enabled: policy.mirrorEnabled,
      updateRateFps: policy.mirrorUpdateRateFps,
      renderTargetSize: policy.mirrorTargetSize,
    });
    const level = graphicsQualityManager?.getLevel() ?? initialSceneDetailLevel;
    return applySceneDetailLevel(level, {
      reloadScene: options.reloadScene ?? false,
      adaptivePerformanceRecoveryLocked:
        options.adaptivePerformanceRecoveryLocked === true,
    });
  };

  const getActivePostprocessingPassCount = () => {
    let count = 0;
    if (bloomPass?.enabled) {
      count += 1;
    }
    if (motionBlurController?.pass.enabled) {
      count += 1;
    }
    return count;
  };

  const shouldUseComposer = () =>
    !softwareRendererPolicy.safeMode && getActivePostprocessingPassCount() > 0;

  unsubscribeGraphicsQuality = graphicsQualityManager.onChange((level) => {
    const previousSceneDetailLevel = sceneDetailController.getLevel();
    const reloadScene = previousSceneDetailLevel !== level;
    const adaptivePerformanceRecoveryLocked =
      pendingLowFpsPerformanceRecoveryReload && level === 'performance';
    pendingLowFpsPerformanceRecoveryReload = false;
    const didScheduleSceneReload = applyFeaturePolicy({
      reloadScene,
      adaptivePerformanceRecoveryLocked,
    });
    if (didScheduleSceneReload) {
      return;
    }
    composer?.setSize(window.innerWidth, window.innerHeight);
    bloomPass?.setSize(window.innerWidth, window.innerHeight);
    graphicsQualityControl?.refresh();
    ledAnimator?.captureBaseline();
    environmentLightAnimator?.captureBaseline();
  });
  applyFeaturePolicy();

  const crashLogAccess: PerformanceCrashBreadcrumbApi = {
    exportCrashLog: () => crashBreadcrumbs.exportCrashLog(),
    copyCrashLog: () => crashBreadcrumbs.copyCrashLog(),
    recordSnapshot: (snapshot) => crashBreadcrumbs.recordSnapshot(snapshot),
  };

  performanceDiagnostics = createPerformanceDiagnostics({
    rendererInfo,
    getRendererSize: () => ({
      pixelRatio: renderer.getPixelRatio(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      drawingBuffer: {
        width: renderer.getContext().drawingBufferWidth,
        height: renderer.getContext().drawingBufferHeight,
      },
    }),
    getQualityState: () => ({
      level: graphicsQualityManager!.getLevel(),
      selectionSource: graphicsQualityManager!.getSelectionSource(),
      adaptiveDowngradeCount: 0,
      adaptiveRecoveryCount: 0,
      lastAdaptiveReason: null,
      lastAdaptiveDowngradeReason: null,
      lastAdaptiveRecoveryReason: null,
      adaptivePolicy: null,
      sceneDetail: sceneDetailController.getSnapshot(),
    }),
    getFeatureState: () => {
      const mirrorState = selfieMirror?.getRenderState();
      return {
        bloomEnabled: bloomPass?.enabled === true,
        composerEnabled: shouldUseComposer(),
        activePostprocessingPassCount: getActivePostprocessingPassCount(),
        mirrorEnabled: mirrorState?.enabled ?? false,
        mirrorRenderTargetSize: mirrorState?.renderTargetSize ?? 0,
        mirrorUpdateRateFps: mirrorState?.updateRateFps ?? 0,
        mirrorRenderCount: mirrorState?.renderCount ?? 0,
      };
    },
    getLastFailoverReason: () => lastFailoverReason,
    getSoftwareRendererPolicy: () => softwareRendererPolicy,
    getRendererCounters: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      lines: renderer.info.render.lines,
      memoryGeometries: renderer.info.memory.geometries,
      memoryTextures: renderer.info.memory.textures,
    }),
    exportCrashLog: crashLogAccess.exportCrashLog,
    copyCrashLog: crashLogAccess.copyCrashLog,
    recordSnapshot: crashLogAccess.recordSnapshot,
  });
  setPortfolioSection('performance', performanceDiagnostics.methods);

  const lightingDebugController = createLightingDebugController({
    renderer,
    ambientLight,
    hemisphericLight,
    directionalLight,
    bloomPass,
    ledGroup: ledStripGroup,
    ledFillLights: ledFillLightGroup,
    debug: {
      exposure: 0.92,
      ambientIntensity: 0.55,
      hemisphericIntensity: 0.38,
      directionalIntensity: 0.35,
      ledVisible: false,
      bloomEnabled: false,
    },
  });

  lightingDebugController.setMode('cinematic');

  const lightingDebugIndicator = document.createElement('div');
  lightingDebugIndicator.className = 'lighting-debug-indicator';
  lightingDebugIndicator.hidden = true;
  container.appendChild(lightingDebugIndicator);

  const updateLightingIndicator = (mode: LightingMode) => {
    const label = mode === 'cinematic' ? 'Cinematic' : 'Debug (flat)';
    lightingDebugIndicator.textContent = `Lighting: ${label} · Shift+L to toggle`;
    lightingDebugIndicator.setAttribute('data-mode', mode);
    lightingDebugIndicator.hidden = mode === 'cinematic';
    if (mode === 'cinematic') {
      environmentLightAnimator?.captureBaseline();
    } else {
      // Reset seasonal tinting so the debug preview always shows neutral lighting.
      environmentLightAnimator?.applyBaselineColors();
    }
  };

  updateLightingIndicator(lightingDebugController.getMode());

  window.addEventListener('keydown', (event) => {
    if ((event.key === 'l' || event.key === 'L') && event.shiftKey) {
      event.preventDefault();
      const nextMode = lightingDebugController.toggle();
      updateLightingIndicator(nextMode);
    }
  });

  function onResize() {
    const nextAspect = window.innerWidth / window.innerHeight;
    updateCameraProjection(nextAspect);

    renderer.setSize(window.innerWidth, window.innerHeight);
    basePixelRatio = resolveResizedBasePixelRatio(
      window.devicePixelRatio ?? 1,
      maxPolicyPixelRatioCap,
      adaptivePixelRatioCap
    );
    if (graphicsQualityManager) {
      graphicsQualityManager.setBasePixelRatio(basePixelRatio);
    } else {
      renderer.setPixelRatio(basePixelRatio);
    }

    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (bloomPass) {
      bloomPass.setSize(window.innerWidth, window.innerHeight);
    }
  }

  window.addEventListener('resize', onResize);
  onResize();

  function updateMovement(delta: number) {
    const yawBefore = player.rotation.y;
    const rightInput =
      Number(keyBindings.isActionActive('moveRight', keyPressSource)) -
      Number(keyBindings.isActionActive('moveLeft', keyPressSource));
    const forwardInput =
      Number(keyBindings.isActionActive('moveForward', keyPressSource)) -
      Number(keyBindings.isActionActive('moveBackward', keyPressSource));

    const joystickMovement = joystick.getMovement();
    const combinedRight = rightInput + joystickMovement.x;
    const combinedForward = forwardInput - joystickMovement.y;

    const planarInputLengthSq =
      combinedRight * combinedRight + combinedForward * combinedForward;

    getCameraRelativeMovementVector(
      camera,
      combinedRight,
      combinedForward,
      moveDirection
    );

    const lengthSq = moveDirection.lengthSq();
    if (lengthSq > 1) {
      moveDirection.multiplyScalar(1 / Math.sqrt(lengthSq));
    }

    targetVelocity.copy(moveDirection).multiplyScalar(PLAYER_SPEED);

    velocity.set(
      MathUtils.damp(velocity.x, targetVelocity.x, MOVEMENT_SMOOTHING, delta),
      0,
      MathUtils.damp(velocity.z, targetVelocity.z, MOVEMENT_SMOOTHING, delta)
    );

    const planarVelocityLengthSq =
      velocity.x * velocity.x + velocity.z * velocity.z;
    const hasPlanarInput = planarInputLengthSq > 1e-6;

    if (hasPlanarInput) {
      mannequinRelativeYawTarget = normalizeRadians(
        computeCameraRelativeYaw(camera, moveDirection)
      );
    } else if (planarVelocityLengthSq > 1e-6) {
      mannequinRelativeYawTarget = normalizeRadians(
        computeCameraRelativeYaw(camera, velocity)
      );
    }

    const stepX = velocity.x * delta;
    const stepZ = velocity.z * delta;

    if (stepX !== 0 || stepZ !== 0) {
      const movementStep = applyPlayerMovementStep(stepX, stepZ);
      const moved = movementStep.movedX || movementStep.movedZ;
      tutorialController.recordMovementProgress({
        forward: Math.max(0, combinedForward),
        left: Math.max(0, -combinedRight),
        backward: Math.max(0, -combinedForward),
        right: Math.max(0, combinedRight),
        deltaSeconds: delta,
        moved,
      });
      if (stepX !== 0 && !movementStep.movedX) {
        targetVelocity.x = 0;
        velocity.x = 0;
      }
      if (stepZ !== 0 && !movementStep.movedZ) {
        targetVelocity.z = 0;
        velocity.z = 0;
      }
    }

    // Update facing: aim toward current planar velocity when moving.
    const speedSq = velocity.x * velocity.x + velocity.z * velocity.z;
    if (speedSq > 1e-6 && !hasPlanarInput) {
      mannequinRelativeYawTarget = normalizeRadians(
        computeCameraRelativeYaw(camera, velocity)
      );
    }
    mannequinRelativeYaw = dampYawTowards(
      mannequinRelativeYaw,
      mannequinRelativeYawTarget,
      MANNEQUIN_YAW_SMOOTHING,
      delta
    );
    // Convert the camera-relative yaw to a world-facing orientation for the visible model.
    const facingDirection = getCameraRelativeDirection(
      camera,
      mannequinRelativeYaw,
      mannequinFacingDirection
    );
    player.rotation.y = computeModelYawFromVector(facingDirection);

    const yawAfter = player.rotation.y;
    if (Number.isFinite(delta) && delta > 1e-6) {
      const yawDelta = angularDifference(yawBefore, yawAfter);
      const angularVelocity = yawDelta / delta;
      locomotionAngularSpeed = Number.isFinite(angularVelocity)
        ? angularVelocity
        : 0;
    } else {
      locomotionAngularSpeed = 0;
    }
    const planarSpeed = Math.sqrt(
      velocity.x * velocity.x + velocity.z * velocity.z
    );
    locomotionLinearSpeed = Number.isFinite(planarSpeed) ? planarSpeed : 0;
  }

  function updateCamera(delta: number) {
    const previousZoom = cameraZoom;
    cameraZoom = MathUtils.damp(
      cameraZoom,
      cameraZoomTarget,
      CAMERA_ZOOM_SMOOTHING,
      delta
    );
    cameraZoom = MathUtils.clamp(cameraZoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
    if (!Number.isFinite(cameraZoom)) {
      cameraZoom = previousZoom;
    }
    tutorialController.recordZoomProgress({
      currentZoom: cameraZoom,
      currentZoomTarget: cameraZoomTarget,
      minZoom: MIN_CAMERA_ZOOM,
      maxZoom: MAX_CAMERA_ZOOM,
    });
    if (Math.abs(cameraZoom - previousZoom) > 1e-4) {
      updateCameraProjection(window.innerWidth / window.innerHeight);
    }

    const cameraInput =
      mouseCameraPointerId !== null ? mouseCameraInput : joystick.getCamera();
    cameraPanTarget.set(
      cameraInput.x * cameraPanLimitX,
      0,
      cameraInput.y * cameraPanLimitZ
    );
    const cameraPanInputActive =
      Math.abs(cameraInput.x) > 1e-3 || Math.abs(cameraInput.y) > 1e-3;
    if (cameraPanInputActive !== wasCameraPanInputActive) {
      resetMotionBlurHistory?.();
      wasCameraPanInputActive = cameraPanInputActive;
    }

    cameraPan.x = MathUtils.damp(
      cameraPan.x,
      cameraPanTarget.x,
      CAMERA_PAN_SMOOTHING,
      delta
    );
    cameraPan.z = MathUtils.damp(
      cameraPan.z,
      cameraPanTarget.z,
      CAMERA_PAN_SMOOTHING,
      delta
    );

    cameraPan.x = MathUtils.clamp(
      cameraPan.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPan.z = MathUtils.clamp(
      cameraPan.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );

    cameraCenter.set(
      player.position.x + cameraPan.x,
      player.position.y + cameraFocusOffsetY,
      player.position.z + cameraPan.z
    );

    camera.position.set(
      cameraCenter.x + cameraBaseOffset.x,
      cameraCenter.y + cameraBaseOffset.y,
      cameraCenter.z + cameraBaseOffset.z
    );
    camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);
  }

  const POI_ACTIVATION_RESPONSE = 5.5;

  function updatePois(elapsedTime: number, delta: number) {
    const smoothing =
      delta > 0 ? 1 - Math.exp(-delta * POI_ACTIVATION_RESPONSE) : 1;
    let closestPoi: PoiInstance | null = null;
    let highestActivation = 0;
    let highestEmphasis = 0;
    const worldTooltipState = poiWorldTooltip.getState();
    const worldTooltipVisible = worldTooltipState.visible;

    for (const poi of poiInstances) {
      if (!floorVisibilityController.applyPoiVisualState(poi)) {
        poi.activation = 0;
        poi.focus = 0;
        poi.focusTarget = 0;
        continue;
      }

      const floatOffset = Math.sin(
        elapsedTime * poi.floatSpeed + poi.floatPhase
      );
      const scaledOffset = floatOffset * poi.floatAmplitude;

      if (poi.orb && poi.orbBaseHeight !== undefined) {
        poi.orb.position.y = poi.orbBaseHeight + scaledOffset;
      }

      if (poi.label && poi.labelBaseHeight !== undefined) {
        poi.label.position.y = poi.labelBaseHeight + scaledOffset * 0.4;
        poi.label.getWorldPosition(poi.labelWorldPosition);
        poiLabelLookTarget.set(
          camera.position.x,
          poi.labelWorldPosition.y,
          camera.position.z
        );
        poi.label.lookAt(poiLabelLookTarget);
      }

      const interactionAnchor = getPoiInteractionAnchorPosition(poi.definition);
      poiPlayerOffset.set(
        player.position.x - interactionAnchor.x,
        player.position.z - interactionAnchor.z
      );
      const planarDistance = poiPlayerOffset.length();
      const maxRadius = poi.definition.interactionRadius;
      const targetActivation = MathUtils.clamp(
        1 - planarDistance / maxRadius,
        0,
        1
      );
      const visitedTarget = poi.visited ? 1 : 0;
      poi.activation = MathUtils.lerp(
        poi.activation,
        targetActivation,
        smoothing
      );
      poi.visitedStrength = MathUtils.lerp(
        poi.visitedStrength,
        visitedTarget,
        smoothing
      );
      poi.focus = MathUtils.lerp(poi.focus, poi.focusTarget, smoothing);
      const emphasis = computePoiEmphasis(poi.activation, poi.focus);
      const visitedEmphasis = poi.visitedStrength;

      if (poi.activation > highestActivation) {
        highestActivation = poi.activation;
        closestPoi = poi;
      }

      if (emphasis > highestEmphasis) {
        highestEmphasis = emphasis;
      }

      if (poi.label && poi.labelMaterial) {
        const labelOpacity = worldTooltipVisible
          ? 0
          : computePoiLabelOpacity(emphasis, visitedEmphasis);
        poi.labelMaterial.opacity = labelOpacity;
        poi.label.visible = labelOpacity > 0.05;
      }

      if (poi.displayHighlight) {
        const {
          mesh,
          material,
          baseOpacity,
          focusOpacity,
          baseScale,
          focusScale,
        } = poi.displayHighlight;
        const visitedOpacityBoost = MathUtils.lerp(0, 0.25, visitedEmphasis);
        const nextOpacity = MathUtils.lerp(baseOpacity, focusOpacity, emphasis);
        const combinedOpacity = Math.min(nextOpacity + visitedOpacityBoost, 1);
        material.opacity = combinedOpacity;
        mesh.visible = combinedOpacity > 0.02;
        if (baseScale !== undefined && focusScale !== undefined && mesh.scale) {
          const nextScale = MathUtils.lerp(baseScale, focusScale, emphasis);
          mesh.scale.setScalar(nextScale);
        }
      }

      if (poi.visitedHighlight) {
        const visitedOpacity = MathUtils.lerp(0, 0.55, visitedEmphasis);
        poi.visitedHighlight.material.opacity = visitedOpacity;
        poi.visitedHighlight.mesh.visible = visitedOpacity > 0.02;
        const visitedScale = 1 + visitedEmphasis * 0.12;
        poi.visitedHighlight.mesh.scale.setScalar(visitedScale);
      }

      if (poi.visitedBadge) {
        updateVisitedBadge(poi.visitedBadge, {
          elapsedTime,
          delta,
          visitedEmphasis,
          floatPhase: poi.floatPhase,
        });
      }

      if (!poi.displayHighlight) {
        if (
          poi.orbMaterial &&
          poi.orbEmissiveBase &&
          poi.orbEmissiveHighlight
        ) {
          const baseIntensity = MathUtils.lerp(0.85, 1.05, visitedEmphasis);
          const orbEmissive = MathUtils.lerp(baseIntensity, 1.7, emphasis);
          poi.orbMaterial.emissiveIntensity = orbEmissive;
          poi.orbMaterial.emissive.lerpColors(
            poi.orbEmissiveBase,
            poi.orbEmissiveHighlight,
            poi.focus
          );
        }

        if (poi.accentMaterial && poi.accentBaseColor && poi.accentFocusColor) {
          const baseAccent = MathUtils.lerp(0.65, 0.82, visitedEmphasis);
          const accentEmissive = MathUtils.lerp(baseAccent, 1.05, emphasis);
          poi.accentMaterial.emissiveIntensity = accentEmissive;
          poi.accentMaterial.color.lerpColors(
            poi.accentBaseColor,
            poi.accentFocusColor,
            poi.focus
          );
        }

        if (
          poi.halo &&
          poi.haloMaterial &&
          poi.haloBaseColor &&
          poi.haloFocusColor
        ) {
          const haloPulse =
            1 + Math.sin(elapsedTime * 1.8 + poi.pulseOffset) * 0.08;
          const baseHaloScale = MathUtils.lerp(1, 1.05, visitedEmphasis);
          const haloScale =
            MathUtils.lerp(baseHaloScale, 1.18, emphasis) * haloPulse;
          poi.halo.scale.setScalar(haloScale);
          const haloOpacity = computePoiHaloOpacity(emphasis, visitedEmphasis);
          poi.haloMaterial.opacity = haloOpacity;
          poi.halo.visible = haloOpacity > 0.04;
          poi.haloMaterial.color.lerpColors(
            poi.haloBaseColor,
            poi.haloFocusColor,
            poi.focus
          );
        }
      }
    }
    analyticsGlow.setTargetEmphasis(highestEmphasis);
    if (closestPoi && highestActivation >= 0.6) {
      setInteractablePoi(closestPoi);
    } else {
      setInteractablePoi(null);
    }
  }

  function refreshInteractablePoiPrompt() {
    if (movementLegend) {
      movementLegend.setInteractPrompt(
        interactablePoi?.definition.interactionPrompt ?? null
      );
    }
    if (!interactControl || !interactDescription) {
      return;
    }
    if (interactablePoi) {
      interactControl.hidden = false;
      interactDescription.textContent =
        interactablePoi.definition.interactionPrompt;
    } else {
      interactControl.hidden = true;
      interactDescription.textContent = interactDescriptionFallback;
    }
  }

  function setInteractablePoi(poi: PoiInstance | null) {
    if (interactablePoi === poi) {
      return;
    }
    interactablePoi = poi;
    refreshInteractablePoiPrompt();
  }

  function handleInteractionInput() {
    const pressed = keyBindings.isActionActive('interact', keyPressSource);
    if (pressed && !interactKeyWasPressed && interactablePoi) {
      poiInteractionManager?.selectPoiById(interactablePoi.definition.id);
    }
    interactKeyWasPressed = pressed;
  }

  function handleHelpInput() {
    const pressed = keyBindings.isActionActive('help', keyPressSource);
    if (immersiveDisposed) {
      helpKeyWasPressed = pressed;
      return;
    }
    if (pressed && !helpKeyWasPressed) {
      toggleHelpMenu();
    }
    helpKeyWasPressed = pressed;
  }

  function disposeDebugPerformanceRegistration() {
    debugPerformanceOverlay.dispose();
    if (window.portfolio?.debugPerformance) {
      clearPortfolioSection('debugPerformance');
    }
  }

  function disposeImmersiveResources() {
    if (immersiveDisposed) {
      return;
    }
    immersiveLifecycle = 'disposing';
    if (inputLatencyTelemetry) {
      inputLatencyTelemetry.report('dispose');
      inputLatencyTelemetry.dispose();
      inputLatencyTelemetry = null;
    }
    softwareSafeRenderEvents.forEach((eventName) => {
      window.removeEventListener(eventName, requestSoftwareSafeRender);
    });
    softwareRendererWarning?.dispose();
    softwareRendererWarning = null;
    lowFpsRecoveryMonitor?.reset();
    lowFpsRecoveryPopup?.remove();
    lowFpsRecoveryPopup = null;
    immersiveDisposed = true;
    ledAnimator = null;
    lightmapAnimator = null;
    environmentLightAnimator = null;
    if (removePoiInteractionAnimation) {
      removePoiInteractionAnimation();
      removePoiInteractionAnimation = null;
    }
    if (avatarInteractionAnimator) {
      avatarInteractionAnimator.dispose();
      avatarInteractionAnimator = null;
    }
    if (avatarFootIkController) {
      avatarFootIkController.dispose();
      avatarFootIkController = null;
    }
    document.removeEventListener('keydown', handlePoiDetailEscape, {
      capture: true,
    });
    poiInteractionManager?.dispose();
    poiInteractionManager = null;
    removeHoverListener();
    removeSelectionStateListener();
    removeSelectionListener();
    removeVisitedSubscription();
    interactionTimeline.dispose();
    poiTooltipOverlay.dispose();
    poiWorldTooltip.dispose();
    githubRepoMetrics?.dispose();
    githubRepoMetrics = null;
    if (manualModeToggle) {
      manualModeToggle.dispose();
      manualModeToggle = null;
    }
    if (ambientAudioPreferenceBinding) {
      ambientAudioPreferenceBinding.dispose();
      ambientAudioPreferenceBinding = null;
    }
    if (ambientAudioController) {
      ambientAudioController.dispose();
      ambientAudioController = null;
    }
    if (footstepAudioController) {
      footstepAudioController.dispose();
      footstepAudioController = null;
    }
    renderer.domElement.removeEventListener('wheel', handleWheelZoom);
    renderer.domElement.removeEventListener(
      'pointerdown',
      handlePointerDownForZoom
    );
    renderer.domElement.removeEventListener(
      'pointerdown',
      handlePointerDownForCameraPan
    );
    window.removeEventListener('pointermove', handlePointerMoveForZoom);
    window.removeEventListener('pointerup', handlePointerEndForZoom);
    window.removeEventListener('pointercancel', handlePointerEndForZoom);
    window.removeEventListener('pointermove', handlePointerMoveForCameraPan);
    window.removeEventListener('pointerup', handlePointerUpForCameraPan);
    window.removeEventListener('pointercancel', handlePointerUpForCameraPan);
    if (audioHudHandle) {
      audioHudHandle.dispose();
      audioHudHandle = null;
    }
    if (motionBlurControl) {
      motionBlurControl.dispose();
      motionBlurControl = null;
    }
    if (footstepAudio) {
      if (footstepAudio.isPlaying) {
        footstepAudio.stop();
      }
      footstepAudio.parent?.remove(footstepAudio);
      footstepAudio = null;
    }
    if (hudCustomizationSection) {
      hudCustomizationSection.dispose();
      hudCustomizationSection = null;
    }
    ambientCaptionBridge = null;
    if (audioSubtitles) {
      audioSubtitles.dispose();
      audioSubtitles = null;
    }
    if (hudLayoutManager) {
      hudLayoutManager.dispose();
      hudLayoutManager = null;
    }
    window.removeEventListener('keydown', handleHudPanelKeydown);
    window.removeEventListener('keydown', handleControlsKeydown);
    window.removeEventListener('keydown', handleKeyboardZoom);
    if (hudPanelCoordinator) {
      hudPanelCoordinator.dispose();
      hudPanelCoordinator = null;
      document.documentElement.removeAttribute('data-hud-controls-open');
      document.documentElement.removeAttribute('data-hud-tutorial-open');
      document.documentElement.removeAttribute('data-active-hud-panel');
      document.documentElement.removeAttribute('data-poi-detail-visible');
    }
    tutorialPanel.dispose();
    if (responsiveControlOverlay) {
      responsiveControlOverlay.dispose();
      responsiveControlOverlay = null;
    }
    if (accessibilityControlHandle) {
      accessibilityControlHandle.dispose();
      accessibilityControlHandle = null;
    }
    if (unsubscribeAccessibility) {
      unsubscribeAccessibility();
      unsubscribeAccessibility = null;
    }
    if (accessibilityPresetManager) {
      accessibilityPresetManager.dispose();
      accessibilityPresetManager = null;
    }
    if (unsubscribeAvatarVariant) {
      unsubscribeAvatarVariant();
      unsubscribeAvatarVariant = null;
    }
    if (unsubscribeAvatarAccessories) {
      unsubscribeAvatarAccessories();
      unsubscribeAvatarAccessories = null;
    }
    if (avatarAssetPipeline) {
      avatarAssetPipeline.dispose();
      avatarAssetPipeline = null;
    }
    avatarVariantManager = null;
    avatarAccessoryManager = null;
    if (avatarAccessorySuite) {
      avatarAccessorySuite.dispose();
      avatarAccessorySuite = null;
    }
    if (graphicsQualityControl) {
      graphicsQualityControl.dispose();
      graphicsQualityControl = null;
    }
    if (unsubscribeGraphicsQuality) {
      unsubscribeGraphicsQuality();
      unsubscribeGraphicsQuality = null;
    }
    graphicsQualityManager = null;
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
    while (keyBindingUnsubscribes.length > 0) {
      const unsubscribe = keyBindingUnsubscribes.pop();
      unsubscribe?.();
    }
    clearPortfolioInputKeyBindings();
    if (window.portfolio?.avatar) {
      clearPortfolioSection('avatar');
    }
    if (window.portfolio?.poi) {
      clearPortfolioSection('poi');
    }
    if (window.portfolio?.graphics) {
      clearPortfolioSection('graphics');
    }
    if (window.portfolio?.githubMetrics) {
      clearPortfolioSection('githubMetrics');
    }
    if (window.portfolio?.audio) {
      clearPortfolioSection('audio');
    }
    if (window.portfolio?.debugColliders) {
      clearPortfolioSection('debugColliders');
    }
    if (window.portfolio?.debugSolids) {
      clearPortfolioSection('debugSolids');
    }
    if (window.portfolio?.debugCoordinates) {
      clearPortfolioSection('debugCoordinates');
    }
    disposeDebugPerformanceRegistration();
    if (window.portfolio?.performance) {
      setPortfolioSection('performance', crashLogAccess);
    }
    if (localeToggleControl) {
      localeToggleControl.dispose();
      localeToggleControl = null;
    }
    if (debugCoordinatesInterval !== null) {
      window.clearInterval(debugCoordinatesInterval);
      debugCoordinatesInterval = null;
    }
    if (debugCoordinatesControl) {
      debugCoordinatesControl.remove();
      debugCoordinatesControl = null;
    }
    if (debugCollidersControl) {
      debugCollidersControl.remove();
      debugCollidersControl = null;
    }
    if (debugColliderIdsControl) {
      debugColliderIdsControl.remove();
      debugColliderIdsControl = null;
    }
    if (debugSolidIdsControl) {
      debugSolidIdsControl.remove();
      debugSolidIdsControl = null;
    }
    if (debugFpsControl) {
      debugFpsControl.remove();
      debugFpsControl = null;
    }
    if (debugCoordinatesOverlay) {
      debugCoordinatesOverlay.remove();
      debugCoordinatesOverlay = null;
      debugCoordinatesHeading = null;
      debugCoordinatesRows.clear();
    }
    colliderVisualizer.dispose();
    solidVisualizer.dispose();
    movementLegend?.dispose();
    if (helpModalController) {
      helpModalController.dispose();
      helpModalController = null;
    }
    analyticsGlow.dispose();
    helpModal.dispose();
    if (hudFocusAnnouncer) {
      hudFocusAnnouncer.dispose();
      hudFocusAnnouncer = null;
    }
    if (locomotionAnimator) {
      locomotionAnimator.dispose();
      locomotionAnimator = null;
      locomotionLinearSpeed = 0;
      locomotionAngularSpeed = 0;
    }
    controls.dispose();
    if (livingRoomMediaWall) {
      livingRoomMediaWall.controller.dispose();
      mediaWallStarBridge.detach();
      livingRoomMediaWall = null;
    }
    if (selfieMirror) {
      selfieMirror.dispose();
      selfieMirror = null;
    }
    if (wallPaintings) {
      wallPaintings.dispose();
      wallPaintings = null;
    }
    if (flywheelShowpiece) {
      flywheelShowpiece.dispose();
      flywheelShowpiece = null;
    }
    f2ClipboardConsole = null;
    sigmaWorkbench = null;
    woveLoom = null;
    jobbotTerminal = null;
    axelNavigator = null;
    if (tokenPlaceWorkstation) {
      tokenPlaceWorkstation.dispose();
      tokenPlaceWorkstation = null;
    }
    disposePortfolioMiniatureTableBuild();
    sugarkubeDeployment = null;
    clearPoiModelRoots();
    clearPoiVisualAnchors();
    disposePrReaperInstallationBuild();
    gabrielSentry = null;
    gitshelvesInstallation = null;
    immersiveLifecycle = 'disposed';
  }

  const softwareSafeRenderIntervalMs = softwareRendererPolicy.renderCadenceFps
    ? 1000 / softwareRendererPolicy.renderCadenceFps
    : 0;
  let hasPresentedFirstFrame = false;
  let lastSoftwareSafeRenderMs = 0;
  let lastCrashBreadcrumbSnapshotMs = 0;
  softwareSafeRenderEvents.forEach((eventName) => {
    window.addEventListener(eventName, requestSoftwareSafeRender, {
      passive: true,
    });
  });
  immersiveLifecycle = 'ready';

  renderer.setAnimationLoop(() => {
    try {
      const frameStartMs = performance.now();
      const cadenceDecision = resolveSoftwareSafeRenderCadence({
        safeMode: softwareRendererPolicy.safeMode,
        hasPresentedFirstFrame,
        renderRequested: softwareSafeRenderRequested,
        lastRenderMs: lastSoftwareSafeRenderMs,
        nowMs: frameStartMs,
        renderIntervalMs: softwareSafeRenderIntervalMs,
      });
      if (!cadenceDecision.shouldRender) {
        return;
      }
      debugPerformanceOverlay.begin();
      softwareSafeRenderRequested = cadenceDecision.renderRequested;
      lastSoftwareSafeRenderMs = cadenceDecision.lastRenderMs;
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;
      performanceDiagnostics?.recordFrame(delta);
      if (
        performanceDiagnostics &&
        frameStartMs - lastCrashBreadcrumbSnapshotMs >= 1000
      ) {
        lastCrashBreadcrumbSnapshotMs = frameStartMs;
        crashBreadcrumbs.recordSnapshot(
          performanceDiagnostics.methods.getSnapshot()
        );
      }
      performanceFailover.update(delta);
      lowFpsRecoveryMonitor?.recordFrame(delta, frameStartMs);
      if (performanceFailover.hasTriggered()) {
        debugPerformanceOverlay.end();
        return;
      }
      let phaseStart = performance.now();
      updateMovement(delta);
      if (locomotionAnimator) {
        locomotionAnimator.update({
          delta,
          linearSpeed: locomotionLinearSpeed,
          angularSpeed: locomotionAngularSpeed,
        });
      }
      if (avatarFootIkController) {
        avatarFootIkController.update({
          delta,
          sampleHeight({ x, y }) {
            return sampleStairSurfaceHeight({
              geometry: stairGeometry,
              behavior: stairBehavior,
              x,
              z: y,
              currentFloor: getVerticalSurfaceFloor(activeFloorId),
              upperFloorElevation,
            });
          },
        });
      }
      if (footstepAudioController) {
        footstepAudioController.update({
          delta,
          linearSpeed: locomotionLinearSpeed,
          masterVolume: getAmbientAudioVolume(),
        });
      }
      updateCamera(delta);
      performanceDiagnostics?.recordPhase(
        'inputMovementCamera',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (selfieMirror) {
        selfieMirror.update({
          playerPosition: player.position,
          playerRotationY: player.rotation.y,
          playerHeight: mannequinHeight,
        });
      }
      performanceDiagnostics?.recordPhase(
        'mirror',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      poiWorldTooltip.update(delta);
      updatePois(elapsedTime, delta);
      analyticsGlow.update(delta);
      handleInteractionInput();
      handleHelpInput();
      performanceDiagnostics?.recordPhase(
        'poiHudTooltips',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (avatarAccessorySuite) {
        avatarAccessorySuite.update({ elapsed: elapsedTime, delta });
      }
      if (ambientAudioController) {
        ambientAudioController.update(player.position, delta, {
          elapsed: elapsedTime,
        });
        ambientCaptionBridge?.update();
      }
      performanceDiagnostics?.recordPhase(
        'avatarIkAudio',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (livingRoomMediaWall) {
        const activation = futuroptimistPoi?.activation ?? 0;
        const focus = futuroptimistPoi?.focus ?? 0;
        if (
          sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            Math.max(activation, focus),
            'media-wall'
          )
        ) {
          livingRoomMediaWall.controller.update({
            elapsed: elapsedTime,
            delta,
            emphasis: Math.max(activation, focus),
          });
        }
      }
      if (flywheelShowpiece) {
        const activation = flywheelPoi?.activation ?? 0;
        const focus = flywheelPoi?.focus ?? 0;
        const emphasis = Math.max(activation, focus);
        flywheelShowpiece.update({
          elapsed: elapsedTime,
          delta,
          emphasis,
          runDecorativeEffects: sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            emphasis,
            'flywheel'
          ),
        });
      }
      if (f2ClipboardConsole) {
        const activation = f2ClipboardPoi?.activation ?? 0;
        const focus = f2ClipboardPoi?.focus ?? 0;
        f2ClipboardConsole.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (sigmaWorkbench) {
        const activation = sigmaPoi?.activation ?? 0;
        const focus = sigmaPoi?.focus ?? 0;
        sigmaWorkbench.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (woveLoom) {
        const activation = wovePoi?.activation ?? 0;
        const focus = wovePoi?.focus ?? 0;
        woveLoom.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (jobbotTerminal) {
        const activation = jobbotPoi?.activation ?? 0;
        const focus = jobbotPoi?.focus ?? 0;
        if (
          sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            Math.max(activation, focus),
            'jobbot'
          )
        ) {
          jobbotTerminal.update({
            elapsed: elapsedTime,
            delta,
            emphasis: Math.max(activation, focus),
            analyticsGlow: analyticsGlow.getValue(),
            analyticsWave: analyticsGlow.getWave(),
          });
        }
      }
      if (axelNavigator) {
        const activation = axelPoi?.activation ?? 0;
        const focus = axelPoi?.focus ?? 0;
        axelNavigator.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      portfolioMiniatureTable?.update({
        playerWorldPosition: player.position,
        playerYaw: player.rotation.y,
        activeFloor: activeFloorId,
      });
      if (tokenPlaceWorkstation) {
        const activation = tokenPlacePoi?.activation ?? 0;
        const focus = tokenPlacePoi?.focus ?? 0;
        tokenPlaceWorkstation.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
          animateTerminals: sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            Math.max(activation, focus),
            'token-place-terminals'
          ),
        });
      }
      if (sugarkubeDeployment) {
        const activation = sugarkubePoi?.activation ?? 0;
        const focus = sugarkubePoi?.focus ?? 0;
        if (
          sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            Math.max(activation, focus),
            'sugarkube'
          )
        ) {
          sugarkubeDeployment.update({
            elapsed: elapsedTime,
            delta,
            emphasis: Math.max(activation, focus),
          });
        }
      }
      if (gabrielSentry) {
        const activation = gabrielPoi?.activation ?? 0;
        const focus = gabrielPoi?.focus ?? 0;
        gabrielSentry.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (gitshelvesInstallation) {
        const activation = gitshelvesPoi?.activation ?? 0;
        const focus = gitshelvesPoi?.focus ?? 0;
        gitshelvesInstallation.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (prReaperInstallation) {
        const activation = prReaperPoi?.activation ?? 0;
        const focus = prReaperPoi?.focus ?? 0;
        prReaperInstallation.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      solidVisualizer.update();
      if (backyardEnvironment) {
        if (
          sceneDetailController.shouldRunDecorativeUpdate(
            elapsedTime,
            1,
            'backyard'
          )
        ) {
          backyardEnvironment.update({ elapsed: elapsedTime, delta });
        }
      }
      performanceDiagnostics?.recordPhase(
        'decorativeStructures',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (
        environmentLightAnimator &&
        lightingDebugController.getMode() === 'cinematic'
      ) {
        environmentLightAnimator.update(elapsedTime);
      }
      if (ledAnimator) {
        ledAnimator.update(elapsedTime);
      }
      if (lightmapAnimator) {
        lightmapAnimator.update(elapsedTime);
      }
      performanceDiagnostics?.recordPhase(
        'lightingLedLightmap',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (selfieMirror) {
        selfieMirror.render(renderer, scene, elapsedTime);
      }
      performanceDiagnostics?.recordPhase(
        'mirror',
        performance.now() - phaseStart
      );
      phaseStart = performance.now();
      if (shouldUseComposer()) {
        composer?.render();
      } else {
        renderer.render(scene, camera);
      }
      performanceDiagnostics?.recordPhase(
        'mainRender',
        performance.now() - phaseStart
      );
      if (!hasPresentedFirstFrame) {
        hasPresentedFirstFrame = true;
        writeModePreference('immersive');
        markAppReady('immersive');
        maybeOpenTutorialOnFirstReadyFrame();
      }
      debugPerformanceOverlay.end();
    } catch (error) {
      debugPerformanceOverlay.end();
      handleFatalError(error);
    }
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    crashBreadcrumbs.record({
      type: 'webgl-context-lost',
      message: 'WebGL context lost; switching to a recoverable fallback.',
      renderer: rendererInfo,
      softwareRendererPolicy,
      snapshot: performanceDiagnostics?.methods.getSnapshot(),
    });
    handleFatalError(
      new Error('WebGL context lost; try immersive again after recovery.')
    );
  });
}
