import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

export interface PortfolioMannequinOptions {
  /**
   * Controls the implicit collision radius used to align the mannequin with the player controller.
   */
  collisionRadius?: number;
  /**
   * Primary body color applied to the torso and legs.
   */
  baseColor?: string;
  /**
   * Accent emissive color used for trims and visor highlights.
   */
  accentColor?: string;
  /**
   * Head and glove color used to suggest skin or fabric contrast.
   */
  trimColor?: string;
}

export interface PortfolioMannequinPalette {
  base: string;
  accent: string;
  trim: string;
}

export interface PortfolioMannequinBuild {
  /**
   * Root group containing the hidden collision proxy and visible meshes.
   */
  group: Group;
  /**
   * The effective collision radius that aligns with the controller physics.
   */
  collisionRadius: number;
  /**
   * Approximate visual height (from the floor to the top of the head) in world units.
   */
  height: number;
  /**
   * Applies a palette to the mannequin, updating materials in-place.
   */
  applyPalette(palette: PortfolioMannequinPalette): void;
  /**
   * Retrieves the active palette applied to the mannequin.
   */
  getPalette(): PortfolioMannequinPalette;
}

function createStandardMaterial(
  color: Color,
  options?: { emissive?: Color; emissiveIntensity?: number }
) {
  const material = new MeshStandardMaterial({
    color,
    metalness: 0.18,
    roughness: 0.62,
  });
  if (options?.emissive) {
    material.emissive = options.emissive;
    material.emissiveIntensity = options.emissiveIntensity ?? 0.4;
    material.metalness = 0.32;
    material.roughness = 0.3;
  }
  return material;
}

export function createPortfolioMannequin(
  options: PortfolioMannequinOptions = {}
): PortfolioMannequinBuild {
  const collisionRadius = options.collisionRadius ?? 0.75;
  const initialPalette: PortfolioMannequinPalette = {
    base: options.baseColor ?? '#283347',
    accent: options.accentColor ?? '#57d7ff',
    trim: options.trimColor ?? '#f7c77d',
  };

  const group = new Group();
  group.name = 'PortfolioMannequin';

  const collisionProxy = new Mesh(
    new SphereGeometry(collisionRadius, 32, 32),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  collisionProxy.name = 'PortfolioMannequinCollisionProxy';
  collisionProxy.visible = false;
  group.add(collisionProxy);

  const mannequinRoot = new Group();
  mannequinRoot.name = 'PortfolioMannequinVisual';
  mannequinRoot.position.y = -collisionRadius;
  group.add(mannequinRoot);

  const platformMaterial = createStandardMaterial(
    new Color(initialPalette.accent),
    {
      emissive: new Color(initialPalette.accent),
      emissiveIntensity: 0.55,
    }
  );
  const platformHeight = 0.08;
  const platform = new Mesh(
    new CylinderGeometry(0.58, 0.58, platformHeight, 48),
    platformMaterial
  );
  platform.name = 'PortfolioMannequinPlatform';
  platform.position.y = platformHeight / 2;
  platform.castShadow = true;
  platform.receiveShadow = true;
  mannequinRoot.add(platform);

  const legMaterial = createStandardMaterial(new Color(initialPalette.base));
  const legHeight = 0.92;
  const legs = new Mesh(
    new CylinderGeometry(0.26, 0.3, legHeight, 32),
    legMaterial
  );
  legs.name = 'PortfolioMannequinLegs';
  legs.position.y = platform.position.y + legHeight / 2;
  legs.castShadow = true;
  legs.receiveShadow = true;
  mannequinRoot.add(legs);

  const footGeometry = new BoxGeometry(0.24, 0.08, 0.36);
  const leftFootMaterial = legMaterial.clone();
  const rightFootMaterial = legMaterial.clone();

  const footBaseHeight = platform.position.y + platformHeight / 2;
  const footForwardOffset = 0.12;
  const footOuterOffset = 0.26;

  const leftFoot = new Group();
  leftFoot.name = 'PortfolioMannequinFootLeft';
  leftFoot.position.set(-footOuterOffset, footBaseHeight, footForwardOffset);
  mannequinRoot.add(leftFoot);

  const leftFootMesh = new Mesh(footGeometry, leftFootMaterial);
  leftFootMesh.name = 'PortfolioMannequinFootLeftMesh';
  leftFootMesh.position.y = (footGeometry.parameters.height as number) / 2;
  leftFootMesh.castShadow = true;
  leftFootMesh.receiveShadow = true;
  leftFoot.add(leftFootMesh);

  const rightFoot = new Group();
  rightFoot.name = 'PortfolioMannequinFootRight';
  rightFoot.position.set(footOuterOffset, footBaseHeight, footForwardOffset);
  mannequinRoot.add(rightFoot);

  const rightFootMesh = new Mesh(footGeometry, rightFootMaterial);
  rightFootMesh.name = 'PortfolioMannequinFootRightMesh';
  rightFootMesh.position.y = (footGeometry.parameters.height as number) / 2;
  rightFootMesh.castShadow = true;
  rightFootMesh.receiveShadow = true;
  rightFoot.add(rightFootMesh);

  const accentBand = new Mesh(
    new TorusGeometry(0.34, 0.05, 20, 48),
    platformMaterial.clone()
  );
  accentBand.name = 'PortfolioMannequinWaistBand';
  accentBand.rotation.x = Math.PI / 2;
  accentBand.position.y = legs.position.y + 0.42;
  accentBand.castShadow = true;
  accentBand.receiveShadow = true;
  mannequinRoot.add(accentBand);

  const accentBandMaterial = accentBand.material as MeshStandardMaterial;

  const torsoMaterial = createStandardMaterial(new Color(initialPalette.base));
  const torso = new Mesh(
    new CylinderGeometry(0.46, 0.36, 0.86, 32),
    torsoMaterial
  );
  torso.name = 'PortfolioMannequinTorso';
  torso.position.y = accentBand.position.y + 0.48;
  torso.castShadow = true;
  torso.receiveShadow = true;
  mannequinRoot.add(torso);

  const shoulderMaterial = createStandardMaterial(
    new Color(initialPalette.base)
  );
  const armGeometry = new CylinderGeometry(0.16, 0.18, 0.82, 24);

  const leftArm = new Mesh(armGeometry, shoulderMaterial);
  leftArm.name = 'PortfolioMannequinArmLeft';
  leftArm.position.set(-0.52, torso.position.y + 0.16, 0);
  leftArm.rotation.z = Math.PI / 6;
  leftArm.castShadow = true;
  leftArm.receiveShadow = true;
  mannequinRoot.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.name = 'PortfolioMannequinArmRight';
  rightArm.position.x *= -1;
  rightArm.rotation.z *= -1;
  rightArm.castShadow = true;
  rightArm.receiveShadow = true;
  mannequinRoot.add(rightArm);

  const cuffMaterial = createStandardMaterial(
    new Color(initialPalette.accent),
    {
      emissive: new Color(initialPalette.accent),
      emissiveIntensity: 0.6,
    }
  );
  const leftCuff = new Mesh(
    new TorusGeometry(0.16, 0.035, 14, 32),
    cuffMaterial
  );
  leftCuff.name = 'PortfolioMannequinCuffLeft';
  leftCuff.rotation.x = Math.PI / 2;
  leftCuff.position.copy(leftArm.position).setY(leftArm.position.y - 0.36);
  mannequinRoot.add(leftCuff);

  const rightCuff = leftCuff.clone();
  rightCuff.name = 'PortfolioMannequinCuffRight';
  rightCuff.position.x *= -1;
  mannequinRoot.add(rightCuff);

  const trimMaterial = createStandardMaterial(new Color(initialPalette.trim));
  const gloveGeometry = new CylinderGeometry(0.18, 0.18, 0.22, 18);
  const leftGlove = new Mesh(gloveGeometry, trimMaterial);
  leftGlove.name = 'PortfolioMannequinGloveLeft';
  leftGlove.position.set(
    leftArm.position.x - 0.02,
    leftCuff.position.y - 0.2,
    0
  );
  leftGlove.rotation.z = leftArm.rotation.z;
  leftGlove.castShadow = true;
  leftGlove.receiveShadow = true;
  mannequinRoot.add(leftGlove);

  const rightGlove = leftGlove.clone();
  rightGlove.name = 'PortfolioMannequinGloveRight';
  rightGlove.position.x *= -1;
  rightGlove.rotation.z *= -1;
  rightGlove.castShadow = true;
  rightGlove.receiveShadow = true;
  mannequinRoot.add(rightGlove);

  const collarMaterial = createStandardMaterial(
    new Color(initialPalette.accent),
    {
      emissive: new Color(initialPalette.accent).multiplyScalar(0.9),
      emissiveIntensity: 0.7,
    }
  );
  const collar = new Mesh(
    new TorusGeometry(0.3, 0.045, 16, 36),
    collarMaterial
  );
  collar.name = 'PortfolioMannequinCollar';
  collar.rotation.x = Math.PI / 2;
  collar.position.y = torso.position.y + 0.46;
  mannequinRoot.add(collar);

  const headMaterial = createStandardMaterial(new Color(initialPalette.trim));
  const head = new Mesh(new SphereGeometry(0.28, 32, 32), headMaterial);
  head.name = 'PortfolioMannequinHead';
  head.position.y = collar.position.y + 0.32;
  head.castShadow = true;
  head.receiveShadow = true;
  mannequinRoot.add(head);

  // Add a simple smiley face marker to the front of the head for directionality.
  const faceMaterial = new MeshBasicMaterial({ color: 0x000000 });
  const eyeGeometry = new SphereGeometry(0.03, 12, 12);
  const leftEye = new Mesh(eyeGeometry, faceMaterial);
  leftEye.name = 'PortfolioMannequinFaceLeftEye';
  leftEye.position.set(-0.08, head.position.y + 0.06, 0.25);
  mannequinRoot.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.name = 'PortfolioMannequinFaceRightEye';
  rightEye.position.x *= -1;
  mannequinRoot.add(rightEye);

  // Mouth as a thin torus segment to suggest a smile on the front side.
  const mouth = new Mesh(
    new TorusGeometry(0.09, 0.012, 8, 24, Math.PI),
    faceMaterial
  );
  mouth.name = 'PortfolioMannequinFaceMouth';
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, head.position.y - 0.02, 0.25);
  mannequinRoot.add(mouth);

  const visorMaterial = createStandardMaterial(
    new Color(initialPalette.accent),
    {
      emissive: new Color(initialPalette.accent),
      emissiveIntensity: 0.65,
    }
  );
  visorMaterial.transparent = true;
  visorMaterial.opacity = 0.72;
  visorMaterial.side = DoubleSide;
  const visor = new Mesh(
    new CylinderGeometry(0.27, 0.27, 0.16, 32, 1, true),
    visorMaterial
  );
  visor.name = 'PortfolioMannequinVisor';
  visor.rotation.x = Math.PI / 2;
  visor.position.y = head.position.y;
  mannequinRoot.add(visor);

  const crestMaterial = createStandardMaterial(
    new Color(initialPalette.accent),
    {
      emissive: new Color(initialPalette.accent).multiplyScalar(0.6),
      emissiveIntensity: 0.5,
    }
  );
  const crest = new Mesh(new ConeGeometry(0.12, 0.24, 24), crestMaterial);
  crest.name = 'PortfolioMannequinCrest';
  crest.position.y = head.position.y + 0.3;
  mannequinRoot.add(crest);

  const totalHeight = crest.position.y + 0.12; // crest tip sits half the cone height above position

  group.userData.boundingRadius = collisionRadius;
  group.userData.visualHeight = totalHeight;

  let currentPalette: PortfolioMannequinPalette = {
    base: `#${new Color(initialPalette.base).getHexString()}`,
    accent: `#${new Color(initialPalette.accent).getHexString()}`,
    trim: `#${new Color(initialPalette.trim).getHexString()}`,
  };

  const applyPalette = (palette: PortfolioMannequinPalette) => {
    const baseColor = new Color(palette.base);
    const accentColor = new Color(palette.accent);
    const trimColor = new Color(palette.trim);

    currentPalette = {
      base: `#${baseColor.getHexString()}`,
      accent: `#${accentColor.getHexString()}`,
      trim: `#${trimColor.getHexString()}`,
    };

    const legColor = baseColor.clone().multiplyScalar(0.9);
    legMaterial.color.copy(legColor);
    leftFootMaterial.color.copy(legColor);
    rightFootMaterial.color.copy(legColor);

    torsoMaterial.color.copy(baseColor).offsetHSL(0.02, -0.08, 0.08);
    shoulderMaterial.color.copy(baseColor).offsetHSL(-0.04, 0.04, 0.05);

    const platformColor = accentColor.clone().multiplyScalar(0.72);
    const platformEmissive = accentColor.clone().multiplyScalar(0.45);
    platformMaterial.color.copy(platformColor);
    platformMaterial.emissive.copy(platformEmissive);
    accentBandMaterial.color.copy(platformColor);
    accentBandMaterial.emissive.copy(platformEmissive);

    cuffMaterial.color.copy(accentColor);
    cuffMaterial.emissive.copy(accentColor);

    collarMaterial.color.copy(accentColor);
    collarMaterial.emissive.copy(accentColor).multiplyScalar(0.9);

    visorMaterial.color.copy(accentColor);
    visorMaterial.emissive.copy(accentColor);

    crestMaterial.color.copy(accentColor).offsetHSL(-0.03, 0.1, 0.08);
    crestMaterial.emissive.copy(accentColor).multiplyScalar(0.6);

    trimMaterial.color.copy(trimColor).offsetHSL(0, -0.1, 0.1);
    headMaterial.color.copy(trimColor).offsetHSL(0.04, -0.18, 0.18);
  };

  applyPalette(initialPalette);

  return {
    group,
    collisionRadius,
    height: totalHeight,
    applyPalette,
    getPalette() {
      return { ...currentPalette };
    },
  };
}
