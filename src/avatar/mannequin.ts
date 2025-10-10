import {
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
  const baseColor = new Color(options.baseColor ?? '#283347');
  const accentColor = new Color(options.accentColor ?? '#57d7ff');
  const trimColor = new Color(options.trimColor ?? '#f7c77d');

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

  const platformMaterial = createStandardMaterial(accentColor.clone().multiplyScalar(0.72), {
    emissive: accentColor.clone().multiplyScalar(0.45),
    emissiveIntensity: 0.55,
  });
  const platformHeight = 0.08;
  const platform = new Mesh(new CylinderGeometry(0.58, 0.58, platformHeight, 48), platformMaterial);
  platform.name = 'PortfolioMannequinPlatform';
  platform.position.y = platformHeight / 2;
  platform.castShadow = true;
  platform.receiveShadow = true;
  mannequinRoot.add(platform);

  const legMaterial = createStandardMaterial(baseColor.clone().multiplyScalar(0.9));
  const legHeight = 0.92;
  const legs = new Mesh(new CylinderGeometry(0.26, 0.3, legHeight, 32), legMaterial);
  legs.name = 'PortfolioMannequinLegs';
  legs.position.y = platform.position.y + legHeight / 2;
  legs.castShadow = true;
  legs.receiveShadow = true;
  mannequinRoot.add(legs);

  const accentBand = new Mesh(new TorusGeometry(0.34, 0.05, 20, 48), platformMaterial.clone());
  accentBand.name = 'PortfolioMannequinWaistBand';
  accentBand.rotation.x = Math.PI / 2;
  accentBand.position.y = legs.position.y + 0.42;
  accentBand.castShadow = true;
  accentBand.receiveShadow = true;
  mannequinRoot.add(accentBand);

  const torsoMaterial = createStandardMaterial(baseColor.clone().offsetHSL(0.02, -0.08, 0.08));
  const torso = new Mesh(new CylinderGeometry(0.46, 0.36, 0.86, 32), torsoMaterial);
  torso.name = 'PortfolioMannequinTorso';
  torso.position.y = accentBand.position.y + 0.48;
  torso.castShadow = true;
  torso.receiveShadow = true;
  mannequinRoot.add(torso);

  const shoulderMaterial = createStandardMaterial(baseColor.clone().offsetHSL(-0.04, 0.04, 0.05));
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

  const cuffMaterial = createStandardMaterial(accentColor.clone(), {
    emissive: accentColor.clone(),
    emissiveIntensity: 0.6,
  });
  const leftCuff = new Mesh(new TorusGeometry(0.16, 0.035, 14, 32), cuffMaterial);
  leftCuff.name = 'PortfolioMannequinCuffLeft';
  leftCuff.rotation.x = Math.PI / 2;
  leftCuff.position.copy(leftArm.position).setY(leftArm.position.y - 0.36);
  mannequinRoot.add(leftCuff);

  const rightCuff = leftCuff.clone();
  rightCuff.name = 'PortfolioMannequinCuffRight';
  rightCuff.position.x *= -1;
  mannequinRoot.add(rightCuff);

  const trimMaterial = createStandardMaterial(trimColor.clone().offsetHSL(0, -0.1, 0.1));
  const gloveGeometry = new CylinderGeometry(0.18, 0.18, 0.22, 18);
  const leftGlove = new Mesh(gloveGeometry, trimMaterial);
  leftGlove.name = 'PortfolioMannequinGloveLeft';
  leftGlove.position.set(leftArm.position.x - 0.02, leftCuff.position.y - 0.2, 0);
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

  const collarMaterial = createStandardMaterial(accentColor.clone(), {
    emissive: accentColor.clone().multiplyScalar(0.9),
    emissiveIntensity: 0.7,
  });
  const collar = new Mesh(new TorusGeometry(0.3, 0.045, 16, 36), collarMaterial);
  collar.name = 'PortfolioMannequinCollar';
  collar.rotation.x = Math.PI / 2;
  collar.position.y = torso.position.y + 0.46;
  mannequinRoot.add(collar);

  const headMaterial = createStandardMaterial(trimColor.clone().offsetHSL(0.04, -0.18, 0.18));
  const head = new Mesh(new SphereGeometry(0.28, 32, 32), headMaterial);
  head.name = 'PortfolioMannequinHead';
  head.position.y = collar.position.y + 0.32;
  head.castShadow = true;
  head.receiveShadow = true;
  mannequinRoot.add(head);

  const visorMaterial = createStandardMaterial(accentColor.clone(), {
    emissive: accentColor.clone(),
    emissiveIntensity: 0.65,
  });
  visorMaterial.transparent = true;
  visorMaterial.opacity = 0.72;
  visorMaterial.side = DoubleSide;
  const visor = new Mesh(new CylinderGeometry(0.27, 0.27, 0.16, 32, 1, true), visorMaterial);
  visor.name = 'PortfolioMannequinVisor';
  visor.rotation.x = Math.PI / 2;
  visor.position.y = head.position.y;
  mannequinRoot.add(visor);

  const crestMaterial = createStandardMaterial(accentColor.clone().offsetHSL(-0.03, 0.1, 0.08), {
    emissive: accentColor.clone().multiplyScalar(0.6),
    emissiveIntensity: 0.5,
  });
  const crest = new Mesh(new ConeGeometry(0.12, 0.24, 24), crestMaterial);
  crest.name = 'PortfolioMannequinCrest';
  crest.position.y = head.position.y + 0.3;
  mannequinRoot.add(crest);

  const totalHeight = crest.position.y + 0.12; // crest tip sits half the cone height above position

  group.userData.boundingRadius = collisionRadius;
  group.userData.visualHeight = totalHeight;

  return {
    group,
    collisionRadius,
    height: totalHeight,
  };
}
