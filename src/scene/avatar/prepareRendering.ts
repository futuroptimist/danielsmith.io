import {
  Mesh,
  MeshStandardMaterial,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

/** Prepare the skin's GPU resources before replacing the loading presentation. */
export async function prepareAvatarRendering(
  renderer: WebGLRenderer,
  model: Object3D,
  camera: Camera,
  scene: Scene,
  signal: AbortSignal,
  companions: Object3D[] = []
): Promise<boolean> {
  if (signal.aborted) return false;
  const existing = new Set(renderer.info.programs ?? []);
  const roots = [model, ...companions];
  const textures = new Set<Texture>();
  const materials = new Map<
    Material,
    { transparent: boolean; depthWrite: boolean }
  >();
  roots.forEach((root) =>
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!materials.has(material))
          materials.set(material, {
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          });
        if (material instanceof MeshStandardMaterial && material.map)
          textures.add(material.map);
      }
    })
  );
  roots.forEach((root) => renderer.compile(root, camera, scene));
  // Opacity mode changes Three's program key. Warm the reveal variant too, including
  // reparented accessories and the recovery body, before any visible handoff starts.
  try {
    materials.forEach((_, material) => {
      material.transparent = true;
      material.depthWrite = false;
      material.needsUpdate = true;
    });
    roots.forEach((root) => renderer.compile(root, camera, scene));
  } finally {
    materials.forEach((original, material) => {
      Object.assign(material, original);
      material.needsUpdate = true;
    });
  }
  textures.forEach((texture) => renderer.initTexture(texture));
  const pending = (renderer.info.programs ?? []).filter(
    (program) => !existing.has(program)
  );
  const extension = renderer.extensions.has('KHR_parallel_shader_compile')
    ? renderer.extensions.get('KHR_parallel_shader_compile')
    : null;
  if (!extension || !pending.length) return !signal.aborted;
  const gl = renderer.getContext();
  // Unlike compileAsync's internal polling, this loop can stop before querying a disposed context.
  return new Promise<boolean>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      resolve(false);
    };
    const check = () => {
      if (signal.aborted) return abort();
      try {
        if (
          pending.every((program) =>
            gl.getProgramParameter(
              program.program,
              extension.COMPLETION_STATUS_KHR
            )
          )
        ) {
          cleanup();
          resolve(true);
        } else if (performance.now() - started >= 5000) {
          cleanup();
          reject(new Error('Avatar GPU preparation timed out.'));
        } else timer = setTimeout(check, 10);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    signal.addEventListener('abort', abort, { once: true });
    check();
  });
}
