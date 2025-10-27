import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Audio,
  AudioListener,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  UPPER_FLOOR_PLAN,
  getFloorBounds,
  WALL_THICKNESS,
  type FloorPlanDefinition,
  type RoomCategory,
} from './assets/floorPlan';
import { createWallSegmentInstances } from './assets/floorPlan/wallSegments';
import {
  formatMessage,
  getControlOverlayStrings,
  getHelpModalStrings,
  getLocaleDirection,
  getModeToggleStrings,
  getPoiNarrativeLogStrings,
  getSiteStrings,
  resolveLocale,
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
  AVATAR_ACCESSORY_PRESETS,
  AVATAR_ACCESSORY_PRESET_RULES,
  type AvatarAccessoryPresetId,
} from './scene/avatar/accessoryPresets';
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
import { createPortfolioMannequin } from './scene/avatar/mannequin';
import {
  createAvatarVariantManager,
  type AvatarVariantManager,
} from './scene/avatar/variantManager';
import {
  AVATAR_VARIANTS,
  DEFAULT_AVATAR_VARIANT_ID,
  type AvatarVariantId,
} from './scene/avatar/variants';
import {
  createBackyardEnvironment,
  type BackyardEnvironmentBuild,
} from './scene/environments/backyard';
import {
  createMotionBlurController,
  type MotionBlurController,
} from './scene/graphics/motionBlurController';
import {
  GRAPHICS_QUALITY_PRESETS,
  createGraphicsQualityManager,
  type GraphicsQualityManager,
} from './scene/graphics/qualityManager';
import {
  applyLightmapUv2,
  createInteriorLightmapTextures,
} from './scene/lighting/bakedLightmaps';
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
import { GuidedTourChannel } from './scene/poi/guidedTourChannel';
import { PoiInteractionManager } from './scene/poi/interactionManager';
import {
  createPoiInstances,
  type PoiInstance,
  type PoiInstanceOverrides,
} from './scene/poi/markers';
import { getPoiDefinitions } from './scene/poi/registry';
import {
  injectPoiStructuredData,
  injectTextPortfolioStructuredData,
} from './scene/poi/structuredData';
import { PoiTooltipOverlay } from './scene/poi/tooltipOverlay';
import { PoiTourGuide } from './scene/poi/tourGuide';
import type { PoiDefinition } from './scene/poi/types';
import { updateVisitedBadge } from './scene/poi/visitedBadge';
import { PoiVisitedState } from './scene/poi/visitedState';
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
  createLivingRoomMediaWall,
  type LivingRoomMediaWallBuild,
} from './scene/structures/mediaWall';
import {
  createPrReaperConsole,
  type PrReaperConsoleBuild,
} from './scene/structures/prReaperConsole';
import {
  createSelfieMirror,
  type SelfieMirrorBuild,
} from './scene/structures/selfieMirror';
import {
  createSigmaWorkbench,
  type SigmaWorkbenchBuild,
} from './scene/structures/sigmaWorkbench';
import {
  createStaircase,
  type StaircaseConfig,
} from './scene/structures/staircase';
import {
  createTokenPlaceRack,
  type TokenPlaceRackBuild,
} from './scene/structures/tokenPlaceRack';
import { createUpperLandingStub } from './scene/structures/upperLandingStub';
import {
  createWoveLoom,
  type WoveLoomBuild,
} from './scene/structures/woveLoom';
import {
  AmbientAudioController,
  type AmbientAudioBedDefinition,
  type AmbientAudioSource,
} from './systems/audio/ambientAudio';
import { AmbientCaptionBridge } from './systems/audio/ambientCaptionBridge';
import {
  createFootstepAudioController,
  type FootstepAudioControllerHandle,
} from './systems/audio/footstepController';
import {
  createCricketChorusBuffer,
  createDistantHumBuffer,
  createFootstepBuffer,
  createLanternChimeBuffer,
} from './systems/audio/proceduralBuffers';
import { collidesWithColliders, type RectCollider } from './systems/collision';
import {
  createAccessibilityPresetControl,
  type AccessibilityPresetControlHandle,
} from './systems/controls/accessibilityPresetControl';
import {
  createAudioHudControl,
  type AudioHudControlHandle,
} from './systems/controls/audioHudControl';
import {
  createAvatarAccessoryControl,
  type AvatarAccessoryControlHandle,
} from './systems/controls/avatarAccessoryControl';
import {
  createAvatarVariantControl,
  type AvatarVariantControlHandle,
} from './systems/controls/avatarVariantControl';
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
import {
  createTourGuideToggleControl,
  type TourGuideToggleControlHandle,
} from './systems/controls/tourGuideToggleControl';
import {
  createTourResetControl,
  type TourResetControlHandle,
} from './systems/controls/tourResetControl';
import { VirtualJoystick } from './systems/controls/VirtualJoystick';
import {
  evaluateFailoverDecision,
  renderTextFallback,
} from './systems/failover';
import {
  createManualModeToggle,
  type ManualModeToggleHandle,
} from './systems/failover/manualModeToggle';
import { writeModePreference } from './systems/failover/modePreference';
import { createPerformanceFailoverHandler } from './systems/failover/performanceFailover';
import { createGitHubRepoStatsService } from './systems/github/repoStats';
import { getCameraRelativeMovementVector } from './systems/movement/cameraRelativeMovement';
import {
  computeCameraRelativeYaw,
  computeModelYawFromVector,
  angularDifference,
  dampYawTowards,
  getCameraRelativeDirection,
  normalizeRadians,
} from './systems/movement/facing';
import { computeStairLayout } from './systems/movement/stairLayout';
import {
  computeRampHeight as computeStairRampHeight,
  predictStairFloorId,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
} from './systems/movement/stairs';
import { ProceduralNarrator } from './systems/narrative/proceduralNarrator';
import {
  createAvatarAccessoryProgression,
  type AvatarAccessoryProgressionHandle,
} from './systems/progression/avatarAccessoryProgression';
import {
  createHudFocusAnnouncer,
  type HudFocusAnnouncerHandle,
} from './ui/accessibility/hudFocusAnnouncer';
import { InteractionTimeline } from './ui/accessibility/interactionTimeline';
import {
  ACCESSIBILITY_PRESETS,
  createAccessibilityPresetManager,
  type AccessibilityPresetManager,
} from './ui/accessibility/presetManager';
import {
  createAudioSubtitles,
  type AudioSubtitlesHandle,
} from './ui/hud/audioSubtitles';
import { applyControlOverlayStrings } from './ui/hud/controlOverlay';
import { createHelpModal } from './ui/hud/helpModal';
import {
  attachHelpModalController,
  type HelpModalControllerHandle,
} from './ui/hud/helpModalController';
import {
  createHudLayoutManager,
  type HudLayoutManagerHandle,
} from './ui/hud/layoutManager';
import {
  createMovementLegend,
  type MovementLegendHandle,
} from './ui/hud/movementLegend';
import {
  createPoiNarrativeLog,
  type PoiNarrativeLogHandle,
} from './ui/hud/poiNarrativeLog';
import {
  createResponsiveControlOverlay,
  type ResponsiveControlOverlayHandle,
} from './ui/hud/responsiveControlOverlay';
import {
  createImmersiveModeUrl,
  shouldDisablePerformanceFailover,
} from './ui/immersiveUrl';
import './ui/styles.css';

const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;
const LOCALE_STORAGE_KEY = 'danielsmith.io:locale';
const GUIDED_TOUR_STORAGE_KEY = 'danielsmith.io:guided-tour-enabled';
const AVATAR_ASSET_REQUIRED_BONES = ['Hips', 'Spine'] as const;
const AVATAR_ASSET_REQUIRED_ANIMATIONS = ['Idle', 'Walk', 'Run'] as const;
const AVATAR_ASSET_EXPECTED_UNIT_SCALE = 1;
const AVATAR_ASSET_SCALE_TOLERANCE = 0.02;
type KeyBindingSnapshot = Record<KeyBindingAction, string[]>;

declare global {
  interface Window {
    portfolio?: {
      input?: {
        keyBindings?: {
          getBindings(): KeyBindingSnapshot;
          setBinding(action: KeyBindingAction, keys: readonly string[]): void;
          resetBinding(action: KeyBindingAction): void;
          resetAll(): void;
        };
      };
      avatar?: {
        getActiveVariant(): AvatarVariantId;
        setActiveVariant(variant: AvatarVariantId): void;
        listVariants(): Array<{
          id: AvatarVariantId;
          label: string;
          description?: string;
        }>;
        loadAsset?(options: AvatarAssetPipelineLoadOptions): Promise<unknown>;
      };
      world?: {
        getActiveFloor(): FloorId;
        setActiveFloor(next: FloorId): void;
        movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
        getPlayerPosition(): { x: number; y: number; z: number };
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
        // Test-only helper: current player yaw in radians
        getPlayerYaw?(): number;
      };
    };
  }
}

const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 12;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CAMERA_ZOOM_SMOOTHING = 6;
const CAMERA_MARGIN = 1.1;
const MIN_CAMERA_ZOOM = 0.65;
const MAX_CAMERA_ZOOM = 12;
const CAMERA_ZOOM_WHEEL_SENSITIVITY = 0.0018;
const MANNEQUIN_YAW_SMOOTHING = 8;
const CEILING_COVE_OFFSET = 0.35;
const POSITION_EPSILON = 1e-4;
const BACKYARD_ROOM_ID = 'backyard';
const PERFORMANCE_FAILOVER_FPS_THRESHOLD = 30;
const PERFORMANCE_FAILOVER_DURATION_MS = 5000;

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

type AppMode = 'immersive' | 'fallback';
const markDocumentReady = (mode: AppMode) => {
  const root = document.documentElement;
  root.dataset.appMode = mode;
  root.removeAttribute('data-app-loading');
};

let immersiveFailureHandled = false;

let locomotionAnimator: AvatarLocomotionAnimatorHandle | null = null;
let avatarFootIkController: AvatarFootIkControllerHandle | null = null;
let locomotionLinearSpeed = 0;
let locomotionAngularSpeed = 0;

const handleImmersiveFailure = (
  container: HTMLElement,
  error: unknown,
  { renderer }: { renderer?: WebGLRenderer } = {}
) => {
  if (immersiveFailureHandled) {
    return;
  }
  immersiveFailureHandled = true;
  console.error('Failed to initialize immersive scene:', error);

  if (renderer) {
    try {
      renderer.setAnimationLoop(null);
    } catch (loopError) {
      console.error('Failed to stop immersive renderer loop:', loopError);
    }

    try {
      renderer.dispose();
    } catch (disposeError) {
      console.error('Failed to dispose immersive renderer:', disposeError);
    }

    try {
      renderer.domElement.remove();
    } catch (removeError) {
      console.error('Failed to remove renderer canvas:', removeError);
    }
  }

  try {
    renderTextFallback(container, {
      reason: 'immersive-init-error',
      immersiveUrl: createImmersiveModeUrl(),
    });
  } catch (fallbackError) {
    console.error('Failed to render fallback experience:', fallbackError);
  }

  markDocumentReady('fallback');
};

const STAIRCASE_CONFIG = {
  name: 'LivingRoomStaircase',
  basePosition: new Vector3(toWorldUnits(6.2), 0, toWorldUnits(-5.3)),
  direction: 'negativeZ',
  step: {
    count: 9,
    rise: 0.42,
    run: toWorldUnits(0.85),
    width: toWorldUnits(3.1),
    material: {
      color: 0x708091,
      roughness: 0.6,
      metalness: 0.12,
    },
    colliderInset: toWorldUnits(0.05),
  },
  landing: {
    depth: toWorldUnits(2.6),
    thickness: 0.38,
    material: {
      color: 0x5b6775,
      roughness: 0.55,
      metalness: 0.08,
    },
    colliderInset: toWorldUnits(0.05),
    guard: {
      height: 0.55,
      thickness: toWorldUnits(0.14),
      inset: toWorldUnits(0.07),
      widthScale: 0.95,
      material: {
        color: 0x2c343f,
        roughness: 0.7,
        metalness: 0.05,
      },
    },
  },
} satisfies StaircaseConfig;

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
const upperFloorColliders: RectCollider[] = [];
const staticColliders: RectCollider[] = [];
const poiInstances: PoiInstance[] = [];
let backyardEnvironment: BackyardEnvironmentBuild | null = null;
let flywheelShowpiece: FlywheelShowpieceBuild | null = null;
let f2ClipboardConsole: F2ClipboardConsoleBuild | null = null;
let sigmaWorkbench: SigmaWorkbenchBuild | null = null;
let woveLoom: WoveLoomBuild | null = null;
let jobbotTerminal: JobbotTerminalBuild | null = null;
let axelNavigator: AxelNavigatorBuild | null = null;
let tokenPlaceRack: TokenPlaceRackBuild | null = null;
let prReaperConsole: PrReaperConsoleBuild | null = null;
let gabrielSentry: GabrielSentryBuild | null = null;
let gitshelvesInstallation: GitshelvesInstallationBuild | null = null;
let livingRoomMediaWall: LivingRoomMediaWallBuild | null = null;
let selfieMirror: SelfieMirrorBuild | null = null;
let ledStripGroup: Group | null = null;
let ledFillLightGroup: Group | null = null;
const ledStripMaterials: MeshStandardMaterial[] = [];
const ledFillLightsList: PointLight[] = [];
let ledAnimator: LedAnimator | null = null;
let lightmapAnimator: LightmapBounceAnimator | null = null;
let environmentLightAnimator: EnvironmentLightAnimator | null = null;
let ambientAudioController: AmbientAudioController | null = null;
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

function isInsideAnyRoom(
  plan: FloorPlanDefinition,
  x: number,
  z: number
): boolean {
  return plan.rooms.some(
    (room) =>
      x >= room.bounds.minX - POSITION_EPSILON &&
      x <= room.bounds.maxX + POSITION_EPSILON &&
      z >= room.bounds.minZ - POSITION_EPSILON &&
      z <= room.bounds.maxZ + POSITION_EPSILON
  );
}

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container element.');
}

const failoverDecision = evaluateFailoverDecision();

if (failoverDecision.shouldUseFallback) {
  const immersiveUrl = createImmersiveModeUrl();
  renderTextFallback(container, {
    reason: failoverDecision.reason ?? 'manual',
    immersiveUrl,
  });
  markDocumentReady('fallback');
} else {
  const failImmersive = (
    error: unknown,
    options: { renderer?: WebGLRenderer } = {}
  ) => handleImmersiveFailure(container, error, options);

  try {
    initializeImmersiveScene(container, failImmersive);
  } catch (error) {
    failImmersive(error);
  }
}

function initializeImmersiveScene(
  container: HTMLElement,
  onFatalError: (error: unknown, options: { renderer?: WebGLRenderer }) => void
) {
  const immersiveUrl = createImmersiveModeUrl();
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new Color(0x0d121c));
  container.appendChild(renderer.domElement);

  ledStripMaterials.length = 0;
  ledFillLightsList.length = 0;
  ledAnimator = null;
  environmentLightAnimator = null;

  let manualModeToggle: ManualModeToggleHandle | null = null;
  let tourGuideToggleControl: TourGuideToggleControlHandle | null = null;
  let tourResetControl: TourResetControlHandle | null = null;
  let hudLayoutManager: HudLayoutManagerHandle | null = null;
  let responsiveControlOverlay: ResponsiveControlOverlayHandle | null = null;
  let immersiveDisposed = false;
  let beforeUnloadHandler: (() => void) | null = null;
  let audioHudHandle: AudioHudControlHandle | null = null;
  let motionBlurControl: MotionBlurControlHandle | null = null;
  let audioSubtitles: AudioSubtitlesHandle | null = null;
  let ambientCaptionBridge: AmbientCaptionBridge | null = null;
  let graphicsQualityManager: GraphicsQualityManager | null = null;
  let graphicsQualityControl: GraphicsQualityControlHandle | null = null;
  let unsubscribeGraphicsQuality: (() => void) | null = null;
  let accessibilityPresetManager: AccessibilityPresetManager | null = null;
  let accessibilityControlHandle: AccessibilityPresetControlHandle | null =
    null;
  let unsubscribeAccessibility: (() => void) | null = null;
  let avatarVariantManager: AvatarVariantManager | null = null;
  let avatarVariantControl: AvatarVariantControlHandle | null = null;
  let unsubscribeAvatarVariant: (() => void) | null = null;
  let avatarAccessorySuite: AvatarAccessorySuite | null = null;
  let avatarAccessoryManager: AvatarAccessoryManager | null = null;
  let avatarAccessoryControl: AvatarAccessoryControlHandle | null = null;
  let unsubscribeAvatarAccessories: (() => void) | null = null;
  let unsubscribeAvatarAccessoryPresets: (() => void) | null = null;
  let avatarAccessoryProgression: AvatarAccessoryProgressionHandle | null =
    null;
  let avatarAssetPipeline: AvatarAssetPipeline | null = null;
  let hudFocusAnnouncer: HudFocusAnnouncerHandle | null = null;
  let helpModalController: HelpModalControllerHandle | null = null;
  let poiNarrativeLog: PoiNarrativeLogHandle | null = null;
  let proceduralNarrator: ProceduralNarrator | null = null;
  let localeToggleControl: LocaleToggleControlHandle | null = null;
  let guidedTourChannel: GuidedTourChannel | null = null;
  let removeGuidedTourSubscription: (() => void) | null = null;
  let githubRepoMetrics: GitHubRepoMetricsController | null = null;
  let getAmbientAudioVolume = () =>
    ambientAudioController?.getMasterVolume() ?? 1;
  let setAmbientAudioVolume = (volume: number) => {
    ambientAudioController?.setMasterVolume(volume);
  };

  let localeStorage: Storage | undefined;
  try {
    localeStorage = window.localStorage;
  } catch {
    localeStorage = undefined;
  }

  let guidedTourStorage: Storage | undefined;
  try {
    guidedTourStorage = window.localStorage;
  } catch {
    guidedTourStorage = undefined;
  }

  const readGuidedTourEnabled = (): boolean => {
    const stored = guidedTourStorage?.getItem(GUIDED_TOUR_STORAGE_KEY);
    if (stored === 'false') {
      return false;
    }
    if (stored === 'true') {
      return true;
    }
    return true;
  };

  const writeGuidedTourEnabled = (enabled: boolean) => {
    try {
      guidedTourStorage?.setItem(
        GUIDED_TOUR_STORAGE_KEY,
        enabled ? 'true' : 'false'
      );
    } catch {
      /* ignore storage write failures */
    }
  };

  const detectedLanguage =
    typeof navigator !== 'undefined' && navigator.language
      ? navigator.language
      : document.documentElement.lang;
  const storedLocale = localeStorage?.getItem(LOCALE_STORAGE_KEY);
  let locale: Locale = resolveLocale(storedLocale ?? detectedLanguage);
  document.documentElement.lang = locale === 'en-x-pseudo' ? 'en' : locale;
  const htmlDirection = getLocaleDirection(locale);
  document.documentElement.dir = htmlDirection;
  document.documentElement.dataset.localeDirection = htmlDirection;
  let controlOverlayStrings = getControlOverlayStrings(locale);
  let helpModalStrings = getHelpModalStrings(locale);
  let modeToggleStrings = getModeToggleStrings(locale);
  let narrativeLogStrings = getPoiNarrativeLogStrings(locale);
  let siteStrings = getSiteStrings(locale);
  let narrativeTimeFormatter = new Intl.DateTimeFormat(
    locale === 'en-x-pseudo' ? 'en' : locale,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );

  const searchParams = new URLSearchParams(window.location.search);
  const disablePerformanceFailover =
    shouldDisablePerformanceFailover(searchParams);

  const performanceFailover = createPerformanceFailoverHandler({
    renderer,
    container,
    immersiveUrl,
    markAppReady: markDocumentReady,
    fpsThreshold: PERFORMANCE_FAILOVER_FPS_THRESHOLD,
    minimumDurationMs: PERFORMANCE_FAILOVER_DURATION_MS,
    onTrigger: ({ averageFps, durationMs, p95Fps, sampleCount, minFps }) => {
      const roundedDuration = Math.round(durationMs);
      const averaged = averageFps.toFixed(1);
      const percentile = p95Fps.toFixed(1);
      const floor = minFps.toFixed(1);
      console.warn(
        `Switching to text fallback after ${roundedDuration}ms below ` +
          `${PERFORMANCE_FAILOVER_FPS_THRESHOLD} FPS (avg ${averaged} FPS, ` +
          `p95 ${percentile} FPS, min ${floor} FPS across ${sampleCount} samples).`
      );
    },
    onBeforeFallback: () => {
      disposeImmersiveResources();
    },
    disabled: disablePerformanceFailover,
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
    disposeImmersiveResources();
    onFatalError(error, { renderer });
  };

  const scene = new Scene();
  scene.background = createImmersiveGradientTexture();

  const poiOverrides: PoiInstanceOverrides = {};
  const poiDefinitions = getPoiDefinitions();
  const poiDefinitionsById = new Map(
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
    PLAYER_RADIUS,
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

  const cameraCenter = initialPlayerPosition.clone();
  camera.position.copy(cameraCenter).add(cameraBaseOffset);
  camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);
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

  const backyardRoom = FLOOR_PLAN.rooms.find(
    (room) => room.id === BACKYARD_ROOM_ID
  );
  if (backyardRoom) {
    backyardEnvironment = createBackyardEnvironment(backyardRoom.bounds, {
      seasonalPreset,
    });
    scene.add(backyardEnvironment.group);
    // Remove the enclosing sky dome to avoid a bright circular spheroid.
    // We want a dark void beyond the property in runtime.
    const skyDome =
      backyardEnvironment.group.getObjectByName('BackyardSkyDome');
    if (skyDome) {
      skyDome.visible = false;
    }
    backyardEnvironment.colliders.forEach((collider) =>
      groundColliders.push(collider)
    );
  }

  const floorMaterial = new MeshStandardMaterial({ color: 0x2a3547 });
  const floorShape = new Shape();
  const [firstX, firstZ] = FLOOR_PLAN.outline[0];
  floorShape.moveTo(firstX, firstZ);
  for (let i = 1; i < FLOOR_PLAN.outline.length; i += 1) {
    const [x, z] = FLOOR_PLAN.outline[i];
    floorShape.lineTo(x, z);
  }
  floorShape.closePath();
  const floorGeometry = new ShapeGeometry(floorShape);
  applyLightmapUv2(floorGeometry);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.position.y = 0;
  scene.add(floor);

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
  const wallGroup = new Group();
  const groundWallInstances = createWallSegmentInstances(FLOOR_PLAN, {
    baseElevation: 0,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    getRoomCategory,
  });
  groundWallInstances.forEach((instance) => {
    const geometry = new BoxGeometry(
      instance.dimensions.width,
      instance.dimensions.height,
      instance.dimensions.depth
    );
    applyLightmapUv2(geometry);
    const material = instance.isFence ? fenceMaterial : wallMaterial;
    const wall = new Mesh(geometry, material);
    wall.position.set(instance.center.x, instance.center.y, instance.center.z);
    wallGroup.add(wall);

    groundColliders.push(instance.collider);
  });

  scene.add(wallGroup);

  const doorwayOpenings = createDoorwayOpenings(FLOOR_PLAN, {
    wallHeight: WALL_HEIGHT,
    baseElevation: 0,
    doorHeight: WALL_HEIGHT * 0.72,
    jambThickness: WALL_THICKNESS * 0.76,
    lintelThickness: 0.26,
    trimDepth: WALL_THICKNESS * 0.92,
    material: doorwayTrimMaterial,
  });
  scene.add(doorwayOpenings.group);

  const ceilings = createRoomCeilingPanels(FLOOR_PLAN.rooms, {
    height: WALL_HEIGHT - 0.15,
    inset: 1.1,
    thickness: 0.32,
    tintIntensity: 0.24,
    opacity: 0.08,
    lightMap: interiorLightmaps.ceiling,
    lightMapIntensity: 0.52,
  });
  scene.add(ceilings.group);

  const livingRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'livingRoom');
  if (livingRoom) {
    const mediaWall = createLivingRoomMediaWall(livingRoom.bounds);
    scene.add(mediaWall.group);
    mediaWall.colliders.forEach((collider) => staticColliders.push(collider));
    livingRoomMediaWall = mediaWall;

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
    scene.add(mirror.group);
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
  const upperFloorElevation =
    stairTotalRise + STAIRCASE_CONFIG.landing.thickness;
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
  };
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

  const upperFloorGroup = new Group();
  upperFloorGroup.visible = false;
  scene.add(upperFloorGroup);

  const upperFloorMaterial = new MeshStandardMaterial({
    color: 0x1f273a,
    side: DoubleSide,
    // Nudge the upper floor away from coplanar surfaces (e.g., landing top)
    // to avoid depth fighting at shared boundaries.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const upperFloorShape = new Shape();
  const [upperFirstX, upperFirstZ] = UPPER_FLOOR_PLAN.outline[0];
  upperFloorShape.moveTo(upperFirstX, upperFirstZ);
  for (let i = 1; i < UPPER_FLOOR_PLAN.outline.length; i += 1) {
    const [x, z] = UPPER_FLOOR_PLAN.outline[i];
    upperFloorShape.lineTo(x, z);
  }
  upperFloorShape.closePath();

  // Carve a stairwell hole in the upper floor directly above the stairs to
  // eliminate z-fighting and allow the player to visually descend. Use a
  // slightly oversized cutout so collision tolerances near edges feel natural.
  const stairHoleHalfWidth = stairHalfWidth + stairwellMarginX;
  const stairHoleMinX = stairCenterX - stairHoleHalfWidth;
  const stairHoleMaxX = stairCenterX + stairHoleHalfWidth;
  const stairHoleMinZ = stairLayout.stairHoleRange.minZ;
  const stairHoleMaxZ = stairLayout.stairHoleRange.maxZ;
  upperFloorShape.holes.push(
    (() => {
      const hole = new Shape();
      hole.moveTo(stairHoleMinX, stairHoleMinZ);
      hole.lineTo(stairHoleMaxX, stairHoleMinZ);
      hole.lineTo(stairHoleMaxX, stairHoleMaxZ);
      hole.lineTo(stairHoleMinX, stairHoleMaxZ);
      hole.closePath();
      return hole;
    })()
  );
  const upperFloorGeometry = new ShapeGeometry(upperFloorShape);
  upperFloorGeometry.rotateX(-Math.PI / 2);
  const upperFloor = new Mesh(upperFloorGeometry, upperFloorMaterial);
  // Slightly lower than the landing top to ensure no coplanar z-fighting.
  upperFloor.position.y = upperFloorElevation - 0.002;
  upperFloorGroup.add(upperFloor);

  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  if (upperLandingRoom) {
    const upperLandingStub = createUpperLandingStub({
      bounds: upperLandingRoom.bounds,
      landingMaxZ: stairTopZ,
      elevation: upperFloorElevation,
      thickness: STAIRCASE_CONFIG.landing.thickness,
      landingClearance: toWorldUnits(0.05),
      material: {
        color: 0x4c596b,
        roughness: 0.58,
        metalness: 0.06,
      },
      guard: {
        height: 0.62,
        thickness: toWorldUnits(0.12),
        inset: toWorldUnits(0.4),
        material: {
          color: 0x2a3241,
          roughness: 0.72,
          metalness: 0.05,
        },
      },
    });
    upperFloorGroup.add(upperLandingStub.group);
    upperLandingStub.colliders.forEach((collider) =>
      upperFloorColliders.push(collider)
    );
  }

  const upperWallMaterial = new MeshStandardMaterial({ color: 0x46536a });
  const upperWallGroup = new Group();
  upperFloorGroup.add(upperWallGroup);
  const upperWallInstances = createWallSegmentInstances(UPPER_FLOOR_PLAN, {
    baseElevation: upperFloorElevation,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    getRoomCategory,
  });

  upperWallInstances.forEach((instance) => {
    const geometry = new BoxGeometry(
      instance.dimensions.width,
      instance.dimensions.height,
      instance.dimensions.depth
    );
    const wall = new Mesh(geometry, upperWallMaterial);
    wall.position.set(instance.center.x, instance.center.y, instance.center.z);
    upperWallGroup.add(wall);

    upperFloorColliders.push(instance.collider);
  });

  const floorPlansById: Record<FloorId, FloorPlanDefinition> = {
    ground: FLOOR_PLAN,
    upper: UPPER_FLOOR_PLAN,
  };

  const floorColliders: Record<FloorId, RectCollider[]> = {
    ground: groundColliders,
    upper: upperFloorColliders,
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

  const builtPoiInstances = createPoiInstances(poiDefinitions, poiOverrides);
  builtPoiInstances.forEach((poi) => {
    if (!poi.group.parent) {
      scene.add(poi.group);
    }
    if (poi.collider) {
      staticColliders.push(poi.collider);
    }
    poiInstances.push(poi);
  });

  const poiAnalytics = createWindowPoiAnalytics();
  const interactionTimeline = new InteractionTimeline();
  const poiTooltipOverlay = new PoiTooltipOverlay({
    container,
    interactionTimeline,
  });
  const poiWorldTooltip = new PoiWorldTooltip({ parent: scene, camera });
  const githubRepoStatsService = createGitHubRepoStatsService();
  githubRepoMetrics = wireGitHubRepoMetrics({
    definitions: poiDefinitions,
    service: githubRepoStatsService,
    onMetricsUpdated: (poiId) => {
      poiTooltipOverlay.notifyPoiUpdated(poiId);
      poiWorldTooltip.notifyPoiUpdated(poiId);
    },
  });
  githubRepoMetrics.refreshAll().catch(() => {
    /* GitHub may be unreachable; metrics will remain on fallback values. */
  });
  const poiVisitedState = new PoiVisitedState();
  if (avatarAccessoryManager) {
    avatarAccessoryProgression = createAvatarAccessoryProgression({
      manager: avatarAccessoryManager,
      visitedState: poiVisitedState,
      rules: AVATAR_ACCESSORY_PRESET_RULES,
    });
  }
  const poiTourGuide = new PoiTourGuide({
    definitions: poiDefinitions,
    visitedState: poiVisitedState,
    priorityOrder: [
      'futuroptimist-living-room-tv',
      'tokenplace-studio-cluster',
      'gabriel-studio-sentry',
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
      'axel-studio-tracker',
      'gitshelves-living-room-installation',
      'danielsmith-portfolio-table',
      'f2clipboard-kitchen-console',
      'sigma-kitchen-workbench',
      'wove-kitchen-loom',
      'pr-reaper-backyard-console',
      'dspace-backyard-rocket',
      'sugarkube-backyard-greenhouse',
    ],
  });

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
      getAnchorPosition: (out: Vector3) => {
        if (instance.label) {
          return out.copy(instance.labelWorldPosition);
        }
        instance.group.getWorldPosition(out);
        return out;
      },
    };
  };

  let visitedInitialized = false;
  let previousVisited = new Set<string>();

  const handleVisitedUpdate = (visited: ReadonlySet<string>) => {
    for (const poi of poiInstances) {
      const isVisited = visited.has(poi.definition.id);
      if (poi.visited !== isVisited) {
        poi.visited = isVisited;
      }
    }
    poiTooltipOverlay.setVisitedPoiIds(visited);
    let hasRemovedVisits = false;
    for (const id of previousVisited) {
      if (!visited.has(id)) {
        hasRemovedVisits = true;
        break;
      }
    }
    if (poiNarrativeLog) {
      const visitedDefinitions = Array.from(visited)
        .map((id) => poiDefinitionsById.get(id))
        .filter((definition): definition is PoiDefinition =>
          Boolean(definition)
        );

      poiNarrativeLog.syncVisited(visitedDefinitions, {
        visitedLabel: narrativeLogStrings.defaultVisitedLabel,
      });

      if (!visitedInitialized) {
        proceduralNarrator?.primeVisited(visitedDefinitions);
      } else {
        if (hasRemovedVisits) {
          poiNarrativeLog.clearJourneys();
          proceduralNarrator?.primeVisited(visitedDefinitions);
        }
        for (const id of visited) {
          if (previousVisited.has(id)) {
            continue;
          }
          const definition = poiDefinitionsById.get(id);
          if (!definition) {
            continue;
          }
          proceduralNarrator?.handleVisit(definition);
          const timeLabel = narrativeTimeFormatter.format(new Date());
          const visitedLabel = formatMessage(
            narrativeLogStrings.visitedLabelTemplate,
            { time: timeLabel }
          );
          poiNarrativeLog.recordVisit(definition, {
            visitedLabel,
          });
        }
      }
    }
    previousVisited = new Set(visited);
    visitedInitialized = true;
  };

  const removeVisitedSubscription =
    poiVisitedState.subscribe(handleVisitedUpdate);
  const initialGuidedTourEnabled = readGuidedTourEnabled();
  guidedTourChannel = new GuidedTourChannel({
    source: poiTourGuide,
    enabled: initialGuidedTourEnabled,
  });
  removeGuidedTourSubscription = guidedTourChannel.subscribe(
    (recommendation) => {
      poiTooltipOverlay.setRecommendation(recommendation);
      poiWorldTooltip.setRecommendation(
        resolveWorldTooltipTarget(recommendation)
      );
    }
  );

  const futuroptimistPoi = poiInstances.find(
    (poi) => poi.definition.id === 'futuroptimist-living-room-tv'
  );
  const flywheelPoi = poiInstances.find(
    (poi) => poi.definition.id === 'flywheel-studio-flywheel'
  );
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
  const kitchenRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'kitchen');
  const kitchenBounds = kitchenRoom?.bounds;
  if (studioRoom) {
    const centerX =
      flywheelPoi?.group.position.x ??
      (studioRoom.bounds.minX + studioRoom.bounds.maxX) / 2;
    const centerZ =
      flywheelPoi?.group.position.z ??
      (studioRoom.bounds.minZ + studioRoom.bounds.maxZ) / 2;
    const showpiece = createFlywheelShowpiece({
      centerX,
      centerZ,
      roomBounds: studioRoom.bounds,
      orientationRadians: flywheelPoi?.group.rotation.y ?? 0,
    });
    scene.add(showpiece.group);
    showpiece.colliders.forEach((collider) => groundColliders.push(collider));
    flywheelShowpiece = showpiece;

    const terminalOrientation = jobbotPoi?.group.rotation.y ?? -Math.PI / 2;
    const terminalX = MathUtils.clamp(
      jobbotPoi?.group.position.x ?? 11.4,
      studioRoom.bounds.minX + 1.2,
      studioRoom.bounds.maxX - 0.8
    );
    const terminalZ = MathUtils.clamp(
      jobbotPoi?.group.position.z ?? -0.6,
      studioRoom.bounds.minZ + 1.2,
      studioRoom.bounds.maxZ - 1.1
    );
    const terminal = createJobbotTerminal({
      position: { x: terminalX, y: 0, z: terminalZ },
      orientationRadians: terminalOrientation,
    });
    scene.add(terminal.group);
    terminal.colliders.forEach((collider) => groundColliders.push(collider));
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
      scene.add(navigator.group);
      navigator.colliders.forEach((collider) => groundColliders.push(collider));
      axelNavigator = navigator;
    }

    if (tokenPlacePoi) {
      const rack = createTokenPlaceRack({
        position: {
          x: tokenPlacePoi.group.position.x,
          y: tokenPlacePoi.group.position.y,
          z: tokenPlacePoi.group.position.z,
        },
        orientationRadians: tokenPlacePoi.group.rotation.y ?? 0,
      });
      scene.add(rack.group);
      rack.colliders.forEach((collider) => groundColliders.push(collider));
      tokenPlaceRack = rack;
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
      scene.add(sentry.group);
      sentry.colliders.forEach((collider) => groundColliders.push(collider));
      gabrielSentry = sentry;
    }
  }

  if (prReaperPoi) {
    const console = createPrReaperConsole({
      position: {
        x: prReaperPoi.group.position.x,
        y: prReaperPoi.group.position.y,
        z: prReaperPoi.group.position.z,
      },
      orientationRadians: prReaperPoi.group.rotation.y ?? 0,
    });
    scene.add(console.group);
    console.colliders.forEach((collider) => groundColliders.push(collider));
    prReaperConsole = console;
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
    scene.add(installation.group);
    installation.colliders.forEach((collider) =>
      groundColliders.push(collider)
    );
    gitshelvesInstallation = installation;
  }

  if (f2ClipboardPoi) {
    const consoleX = kitchenBounds
      ? MathUtils.clamp(
          f2ClipboardPoi.group.position.x,
          kitchenBounds.minX + 0.8,
          kitchenBounds.maxX - 0.8
        )
      : f2ClipboardPoi.group.position.x;
    const consoleZ = kitchenBounds
      ? MathUtils.clamp(
          f2ClipboardPoi.group.position.z,
          kitchenBounds.minZ + 0.8,
          kitchenBounds.maxZ - 0.8
        )
      : f2ClipboardPoi.group.position.z;
    const console = createF2ClipboardConsole({
      position: {
        x: consoleX,
        y: f2ClipboardPoi.group.position.y,
        z: consoleZ,
      },
      orientationRadians: f2ClipboardPoi.group.rotation.y ?? 0,
    });
    scene.add(console.group);
    console.colliders.forEach((collider) => groundColliders.push(collider));
    f2ClipboardConsole = console;
  }

  if (sigmaPoi) {
    const benchX = kitchenBounds
      ? MathUtils.clamp(
          sigmaPoi.group.position.x,
          kitchenBounds.minX + 0.9,
          kitchenBounds.maxX - 0.9
        )
      : sigmaPoi.group.position.x;
    const benchZ = kitchenBounds
      ? MathUtils.clamp(
          sigmaPoi.group.position.z,
          kitchenBounds.minZ + 0.9,
          kitchenBounds.maxZ - 0.9
        )
      : sigmaPoi.group.position.z;
    const workbench = createSigmaWorkbench({
      position: {
        x: benchX,
        y: sigmaPoi.group.position.y,
        z: benchZ,
      },
      orientationRadians: sigmaPoi.group.rotation.y ?? 0,
    });
    scene.add(workbench.group);
    workbench.colliders.forEach((collider) => groundColliders.push(collider));
    sigmaWorkbench = workbench;
  }

  if (wovePoi) {
    const loomX = kitchenBounds
      ? MathUtils.clamp(
          wovePoi.group.position.x,
          kitchenBounds.minX + 0.8,
          kitchenBounds.maxX - 0.8
        )
      : wovePoi.group.position.x;
    const loomZ = kitchenBounds
      ? MathUtils.clamp(
          wovePoi.group.position.z,
          kitchenBounds.minZ + 0.8,
          kitchenBounds.maxZ - 0.6
        )
      : wovePoi.group.position.z;
    const loom = createWoveLoom({
      position: {
        x: loomX,
        y: wovePoi.group.position.y,
        z: loomZ,
      },
      orientationRadians: wovePoi.group.rotation.y ?? 0,
    });
    scene.add(loom.group);
    loom.colliders.forEach((collider) => groundColliders.push(collider));
    woveLoom = loom;
  }

  const poiInteractionManager = new PoiInteractionManager(
    renderer.domElement,
    camera,
    poiInstances,
    poiAnalytics
  );
  const removeHoverListener = poiInteractionManager.addHoverListener((poi) => {
    poiTooltipOverlay.setHovered(poi);
    poiWorldTooltip.setHovered(resolveWorldTooltipTarget(poi));
  });
  const removeSelectionStateListener =
    poiInteractionManager.addSelectionStateListener((poi) => {
      poiTooltipOverlay.setSelected(poi);
      poiWorldTooltip.setSelected(resolveWorldTooltipTarget(poi));
    });
  const removeSelectionListener = poiInteractionManager.addSelectionListener(
    (poi) => {
      poiVisitedState.markVisited(poi.id);
      if (poi.narration?.caption && audioSubtitles) {
        audioSubtitles.show({
          id: `poi-${poi.id}`,
          text: poi.narration.caption,
          source: 'poi',
          durationMs: poi.narration.durationMs,
          priority: 5,
        });
      }
    }
  );
  poiInteractionManager.start();
  beforeUnloadHandler = () => {
    disposeImmersiveResources();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const mannequin = createPortfolioMannequin({
    collisionRadius: PLAYER_RADIUS,
  });
  const player = mannequin.group;
  const mannequinHeight = mannequin.height;
  player.position.copy(initialPlayerPosition);
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
  } else {
    footstepAudioNode.setFilter(null);
  }
  player.add(footstepAudioNode);
  footstepAudio = footstepAudioNode;

  footstepAudioController = createFootstepAudioController({
    player: {
      play: ({ volume, playbackRate, pan }) => {
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
    },
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
    presets: AVATAR_ACCESSORY_PRESETS,
  });

  avatarVariantManager = createAvatarVariantManager({
    target: {
      applyPalette: (palette) => {
        mannequin.applyPalette(palette);
        avatarAccessoryManager?.applyPalette(palette);
      },
    },
    storage: avatarVariantStorage,
  });
  ensureAvatarApi();

  const controlOverlay = document.getElementById('control-overlay');
  if (controlOverlay) {
    applyControlOverlayStrings(controlOverlay, controlOverlayStrings);
  }
  const keyBindings = new KeyBindings();
  const KEY_BINDINGS_STORAGE_KEY = 'danielsmith.io:keyBindings';
  const bindingActions: KeyBindingAction[] = [
    'moveForward',
    'moveBackward',
    'moveLeft',
    'moveRight',
    'interact',
    'help',
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
    const portfolioWindow = window as Window;
    if (!portfolioWindow.portfolio) {
      portfolioWindow.portfolio = {};
    }
    if (!portfolioWindow.portfolio.input) {
      portfolioWindow.portfolio.input = {};
    }
    portfolioWindow.portfolio.input.keyBindings = {
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
    };
  };

  ensureKeyBindingApi();
  const ensureWorldApi = () => {
    const portfolioWindow = window as Window;
    if (!portfolioWindow.portfolio) {
      portfolioWindow.portfolio = {};
    }
    portfolioWindow.portfolio.world = {
      getActiveFloor() {
        return activeFloorId;
      },
      setActiveFloor(next: FloorId) {
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
        player.position.x = x;
        player.position.z = z;
        setActiveFloorId(predictedFloor);
        updatePlayerVerticalPosition();
      },
      // Test helpers – intentionally minimal and read-only in production.
      getPlayerPosition() {
        return {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        };
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
    };
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
    const portfolioWindow = window as Window;
    if (!portfolioWindow.portfolio) {
      portfolioWindow.portfolio = {};
    }
    portfolioWindow.portfolio.avatar = {
      getActiveVariant(): AvatarVariantId {
        return avatarVariantManager?.getVariant() ?? DEFAULT_AVATAR_VARIANT_ID;
      },
      setActiveVariant(variant: AvatarVariantId) {
        avatarVariantManager?.setVariant(variant);
      },
      listVariants() {
        return AVATAR_VARIANTS.map(({ id, label, description }) => ({
          id,
          label,
          description,
        }));
      },
      listAccessories() {
        return (
          avatarAccessorySuite?.definitions.map(
            ({ id, label, description }) => ({
              id,
              label,
              description,
              enabled: avatarAccessoryManager?.isEnabled(id) ?? false,
            })
          ) ?? []
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
      listAccessoryPresets() {
        return avatarAccessoryManager?.listPresets() ?? [];
      },
      isAccessoryPresetUnlocked(id: AvatarAccessoryPresetId) {
        return avatarAccessoryManager?.isPresetUnlocked(id) ?? false;
      },
      unlockAccessoryPreset(id: AvatarAccessoryPresetId) {
        return avatarAccessoryManager?.unlockPreset(id) ?? false;
      },
      lockAccessoryPreset(id: AvatarAccessoryPresetId) {
        return avatarAccessoryManager?.lockPreset(id) ?? false;
      },
      applyAccessoryPreset(id: AvatarAccessoryPresetId) {
        avatarAccessoryManager?.applyPreset(id);
      },
      loadAsset(options: AvatarAssetPipelineLoadOptions) {
        return getAvatarAssetPipeline().load(options);
      },
    };
  }
  const interactControl = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact"]'
  );
  const interactDescription = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact-description"]'
  );
  const helpButton = controlOverlay?.querySelector<HTMLButtonElement>(
    '[data-control="help"]'
  );
  let interactLabelFallback = controlOverlayStrings.interact.defaultLabel;
  const interactDescriptionFallback =
    controlOverlayStrings.interact.description;
  const movementLegend: MovementLegendHandle | null = controlOverlay
    ? createMovementLegend({
        container: controlOverlay,
        locale,
        interactLabels: {
          keyboard:
            formatKeyLabel(keyBindings.getPrimaryBinding('interact')) ||
            interactLabelFallback,
        },
      })
    : null;
  responsiveControlOverlay = controlOverlay
    ? createResponsiveControlOverlay({
        container: controlOverlay,
        list: controlOverlay.querySelector<HTMLElement>(
          '[data-role="control-list"]'
        ),
        toggle: controlOverlay.querySelector<HTMLButtonElement>(
          '[data-role="control-toggle"]'
        ),
        strings: controlOverlayStrings.mobileToggle,
        initialLayout: 'desktop',
      })
    : null;
  const helpModal = createHelpModal({
    container: document.body,
    content: helpModalStrings,
  });
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

  poiNarrativeLog = createPoiNarrativeLog({
    container: helpModal.element,
    strings: narrativeLogStrings,
  });
  proceduralNarrator = new ProceduralNarrator({
    log: poiNarrativeLog,
    definitions: poiDefinitions,
  });
  if (avatarVariantManager) {
    avatarVariantControl = createAvatarVariantControl({
      container: hudSettingsStack,
      options: AVATAR_VARIANTS,
      getActiveVariant: () =>
        avatarVariantManager?.getVariant() ?? DEFAULT_AVATAR_VARIANT_ID,
      setActiveVariant: (variant) => {
        avatarVariantManager?.setVariant(variant);
      },
    });
    registerHudControlElement(avatarVariantControl.element);
    unsubscribeAvatarVariant = avatarVariantManager.onChange(() => {
      avatarVariantControl?.refresh();
    });
  }
  if (avatarAccessoryManager && avatarAccessorySuite) {
    avatarAccessoryControl = createAvatarAccessoryControl({
      container: hudSettingsStack,
      options: avatarAccessorySuite.definitions,
      isAccessoryEnabled: (id) =>
        avatarAccessoryManager?.isEnabled(id) ?? false,
      setAccessoryEnabled: (id, enabled) => {
        avatarAccessoryManager?.setEnabled(id, enabled);
      },
      presets: {
        getPresets: () => avatarAccessoryManager?.listPresets() ?? [],
        applyPreset: (presetId) => {
          avatarAccessoryManager?.applyPreset(presetId);
        },
      },
    });
    registerHudControlElement(avatarAccessoryControl.element);
    unsubscribeAvatarAccessories = avatarAccessoryManager.onChange(() => {
      avatarAccessoryControl?.refresh();
    });
    unsubscribeAvatarAccessoryPresets = avatarAccessoryManager.onPresetChange(
      () => {
        avatarAccessoryControl?.refresh();
      }
    );
  }
  hudFocusAnnouncer = createHudFocusAnnouncer({
    documentTarget: document,
    container: document.body,
  });
  helpModalController = attachHelpModalController({
    helpModal,
    onOpen: showHudControlElements,
    onClose: hideHudControlElements,
    hudFocusAnnouncer,
    announcements: helpModalStrings.announcements,
  });
  const openHelpMenu = () => {
    helpModal.open();
  };
  const toggleHelpMenu = (force?: boolean) => {
    helpModal.toggle(force);
  };
  let helpButtonClickHandler: (() => void) | null = null;
  if (helpButton) {
    helpButtonClickHandler = () => openHelpMenu();
    helpButton.addEventListener('click', helpButtonClickHandler);
  }
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

  let activeFloorId: FloorId = 'ground';
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
    helpButton.textContent = buildHelpButtonText(label);
    helpButton.dataset.hudAnnounce = buildHelpAnnouncement(label);
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
    document.documentElement.lang = locale === 'en-x-pseudo' ? 'en' : locale;

    controlOverlayStrings = getControlOverlayStrings(locale);
    helpModalStrings = getHelpModalStrings(locale);
    modeToggleStrings = getModeToggleStrings(locale);
    helpModalController?.setAnnouncements(helpModalStrings.announcements);
    narrativeLogStrings = getPoiNarrativeLogStrings(locale);
    siteStrings = getSiteStrings(locale);
    narrativeTimeFormatter = new Intl.DateTimeFormat(
      locale === 'en-x-pseudo' ? 'en' : locale,
      { hour: 'numeric', minute: '2-digit' }
    );
    interactLabelFallback = controlOverlayStrings.interact.defaultLabel;
    helpLabelFallback = controlOverlayStrings.helpButton.shortcutFallback;

    if (controlOverlay) {
      applyControlOverlayStrings(controlOverlay, controlOverlayStrings);
    }
    responsiveControlOverlay?.setStrings(controlOverlayStrings.mobileToggle);
    responsiveControlOverlay?.refresh();
    movementLegend?.setLocale(locale);
    if (movementLegend) {
      const keyboardLabel =
        formatKeyLabel(keyBindings.getPrimaryBinding('interact')) ||
        interactLabelFallback;
      movementLegend.setKeyboardInteractLabel(keyboardLabel);
    }
    manualModeToggle?.setStrings(modeToggleStrings);
    helpModal.setContent(helpModalStrings);
    poiNarrativeLog?.setStrings(narrativeLogStrings);
    updateHelpButtonLabel();
    localeToggleControl?.refresh();

    const visitedSnapshot = poiVisitedState.snapshot();
    const visitedDefinitions = Array.from(visitedSnapshot)
      .map((id) => poiDefinitionsById.get(id))
      .filter((definition): definition is PoiDefinition => Boolean(definition));
    if (visitedDefinitions.length > 0 && poiNarrativeLog) {
      poiNarrativeLog.syncVisited(visitedDefinitions, {
        visitedLabel: narrativeLogStrings.defaultVisitedLabel,
      });
    }
  };

  const localeOptions: Array<{
    id: Locale;
    label: string;
    direction: 'ltr' | 'rtl';
  }> = [
    { id: 'en', label: 'English', direction: 'ltr' },
    { id: 'ja', label: '日本語', direction: 'ltr' },
    { id: 'ar', label: 'العربية', direction: 'rtl' },
    { id: 'en-x-pseudo', label: 'Pseudo', direction: 'ltr' },
  ];

  localeToggleControl = createLocaleToggleControl({
    container: hudSettingsStack,
    options: localeOptions,
    getActiveLocale: () => locale,
    setActiveLocale: (nextLocale) => {
      applyLocaleUpdate(nextLocale);
    },
    title: 'Language',
    description: 'Choose language and direction for the HUD.',
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
      saveKeyBindings();
    })
  );

  const computeRampHeight = (x: number, z: number): number =>
    computeStairRampHeight(stairGeometry, stairBehavior, x, z);

  const predictFloorId = (x: number, z: number, current: FloorId): FloorId =>
    predictStairFloorId(stairGeometry, stairBehavior, x, z, current);

  const canOccupyPosition = (
    x: number,
    z: number,
    floorId: FloorId
  ): boolean => {
    const inside = isInsideAnyRoom(floorPlansById[floorId], x, z);
    if (!inside) {
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
    upperFloorGroup.visible = next === 'upper';
    document.documentElement.dataset.activeFloor = next;
  };

  const updatePlayerVerticalPosition = () => {
    const rampHeight = computeRampHeight(player.position.x, player.position.z);
    const baseHeight =
      activeFloorId === 'upper'
        ? upperFloorElevation
        : Math.min(rampHeight, upperFloorElevation);
    player.position.y = PLAYER_RADIUS + baseHeight;
  };

  updatePlayerVerticalPosition();
  document.documentElement.dataset.activeFloor = activeFloorId;

  const setCameraZoomTarget = (next: number) => {
    cameraZoomTarget = MathUtils.clamp(next, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
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

  const handleWheelZoom = (event: WheelEvent) => {
    event.preventDefault();
    setCameraZoomTarget(
      cameraZoomTarget - event.deltaY * CAMERA_ZOOM_WHEEL_SENSITIVITY
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
    const scale = distance / pinchStartDistance;
    if (!isFinite(scale) || scale <= 0) {
      return;
    }
    setCameraZoomTarget(pinchStartZoomTarget * scale);
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

  audioSubtitles = createAudioSubtitles({ container: document.body });

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
          if (bed.id !== 'backyard-greenhouse-chimes') {
            return;
          }
          audioBeds.push({
            ...bed,
            caption: 'Greenhouse chimes shimmer around the lantern-lined path.',
            source: createLoopingSource(bed.id, (context) =>
              createLanternChimeBuffer(context)
            ),
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

    if (!ambientCaptionBridge && audioSubtitles) {
      ambientCaptionBridge = new AmbientCaptionBridge({
        controller: ambientAudioController,
        subtitles: audioSubtitles,
      });
    }

    audioHudHandle = createAudioHudControl({
      container: hudSettingsStack,
      getEnabled: () => ambientAudioController?.isEnabled() ?? false,
      setEnabled: async (enabled) => {
        if (!ambientAudioController) {
          return;
        }
        if (enabled) {
          try {
            await ambientAudioController.enable();
          } catch (error) {
            console.warn('Ambient audio failed to start', error);
          }
        } else {
          ambientAudioController.disable();
        }
      },
      getVolume: () => getAmbientAudioVolume(),
      setVolume: (volume) => {
        setAmbientAudioVolume(volume);
      },
    });
    registerHudControlElement(audioHudHandle?.element);

    manualModeToggle = createManualModeToggle({
      container: hudSettingsStack,
      strings: modeToggleStrings,
      getIsFallbackActive: () => performanceFailover.hasTriggered(),
      onToggle: () => {
        writeModePreference('text');
        if (!performanceFailover.hasTriggered()) {
          performanceFailover.triggerFallback('manual');
        }
      },
    });
    registerHudControlElement(manualModeToggle?.element ?? null);

    tourGuideToggleControl = createTourGuideToggleControl({
      container: hudSettingsStack,
      initialEnabled: initialGuidedTourEnabled,
      onToggle: (enabled) => {
        guidedTourChannel?.setEnabled(enabled);
        writeGuidedTourEnabled(enabled);
      },
    });
    registerHudControlElement(tourGuideToggleControl?.element ?? null);

    tourResetControl = createTourResetControl({
      container: hudSettingsStack,
      subscribeVisited: (listener) => poiVisitedState.subscribe(listener),
      onReset: () => {
        poiVisitedState.reset();
      },
    });
    registerHudControlElement(tourResetControl?.element ?? null);
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
    responsiveControlOverlay?.setLayout(hudLayoutManager.getLayout());
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

  motionBlurController = createMotionBlurController({ intensity: 0.6 });
  composer.addPass(motionBlurController.pass);
  motionBlurController.pass.renderToScreen = true;

  let qualityStorage: Storage | undefined;
  try {
    qualityStorage = window.localStorage;
  } catch {
    qualityStorage = undefined;
  }

  graphicsQualityManager = createGraphicsQualityManager({
    renderer,
    bloomPass: bloomPass ?? undefined,
    ledStripMaterials,
    ledFillLights: ledFillLightsList,
    basePixelRatio: Math.min(window.devicePixelRatio ?? 1, 2),
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
    motionBlurControl?.refresh();
  }

  motionBlurControl = createMotionBlurControl({
    container: hudSettingsStack,
    getIntensity: () =>
      accessibilityPresetManager?.getBaseMotionBlurIntensity() ??
      motionBlurController?.getIntensity() ??
      0,
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

  accessibilityControlHandle = createAccessibilityPresetControl({
    container: hudSettingsStack,
    options: ACCESSIBILITY_PRESETS.map(({ id, label, description }) => ({
      id,
      label,
      description,
    })),
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
    presets: GRAPHICS_QUALITY_PRESETS,
    getActiveLevel: () =>
      graphicsQualityManager?.getLevel() ?? GRAPHICS_QUALITY_PRESETS[0].id,
    setActiveLevel: (level) => {
      graphicsQualityManager?.setLevel(level);
    },
  });
  registerHudControlElement(graphicsQualityControl?.element ?? null);

  unsubscribeGraphicsQuality = graphicsQualityManager.onChange(() => {
    graphicsQualityControl?.refresh();
    ledAnimator?.captureBaseline();
    environmentLightAnimator?.captureBaseline();
  });

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
    const nextPixelRatio = Math.min(window.devicePixelRatio ?? 1, 2);
    if (graphicsQualityManager) {
      graphicsQualityManager.setBasePixelRatio(nextPixelRatio);
    } else {
      renderer.setPixelRatio(nextPixelRatio);
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
      } else {
        targetVelocity.x = 0;
        velocity.x = 0;
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
      } else {
        targetVelocity.z = 0;
        velocity.z = 0;
      }
    }

    updatePlayerVerticalPosition();

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
      player.position.y,
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
    for (const poi of poiInstances) {
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

      poiPlayerOffset.set(
        player.position.x - poi.group.position.x,
        player.position.z - poi.group.position.z
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

      if (poi.label && poi.labelMaterial) {
        const labelOpacity = computePoiLabelOpacity(emphasis, visitedEmphasis);
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
    if (closestPoi && highestActivation >= 0.6) {
      setInteractablePoi(closestPoi);
    } else {
      setInteractablePoi(null);
    }
  }

  function setInteractablePoi(poi: PoiInstance | null) {
    if (interactablePoi === poi) {
      return;
    }
    interactablePoi = poi;
    if (movementLegend) {
      if (poi) {
        movementLegend.setInteractPrompt(poi.definition.interactionPrompt);
      } else {
        movementLegend.setInteractPrompt(null);
      }
    }
    if (!interactControl || !interactDescription) {
      return;
    }
    if (poi) {
      interactControl.hidden = false;
      interactDescription.textContent = poi.definition.interactionPrompt;
    } else {
      interactControl.hidden = true;
      interactDescription.textContent = interactDescriptionFallback;
    }
  }

  function handleInteractionInput() {
    const pressed = keyBindings.isActionActive('interact', keyPressSource);
    if (pressed && !interactKeyWasPressed && interactablePoi) {
      poiInteractionManager.selectPoiById(interactablePoi.definition.id);
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

  function disposeImmersiveResources() {
    if (immersiveDisposed) {
      return;
    }
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
    poiInteractionManager.dispose();
    removeHoverListener();
    removeSelectionStateListener();
    removeSelectionListener();
    removeVisitedSubscription();
    if (removeGuidedTourSubscription) {
      removeGuidedTourSubscription();
      removeGuidedTourSubscription = null;
    }
    guidedTourChannel?.dispose();
    guidedTourChannel = null;
    if (githubRepoMetrics) {
      githubRepoMetrics.dispose();
      githubRepoMetrics = null;
    }
    interactionTimeline.dispose();
    poiTooltipOverlay.dispose();
    poiWorldTooltip.dispose();
    poiTourGuide.dispose();
    if (manualModeToggle) {
      manualModeToggle.dispose();
      manualModeToggle = null;
    }
    if (tourGuideToggleControl) {
      tourGuideToggleControl.dispose();
      tourGuideToggleControl = null;
    }
    if (tourResetControl) {
      tourResetControl.dispose();
      tourResetControl = null;
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
    if (avatarVariantControl) {
      avatarVariantControl.dispose();
      avatarVariantControl = null;
    }
    if (avatarAccessoryControl) {
      avatarAccessoryControl.dispose();
      avatarAccessoryControl = null;
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
    if (unsubscribeAvatarAccessoryPresets) {
      unsubscribeAvatarAccessoryPresets();
      unsubscribeAvatarAccessoryPresets = null;
    }
    if (avatarAccessoryProgression) {
      avatarAccessoryProgression.dispose();
      avatarAccessoryProgression = null;
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
    if (window.portfolio?.input?.keyBindings) {
      delete window.portfolio.input.keyBindings;
    }
    if (window.portfolio?.avatar) {
      delete window.portfolio.avatar;
    }
    if (helpButton) {
      helpButton.textContent = buildHelpButtonText(helpLabelFallback);
      helpButton.dataset.hudAnnounce = buildHelpAnnouncement(helpLabelFallback);
    }
    if (localeToggleControl) {
      localeToggleControl.dispose();
      localeToggleControl = null;
    }
    movementLegend?.dispose();
    if (proceduralNarrator) {
      proceduralNarrator.dispose();
      proceduralNarrator = null;
    }
    if (poiNarrativeLog) {
      poiNarrativeLog.dispose();
      poiNarrativeLog = null;
    }
    if (helpModalController) {
      helpModalController.dispose();
      helpModalController = null;
    }
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
      livingRoomMediaWall = null;
    }
    if (selfieMirror) {
      selfieMirror.dispose();
      selfieMirror = null;
    }
    flywheelShowpiece = null;
    f2ClipboardConsole = null;
    sigmaWorkbench = null;
    woveLoom = null;
    jobbotTerminal = null;
    axelNavigator = null;
    tokenPlaceRack = null;
    prReaperConsole = null;
    gabrielSentry = null;
    gitshelvesInstallation = null;
  }

  let hasPresentedFirstFrame = false;

  renderer.setAnimationLoop(() => {
    try {
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;
      performanceFailover.update(delta);
      if (performanceFailover.hasTriggered()) {
        return;
      }
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
            const rampHeight = computeRampHeight(x, y);
            const predictedFloor = predictFloorId(x, y, activeFloorId);
            if (predictedFloor === 'upper') {
              if (rampHeight >= upperFloorElevation - 1e-3) {
                return upperFloorElevation;
              }
              const withinStairWidth =
                Math.abs(x - stairGeometry.centerX) <=
                stairGeometry.halfWidth + stairBehavior.transitionMargin;
              if (withinStairWidth) {
                return Math.min(upperFloorElevation, Math.max(rampHeight, 0));
              }
              return upperFloorElevation;
            }
            return Math.min(Math.max(rampHeight, 0), upperFloorElevation);
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
      if (selfieMirror) {
        selfieMirror.update({
          playerPosition: player.position,
          playerRotationY: player.rotation.y,
          playerHeight: mannequinHeight,
        });
      }
      updatePois(elapsedTime, delta);
      poiWorldTooltip.update(delta);
      handleInteractionInput();
      handleHelpInput();
      if (avatarAccessorySuite) {
        avatarAccessorySuite.update({ elapsed: elapsedTime, delta });
      }
      if (ambientAudioController) {
        ambientAudioController.update(player.position, delta);
        ambientCaptionBridge?.update();
      }
      if (livingRoomMediaWall) {
        const activation = futuroptimistPoi?.activation ?? 0;
        const focus = futuroptimistPoi?.focus ?? 0;
        livingRoomMediaWall.controller.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (flywheelShowpiece) {
        const activation = flywheelPoi?.activation ?? 0;
        const focus = flywheelPoi?.focus ?? 0;
        flywheelShowpiece.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
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
        jobbotTerminal.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
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
      if (tokenPlaceRack) {
        const activation = tokenPlacePoi?.activation ?? 0;
        const focus = tokenPlacePoi?.focus ?? 0;
        tokenPlaceRack.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
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
      if (prReaperConsole) {
        const activation = prReaperPoi?.activation ?? 0;
        const focus = prReaperPoi?.focus ?? 0;
        prReaperConsole.update({
          elapsed: elapsedTime,
          delta,
          emphasis: Math.max(activation, focus),
        });
      }
      if (backyardEnvironment) {
        backyardEnvironment.update({ elapsed: elapsedTime, delta });
      }
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
      if (selfieMirror) {
        selfieMirror.render(renderer, scene);
      }
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (!hasPresentedFirstFrame) {
        hasPresentedFirstFrame = true;
        writeModePreference('immersive');
        markDocumentReady('immersive');
      }
    } catch (error) {
      handleFatalError(error);
    }
  });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    handleFatalError(new Error('WebGL context lost during initialization.'));
  });
}
