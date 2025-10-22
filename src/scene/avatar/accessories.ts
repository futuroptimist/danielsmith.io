import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import type {
  PortfolioMannequinBuild,
  PortfolioMannequinPalette,
} from './mannequin';

export type AvatarAccessoryId = 'wrist-console' | 'holo-drone';

export interface AvatarAccessoryDefinition {
  readonly id: AvatarAccessoryId;
  readonly label: string;
  readonly description: string;
}

export interface AvatarAccessoryState {
  readonly id: AvatarAccessoryId;
  readonly enabled: boolean;
}

export interface AvatarAccessoryUpdateContext {
  readonly elapsed: number;
  readonly delta: number;
}

export interface AvatarAccessorySuite {
  readonly definitions: readonly AvatarAccessoryDefinition[];
  getState(): AvatarAccessoryState[];
  isEnabled(id: AvatarAccessoryId): boolean;
  setEnabled(id: AvatarAccessoryId, enabled: boolean): void;
  toggle(id: AvatarAccessoryId): void;
  applyPalette(palette: PortfolioMannequinPalette): void;
  update(context: AvatarAccessoryUpdateContext): void;
  dispose(): void;
}

interface AvatarAccessoryInternal {
  readonly definition: AvatarAccessoryDefinition;
  readonly group: Group;
  enabled: boolean;
  readonly updatePalette: (palette: PortfolioMannequinPalette) => void;
  readonly update: (context: AvatarAccessoryUpdateContext) => void;
  readonly dispose: () => void;
}

const DEFINITIONS: readonly AvatarAccessoryDefinition[] = [
  {
    id: 'wrist-console',
    label: 'Wrist console',
    description: 'Wearable telemetry cuff that mirrors HUD diagnostics.',
  },
  {
    id: 'holo-drone',
    label: 'Holographic drone',
    description: 'Shoulder scout drone with a gentle orbiting glow.',
  },
];

function assertObject3D(
  value: unknown,
  message: string
): asserts value is Object3D {
  if (!(value instanceof Object3D)) {
    throw new Error(message);
  }
}

function disposeGroup(group: Group): void {
  group.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  group.removeFromParent();
}

function createWristConsole(
  mannequin: PortfolioMannequinBuild
): AvatarAccessoryInternal {
  const glove = mannequin.group.getObjectByName('PortfolioMannequinGloveLeft');
  assertObject3D(
    glove,
    'Portfolio mannequin glove target missing for wrist console accessory.'
  );

  const consoleGroup = new Group();
  consoleGroup.name = 'MannequinAccessoryWristConsole';
  consoleGroup.visible = false;
  consoleGroup.position.set(-0.02, 0.09, 0);
  consoleGroup.rotation.x = Math.PI / 2;
  glove.add(consoleGroup);

  const strapMaterial = new MeshStandardMaterial({
    metalness: 0.32,
    roughness: 0.58,
  });
  const strap = new Mesh(new BoxGeometry(0.18, 0.3, 0.06), strapMaterial);
  strap.name = 'MannequinAccessoryWristConsoleStrap';
  strap.position.set(0, 0, 0);
  strap.castShadow = true;
  strap.receiveShadow = true;
  consoleGroup.add(strap);

  const bodyMaterial = new MeshStandardMaterial({
    metalness: 0.42,
    roughness: 0.38,
  });
  const body = new Mesh(new BoxGeometry(0.16, 0.22, 0.08), bodyMaterial);
  body.name = 'MannequinAccessoryWristConsoleBody';
  body.position.set(0.02, 0, 0.06);
  body.castShadow = true;
  body.receiveShadow = true;
  consoleGroup.add(body);

  const screenMaterial = new MeshStandardMaterial({
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const screen = new Mesh(new BoxGeometry(0.12, 0.16, 0.03), screenMaterial);
  screen.name = 'MannequinAccessoryWristConsoleScreen';
  screen.position.set(0.04, 0, 0.12);
  consoleGroup.add(screen);

  const emitterMaterial = new MeshStandardMaterial({
    metalness: 0.2,
    roughness: 0.18,
  });
  const emitter = new Mesh(
    new CylinderGeometry(0.035, 0.028, 0.08, 16),
    emitterMaterial
  );
  emitter.name = 'MannequinAccessoryWristConsoleEmitter';
  emitter.rotation.z = Math.PI / 2;
  emitter.position.set(0.05, 0, 0.16);
  consoleGroup.add(emitter);

  const updatePalette = (palette: PortfolioMannequinPalette) => {
    const baseColor = new Color(palette.base);
    const accentColor = new Color(palette.accent);
    const trimColor = new Color(palette.trim);

    strapMaterial.color.copy(baseColor).offsetHSL(0, 0, -0.08);
    bodyMaterial.color.copy(baseColor).offsetHSL(0.02, -0.04, 0.12);
    bodyMaterial.emissive = accentColor.clone().multiplyScalar(0.18);
    bodyMaterial.emissiveIntensity = 1;

    screenMaterial.color.copy(accentColor).offsetHSL(0.08, -0.2, 0.12);
    screenMaterial.emissive = accentColor.clone();
    screenMaterial.emissiveIntensity = 0.85;

    emitterMaterial.color.copy(trimColor).offsetHSL(-0.04, 0.08, 0.06);
    emitterMaterial.emissive = trimColor.clone().multiplyScalar(0.5);
    emitterMaterial.emissiveIntensity = 0.6;
  };

  return {
    definition: DEFINITIONS.find((def) => def.id === 'wrist-console')!,
    group: consoleGroup,
    enabled: false,
    updatePalette,
    update: ({ elapsed }: AvatarAccessoryUpdateContext) => {
      const pulse = Math.sin(elapsed * 2.6) * 0.08 + 0.92;
      const current = screenMaterial.emissiveIntensity ?? 0.85;
      screenMaterial.emissiveIntensity = MathUtils.lerp(current, pulse, 0.2);
    },
    dispose: () => disposeGroup(consoleGroup),
  };
}

function createHoloDrone(
  mannequin: PortfolioMannequinBuild
): AvatarAccessoryInternal {
  const mannequinRoot = mannequin.group.getObjectByName(
    'PortfolioMannequinVisual'
  );
  assertObject3D(
    mannequinRoot,
    'Portfolio mannequin visual root missing for drone accessory.'
  );

  const droneAnchor = new Group();
  droneAnchor.name = 'MannequinAccessoryHoloDrone';
  droneAnchor.visible = false;
  droneAnchor.position.set(0.68, 1.82, 0.16);
  mannequinRoot.add(droneAnchor);

  const orbitGroup = new Group();
  orbitGroup.name = 'MannequinAccessoryHoloDroneOrbit';
  droneAnchor.add(orbitGroup);

  const bodyMaterial = new MeshStandardMaterial({
    roughness: 0.28,
    metalness: 0.38,
  });
  const body = new Mesh(new SphereGeometry(0.16, 28, 28), bodyMaterial);
  body.name = 'MannequinAccessoryHoloDroneBody';
  body.castShadow = true;
  body.receiveShadow = true;
  orbitGroup.add(body);

  const haloMaterial = new MeshStandardMaterial({
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.86,
  });
  const halo = new Mesh(new TorusGeometry(0.24, 0.04, 24, 48), haloMaterial);
  halo.name = 'MannequinAccessoryHoloDroneHalo';
  halo.rotation.x = Math.PI / 2;
  orbitGroup.add(halo);

  const lensMaterial = new MeshStandardMaterial({
    roughness: 0.22,
    metalness: 0.24,
  });
  const lens = new Mesh(
    new CylinderGeometry(0.07, 0.055, 0.06, 24),
    lensMaterial
  );
  lens.name = 'MannequinAccessoryHoloDroneLens';
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.16;
  body.add(lens);

  const baseY = droneAnchor.position.y;

  const updatePalette = (palette: PortfolioMannequinPalette) => {
    const accent = new Color(palette.accent);
    const trim = new Color(palette.trim);

    bodyMaterial.color.copy(accent).offsetHSL(-0.05, 0.12, -0.08);
    bodyMaterial.emissive = accent.clone().multiplyScalar(0.42);
    bodyMaterial.emissiveIntensity = 1.12;

    haloMaterial.color.copy(accent).offsetHSL(0.08, -0.2, 0.14);
    haloMaterial.emissive = accent.clone().multiplyScalar(0.5);
    haloMaterial.emissiveIntensity = 0.8;

    lensMaterial.color.copy(trim).offsetHSL(-0.1, 0.1, 0.18);
    lensMaterial.emissive = trim.clone().multiplyScalar(0.36);
    lensMaterial.emissiveIntensity = 0.7;
  };

  const update = ({ elapsed, delta }: AvatarAccessoryUpdateContext) => {
    orbitGroup.rotation.y += delta * 0.85;
    const bob = Math.sin(elapsed * 1.6) * 0.06;
    droneAnchor.position.y = baseY + bob;
    halo.scale.setScalar(1 + Math.sin(elapsed * 2.3) * 0.05);
  };

  return {
    definition: DEFINITIONS.find((def) => def.id === 'holo-drone')!,
    group: droneAnchor,
    enabled: false,
    updatePalette,
    update,
    dispose: () => disposeGroup(droneAnchor),
  };
}

export interface AvatarAccessorySuiteOptions {
  readonly mannequin: PortfolioMannequinBuild;
  readonly initialState?: Partial<Record<AvatarAccessoryId, boolean>>;
}

export function createAvatarAccessorySuite({
  mannequin,
  initialState = {},
}: AvatarAccessorySuiteOptions): AvatarAccessorySuite {
  const accessories: AvatarAccessoryInternal[] = [
    createWristConsole(mannequin),
    createHoloDrone(mannequin),
  ];

  const palette = mannequin.getPalette();
  accessories.forEach((accessory) => {
    accessory.updatePalette(palette);
    const enabled = Boolean(initialState[accessory.definition.id]);
    accessory.enabled = enabled;
    accessory.group.visible = enabled;
  });

  const stateMap = new Map<AvatarAccessoryId, AvatarAccessoryInternal>(
    accessories.map((accessory) => [accessory.definition.id, accessory])
  );

  const getAccessory = (id: AvatarAccessoryId) => {
    const accessory = stateMap.get(id);
    if (!accessory) {
      throw new Error(`Unknown avatar accessory: ${id}`);
    }
    return accessory;
  };

  return {
    definitions: DEFINITIONS,
    getState() {
      return accessories.map((accessory) => ({
        id: accessory.definition.id,
        enabled: accessory.enabled,
      }));
    },
    isEnabled(id) {
      return getAccessory(id).enabled;
    },
    setEnabled(id, enabled) {
      const accessory = getAccessory(id);
      if (accessory.enabled === enabled) {
        accessory.group.visible = enabled;
        return;
      }
      accessory.enabled = enabled;
      accessory.group.visible = enabled;
    },
    toggle(id) {
      const accessory = getAccessory(id);
      const next = !accessory.enabled;
      accessory.enabled = next;
      accessory.group.visible = next;
    },
    applyPalette(nextPalette) {
      accessories.forEach((accessory) => accessory.updatePalette(nextPalette));
    },
    update(context) {
      accessories.forEach((accessory) => {
        if (!accessory.enabled) {
          return;
        }
        accessory.update(context);
      });
    },
    dispose() {
      accessories.forEach((accessory) => accessory.dispose());
    },
  };
}
