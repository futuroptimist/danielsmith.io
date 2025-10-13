#!/usr/bin/env python3
"""Generate the textual glTF placeholder used by the showcase demo."""
from __future__ import annotations

import base64
import json
import struct
from pathlib import Path
from typing import Tuple

Face = Tuple[Tuple[Tuple[float, float, float], ...], Tuple[float, float, float]]

FACES: Tuple[Face, ...] = (
    (((-0.5, -0.5, 0.5), (0.5, -0.5, 0.5), (0.5, 0.5, 0.5), (-0.5, 0.5, 0.5)), (0.0, 0.0, 1.0)),
    (((0.5, -0.5, -0.5), (-0.5, -0.5, -0.5), (-0.5, 0.5, -0.5), (0.5, 0.5, -0.5)), (0.0, 0.0, -1.0)),
    (((-0.5, -0.5, -0.5), (-0.5, -0.5, 0.5), (-0.5, 0.5, 0.5), (-0.5, 0.5, -0.5)), (-1.0, 0.0, 0.0)),
    (((0.5, -0.5, 0.5), (0.5, -0.5, -0.5), (0.5, 0.5, -0.5), (0.5, 0.5, 0.5)), (1.0, 0.0, 0.0)),
    (((-0.5, 0.5, 0.5), (0.5, 0.5, 0.5), (0.5, 0.5, -0.5), (-0.5, 0.5, -0.5)), (0.0, 1.0, 0.0)),
    (((-0.5, -0.5, -0.5), (0.5, -0.5, -0.5), (0.5, -0.5, 0.5), (-0.5, -0.5, 0.5)), (0.0, -1.0, 0.0)),
)


def build_arrays() -> tuple[list[float], list[float], list[int]]:
    positions: list[float] = []
    normals: list[float] = []
    indices: list[int] = []

    for vertices, normal in FACES:
        start_index = len(positions) // 3
        positions.extend(component for vertex in vertices for component in vertex)
        normals.extend(component for _ in range(4) for component in normal)
        indices.extend(
            (
                start_index,
                start_index + 1,
                start_index + 2,
                start_index,
                start_index + 2,
                start_index + 3,
            )
        )

    return positions, normals, indices


def pack_buffer(
    positions: list[float], normals: list[float], indices: list[int]
) -> tuple[bytes, int, int, int]:
    positions_bytes = struct.pack('<' + 'f' * len(positions), *positions)
    normals_bytes = struct.pack('<' + 'f' * len(normals), *normals)
    indices_bytes = struct.pack('<' + 'H' * len(indices), *indices)

    buffer_blob = positions_bytes + normals_bytes + indices_bytes
    normals_offset = len(positions_bytes)
    indices_offset = normals_offset + len(normals_bytes)
    return buffer_blob, normals_offset, indices_offset, len(indices)


def build_gltf(
    uri: str,
    normals_offset: int,
    indices_offset: int,
    total_length: int,
    index_count: int,
) -> dict:
    vertex_count = normals_offset // (3 * 4)
    return {
        'asset': {'version': '2.0', 'generator': 'codex-python'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': 'ShowcaseCube'}],
        'materials': [
            {
                'name': 'ShowcaseMaterial',
                'pbrMetallicRoughness': {
                    'baseColorFactor': [0.22, 0.74, 0.97, 1.0],
                    'metallicFactor': 0.1,
                    'roughnessFactor': 0.35,
                },
            }
        ],
        'meshes': [
            {
                'name': 'ShowcaseMesh',
                'primitives': [
                    {
                        'attributes': {'POSITION': 0, 'NORMAL': 1},
                        'indices': 2,
                        'material': 0,
                    }
                ],
            }
        ],
        'accessors': [
            {
                'bufferView': 0,
                'componentType': 5126,
                'count': vertex_count,
                'type': 'VEC3',
                'min': [-0.5, -0.5, -0.5],
                'max': [0.5, 0.5, 0.5],
            },
            {
                'bufferView': 1,
                'componentType': 5126,
                'count': vertex_count,
                'type': 'VEC3',
            },
            {
                'bufferView': 2,
                'componentType': 5123,
                'count': index_count,
                'type': 'SCALAR',
            },
        ],
        'bufferViews': [
            {
                'buffer': 0,
                'byteOffset': 0,
                'byteLength': normals_offset,
                'target': 34962,
            },
            {
                'buffer': 0,
                'byteOffset': normals_offset,
                'byteLength': indices_offset - normals_offset,
                'target': 34962,
            },
            {
                'buffer': 0,
                'byteOffset': indices_offset,
                'byteLength': total_length - indices_offset,
                'target': 34963,
            },
        ],
        'buffers': [
            {
                'byteLength': total_length,
                'uri': uri,
            }
        ],
    }


def main() -> None:
    positions, normals, indices = build_arrays()
    buffer_blob, normals_offset, indices_offset, index_count = pack_buffer(
        positions, normals, indices
    )

    uri = 'data:application/octet-stream;base64,' + base64.b64encode(buffer_blob).decode('ascii')
    gltf = build_gltf(uri, normals_offset, indices_offset, len(buffer_blob), index_count)

    project_root = Path(__file__).resolve().parents[1]
    output_path = project_root / 'examples' / 'showcase' / 'assets' / 'model_uncompressed.gltf'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(gltf, indent=2), encoding='utf8')
    print(f'Wrote {output_path}')


if __name__ == '__main__':
    main()
