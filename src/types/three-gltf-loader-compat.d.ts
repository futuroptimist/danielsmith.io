export {};

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  interface GLTFLoader {
    setDRACOLoader(loader: {
      setDecoderPath(path: string): void;
      dispose(): void;
    }): this;
  }
}
