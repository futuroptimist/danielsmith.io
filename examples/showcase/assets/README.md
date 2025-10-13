# Showcase assets

The demo avoids storing binary `.glb` files so it works in text-only environments. Instead it
includes two textual `.gltf` documents:

- `model_compressed.gltf` references a missing Draco buffer on purpose. This allows the demo to show
  its fallback path without shipping decoder binaries or binary payloads.
- `model_uncompressed.gltf` contains an embedded-geometry cube generated from source via the helper
  snippet in the repository documentation. The loader falls back to this asset automatically.

You can regenerate the uncompressed asset with:

```bash
python scripts/generate_showcase_gltf.py
```

(Feel free to adapt the script to export different geometry.)
