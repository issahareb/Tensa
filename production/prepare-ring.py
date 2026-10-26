"""Normalize a generated ring GLB for TENSA's small WebGL mesh renderer.
Run: blender --background --python production/prepare-ring.py -- source.glb output.glb
Preserves the source surface, removes texture payloads, and orients its thin axis to Z.
"""
import bpy, json, struct, sys
import numpy as np
from pathlib import Path

source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
positions, normals, indices = [], [], []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    mesh.calc_loop_triangles()
    offset = len(positions)
    rotation = obj.matrix_world.to_3x3().inverted().transposed()
    for vertex in mesh.vertices:
        positions.append(tuple(obj.matrix_world @ vertex.co))
        normals.append(tuple((rotation @ vertex.normal).normalized()))
    for face in mesh.loop_triangles:
        indices.extend(offset + index for index in face.vertices)
if not positions or not indices:
    raise RuntimeError('No ring geometry found')
if len(positions) > 65535:
    raise RuntimeError('Mesh exceeds portable 16-bit index limit')
p = np.asarray(positions, dtype=float)
n = np.asarray(normals, dtype=float)
p -= (p.max(axis=0) + p.min(axis=0)) / 2
values, basis = np.linalg.eigh(np.cov(p.T))
# The least-spread axis is perpendicular to the ring plane.
transform = basis[:, [2, 1, 0]]
if np.linalg.det(transform) < 0:
    transform[:, 2] *= -1
p = p @ transform
n = n @ transform
p -= (p.max(axis=0) + p.min(axis=0)) / 2
radius = np.linalg.norm(p[:, :2], axis=1).max()
p /= radius
chunks = [p.astype('<f4').tobytes(), n.astype('<f4').tobytes(), np.asarray(indices, dtype='<u2').tobytes()]
data = b''
views = []
for chunk in chunks:
    data += b'\0' * (-len(data) % 4)
    views.append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(chunk)})
    data += chunk
model = {
    'asset': {'version': '2.0', 'generator': 'TENSA ring normalization from Tripo CLI output'},
    'extensionsUsed': ['KHR_materials_emissive_strength'],
    'scene': 0, 'scenes': [{'nodes': [0]}],
    'nodes': [{'mesh': 0, 'name': 'TENSA luminous ring'}],
    'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
    'materials': [{'name': 'White emission', 'extensions': {'KHR_materials_emissive_strength': {'emissiveStrength': 12}}, 'doubleSided': True, 'emissiveFactor': [1, 1, 1], 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .4}}],
    'buffers': [{'byteLength': len(data)}], 'bufferViews': views,
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': len(p), 'type': 'VEC3', 'min': p.min(axis=0).tolist(), 'max': p.max(axis=0).tolist()},
        {'bufferView': 1, 'componentType': 5126, 'count': len(n), 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5123, 'count': len(indices), 'type': 'SCALAR'}
    ]
}
j = json.dumps(model, separators=(',', ':')).encode()
j += b' ' * (-len(j) % 4)
data += b'\0' * (-len(data) % 4)
result = struct.pack('<III', 0x46546c67, 2, 28 + len(j) + len(data)) + struct.pack('<II', len(j), 0x4e4f534a) + j + struct.pack('<II', len(data), 0x004e4942) + data
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(result)
print(json.dumps({'vertices': len(p), 'triangles': len(indices)//3, 'bounds': np.ptp(p, axis=0).tolist(), 'bytes': len(result), 'output': str(output)}))
