import type { Group } from 'three';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type LightingMode = 'cinematic' | 'debug';

export interface LightingDebugConfig {
  renderer: { toneMappingExposure: number };
  ambientLight: { intensity: number };
  hemisphericLight: { intensity: number };
  directionalLight: { intensity: number };
  bloomPass?: UnrealBloomPass | null;
  ledGroup?: Group | null;
  ledFillLights?: Group | null;
  debug: {
    exposure: number;
    ambientIntensity: number;
    hemisphericIntensity: number;
    directionalIntensity: number;
    ledVisible: boolean;
    bloomEnabled: boolean;
  };
}

export interface LightingDebugController {
  getMode(): LightingMode;
  setMode(mode: LightingMode): LightingMode;
  toggle(): LightingMode;
}

export function createLightingDebugController(
  config: LightingDebugConfig
): LightingDebugController {
  let mode: LightingMode = 'cinematic';

  const cinematic = {
    exposure: config.renderer.toneMappingExposure,
    ambientIntensity: config.ambientLight.intensity,
    hemisphericIntensity: config.hemisphericLight.intensity,
    directionalIntensity: config.directionalLight.intensity,
    ledVisible: config.ledGroup?.visible ?? true,
    fillVisible: config.ledFillLights?.visible ?? true,
    bloomEnabled: config.bloomPass?.enabled ?? false,
  } as const;

  const applyCinematic = () => {
    config.renderer.toneMappingExposure = cinematic.exposure;
    config.ambientLight.intensity = cinematic.ambientIntensity;
    config.hemisphericLight.intensity = cinematic.hemisphericIntensity;
    config.directionalLight.intensity = cinematic.directionalIntensity;
    if (config.ledGroup) {
      config.ledGroup.visible = cinematic.ledVisible;
    }
    if (config.ledFillLights) {
      config.ledFillLights.visible = cinematic.fillVisible;
    }
    if (config.bloomPass) {
      config.bloomPass.enabled = cinematic.bloomEnabled;
    }
  };

  const applyDebug = () => {
    config.renderer.toneMappingExposure = config.debug.exposure;
    config.ambientLight.intensity = config.debug.ambientIntensity;
    config.hemisphericLight.intensity = config.debug.hemisphericIntensity;
    config.directionalLight.intensity = config.debug.directionalIntensity;
    if (config.ledGroup) {
      config.ledGroup.visible = config.debug.ledVisible;
    }
    if (config.ledFillLights) {
      config.ledFillLights.visible = config.debug.ledVisible;
    }
    if (config.bloomPass) {
      config.bloomPass.enabled = config.debug.bloomEnabled;
    }
  };

  const setMode = (nextMode: LightingMode): LightingMode => {
    if (mode === nextMode) {
      return mode;
    }
    mode = nextMode;
    if (mode === 'cinematic') {
      applyCinematic();
    } else {
      applyDebug();
    }
    return mode;
  };

  const toggle = (): LightingMode =>
    setMode(mode === 'cinematic' ? 'debug' : 'cinematic');

  return {
    getMode: () => mode,
    setMode,
    toggle,
  };
}
