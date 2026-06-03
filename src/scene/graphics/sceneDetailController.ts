import {
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
} from 'three';

import type { GraphicsQualityLevel } from './qualityManager';
import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from './sceneDetailPolicy';

export interface SceneDetailController {
  getPolicy(): SceneDetailPolicy;
  setLevel(level: GraphicsQualityLevel): void;
  register(root: Object3D): void;
  shouldRunDecorativeUpdate(elapsedSeconds: number): boolean;
}

export function createSceneDetailController(
  initialLevel: GraphicsQualityLevel
): SceneDetailController {
  const roots = new Set<Object3D>();
  let policy = getSceneDetailPolicy(initialLevel);
  let lastDecorativeUpdateMs = Number.NEGATIVE_INFINITY;

  const applyObject = (object: Object3D) => {
    const detailRole = object.userData.sceneDetailRole;
    if (detailRole === 'decorative-effect') {
      object.visible = policy.effects.transparentAuras;
    }
    if (detailRole === 'performance-hidden') {
      object.visible = !policy.isPerformance;
    }
    if (
      object instanceof PointLight &&
      object.userData.sceneDetailDynamicLight
    ) {
      const baseIntensity = Number(
        object.userData.sceneDetailBaseIntensity ?? object.intensity
      );
      object.userData.sceneDetailBaseIntensity = baseIntensity;
      object.intensity = policy.effects.dynamicPointLights ? baseIntensity : 0;
      object.visible = policy.effects.dynamicPointLights;
    }
    if ('material' in object) {
      const material = object.material;
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((entry) => {
        if (
          (entry instanceof MeshStandardMaterial ||
            entry instanceof MeshBasicMaterial) &&
          entry.userData.sceneDetailTransparentEffect
        ) {
          entry.opacity = policy.effects.transparentAuras
            ? Number(entry.userData.sceneDetailBaseOpacity ?? entry.opacity)
            : 0;
          entry.needsUpdate = true;
        }
      });
    }
  };

  const applyRoot = (root: Object3D) => root.traverse(applyObject);

  return {
    getPolicy() {
      return policy;
    },
    setLevel(level) {
      policy = getSceneDetailPolicy(level);
      roots.forEach(applyRoot);
    },
    register(root) {
      roots.add(root);
      applyRoot(root);
    },
    shouldRunDecorativeUpdate(elapsedSeconds) {
      if (policy.update.decorativeThrottleMs <= 0) {
        return true;
      }
      const nowMs = elapsedSeconds * 1000;
      if (nowMs - lastDecorativeUpdateMs < policy.update.decorativeThrottleMs) {
        return false;
      }
      lastDecorativeUpdateMs = nowMs;
      return true;
    },
  };
}
