import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PCFSoftShadowMap,
  Scene,
  WebGLRenderer,
} from '../../node_modules/three/build/three.module.js';
import { OrbitControls } from '../../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { WebGPURenderer } from '../../node_modules/three/examples/jsm/renderers/WebGPURenderer.js';
import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../../node_modules/three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from '../../node_modules/three/examples/jsm/loaders/KTX2Loader.js';

/**
 * @typedef {Object} RendererConfig
 * @property {HTMLCanvasElement} canvas Target canvas for rendering.
 * @property {boolean} [antialias]
 * @property {boolean} [alpha]
 */

/**
 * Creates a renderer with WebGPU fallback to WebGL.
 * @param {RendererConfig} config
 * @returns {Promise<{ renderer: import('three').Renderer; isWebGPU: boolean }>}
 */
export async function createRenderer(config) {
  const { canvas, antialias = true, alpha = false } = config;
  const common = { canvas, antialias, alpha };

  if (navigator.gpu) {
    try {
      const webgpuRenderer = new WebGPURenderer(common);
      await webgpuRenderer.init();
      return { renderer: webgpuRenderer, isWebGPU: true };
    } catch (error) {
      console.warn('WebGPU renderer failed to initialize. Falling back to WebGL.', error);
    }
  }

  const webglRenderer = new WebGLRenderer(common);
  return { renderer: webglRenderer, isWebGPU: false };
}

/**
 * @typedef {Object} LoaderConfig
 * @property {string} [dracoPath] Base path for Draco decoder files.
 * @property {string} [ktx2Path] Base path for Basis Universal transcoder files.
 */

/**
 * Configures a GLTFLoader with Draco and KTX2 support.
 * @param {import('three').Renderer} renderer
 * @param {LoaderConfig} [config]
 * @returns {{ gltfLoader: GLTFLoader; ktx2Loader: KTX2Loader; dracoLoader: DRACOLoader }}
 */
export function createAssetLoaders(renderer, config = {}) {
  const { dracoPath = './libs/draco/', ktx2Path = './libs/basis/' } = config;

  const ktx2Loader = new KTX2Loader().setTranscoderPath(ktx2Path);
  ktx2Loader.detectSupport(renderer);

  const dracoLoader = new DRACOLoader().setDecoderPath(dracoPath);
  dracoLoader.preload();

  const gltfLoader = new GLTFLoader();
  gltfLoader.setKTX2Loader(ktx2Loader);
  gltfLoader.setDRACOLoader(dracoLoader);

  return { gltfLoader, ktx2Loader, dracoLoader };
}

/**
 * @typedef {Object} LoadModelOptions
 * @property {(event: ProgressEvent<EventTarget>) => void} [onProgress]
 * @property {AbortSignal} [signal]
 * @property {boolean} [preferCompressed]
 */

/**
 * Loads a glTF model and falls back to an alternative asset when decoding fails.
 * @param {GLTFLoader} gltfLoader
 * @param {string} compressedUrl
 * @param {string} fallbackUrl
 * @param {LoadModelOptions} [options]
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>}
 */
export async function loadModelWithFallback(
  gltfLoader,
  compressedUrl,
  fallbackUrl,
  options = {},
) {
  const preferCompressed = options.preferCompressed ?? true;

  if (preferCompressed) {
    try {
      return await loadAsync(gltfLoader, compressedUrl, options);
    } catch (error) {
      console.warn('Compressed model failed to load. Attempting fallback.', error);
    }
  }

  try {
    return await loadAsync(gltfLoader, fallbackUrl, options);
  } catch (error) {
    console.error('Fallback model failed to load. Using procedural placeholder.', error);
    return createPlaceholderGLTF();
  }
}

/**
 * Creates an always-available placeholder so scenes remain interactive.
 * @returns {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF}
 */
function createPlaceholderGLTF() {
  const group = new Group();
  const material = new MeshStandardMaterial({
    color: new Color('#38bdf8'),
    roughness: 0.35,
  });
  const mesh = new Mesh(new BoxGeometry(1.6, 1.6, 1.6), material);
  group.add(mesh);

  return {
    scene: group,
    scenes: [group],
    cameras: [],
    animations: [],
    asset: { version: 'placeholder' },
  };
}

/**
 * Promisified wrapper around GLTFLoader.load.
 * @param {GLTFLoader} loader
 * @param {string} url
 * @param {LoadModelOptions} options
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>}
 */
function loadAsync(loader, url, options) {
  const { onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    const abortListener = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', abortListener, { once: true });
    }

    loader.load(
      url,
      (gltf) => {
        signal?.removeEventListener('abort', abortListener);
        resolve(gltf);
      },
      onProgress,
      (error) => {
        signal?.removeEventListener('abort', abortListener);
        reject(error);
      },
    );
  });
}

/**
 * Builds the default scene objects for the showcase demo.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ scene: Scene; camera: PerspectiveCamera; controls: OrbitControls; renderer: import('three').Renderer; isWebGPU: boolean }}
 */
export async function bootstrapScene(canvas) {
  const { renderer, isWebGPU } = await createRenderer({ canvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('shadowMap' in renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }

  const scene = new Scene();
  scene.background = new Color('#0f172a');

  const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(14, 8, 20);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enabled = false;

  return { scene, camera, controls, renderer, isWebGPU };
}

/**
 * Keeps renderer + camera sizing in sync with the viewport.
 * @param {import('three').Renderer} renderer
 * @param {PerspectiveCamera} camera
 */
export function bindResize(renderer, camera) {
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if ('setSize' in renderer) {
      renderer.setSize(width, height, false);
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

/**
 * Starts a shared render loop for WebGL/WebGPU renderers.
 * @param {import('three').Renderer} renderer
 * @param {Scene} scene
 * @param {PerspectiveCamera} camera
 * @param {OrbitControls} controls
 */
export function startRenderLoop(renderer, scene, camera, controls) {
  const loop = () => {
    controls.update();
    renderer.render(scene, camera);
  };

  if ('setAnimationLoop' in renderer) {
    renderer.setAnimationLoop(loop);
  } else {
    const animate = () => {
      loop();
      requestAnimationFrame(animate);
    };
    animate();
  }
}
