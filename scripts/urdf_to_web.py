"""Convert the Pioneer whole-body URDF into the web model used by the humanoid page's 3D hero.

Writes a GLB (one node per link, meshes in their link frame, vertex colours and normals; the visor
split into `<link>__glow` so it can be lit up) plus a kinematics JSON (joint tree with origins, axes
and limits) that components/Humanoid3D rebuilds the robot from.

    pip install trimesh numpy scipy networkx fast-simplification
    python scripts/urdf_to_web.py \
        <pioneer_humanoid>/assets/pioneer_whole_body_humanoid/pioneer_whole_body_humanoid.urdf \
        /tmp/pioneer_raw.glb components/Humanoid3D/kinematics.json 240000
    npx @gltf-transform/cli@4.2.1 optimize /tmp/pioneer_raw.glb public/models/pioneer.glb \
        --compress meshopt --texture-compress false --simplify true --simplify-ratio 0.4 \
        --simplify-error 0.004 --join false --flatten false --instance false --palette false
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import fast_simplification
import numpy as np
import trimesh

urdf_path = Path(sys.argv[1])
out_glb = Path(sys.argv[2])
out_json = Path(sys.argv[3])
target_total = int(sys.argv[4]) if len(sys.argv) > 4 else 260_000

root = ET.parse(urdf_path).getroot()
base = urdf_path.parent


def vec(s, default="0 0 0"):
    return [float(v) for v in (s or default).split()]


# First pass: load every visual so we know the total triangle count.
visuals = []
for link in root.findall("link"):
    for vis in link.findall("visual"):
        mesh_el = vis.find("geometry/mesh")
        if mesh_el is None:
            continue
        origin = vis.find("origin")
        xyz = vec(origin.get("xyz") if origin is not None else None)
        scale = vec(mesh_el.get("scale"), "1 1 1")
        rgba = vec(vis.find("material/color").get("rgba"))
        m = trimesh.load(base / mesh_el.get("filename"), force="mesh")
        m.merge_vertices()
        m.apply_scale(scale)
        m.apply_translation(xyz)
        visuals.append((link.get("name"), m, rgba))

total = sum(len(m.faces) for _, m, _ in visuals)
ratio = min(1.0, target_total / total)
print(f"{total} tris -> ratio {ratio:.3f}")

per_link = {}
for name, m, rgba in visuals:
    n = len(m.faces)
    keep = max(min(n, 300), int(n * ratio))
    if keep < n:
        v, f = fast_simplification.simplify(
            m.vertices.astype(np.float32), m.faces.astype(np.int32), 1 - keep / n
        )
        m = trimesh.Trimesh(v, f, process=True)
    # Smooth across creases up to 60 degrees: the CAD export is already coarse, and the default
    # threshold leaves curved parts looking faceted.
    m = trimesh.graph.smooth_shade(m, angle=np.radians(60))
    col = (np.array(rgba) * 255).round().astype(np.uint8)
    m.visual = trimesh.visual.ColorVisuals(m, vertex_colors=np.tile(col, (len(m.vertices), 1)))
    key = name + "__glow" if rgba[:3] == [0.812, 0.953, 1.0] else name
    per_link.setdefault(key, []).append(m)

scene = trimesh.Scene()
out_tris = 0
for name, meshes in per_link.items():
    merged = trimesh.util.concatenate(meshes)
    out_tris += len(merged.faces)
    scene.add_geometry(merged, node_name=name, geom_name=name)
print("output tris", out_tris)
scene.export(out_glb, include_normals=True)

joints = []
for j in root.findall("joint"):
    origin = j.find("origin")
    axis = j.find("axis")
    limit = j.find("limit")
    joints.append(
        {
            "name": j.get("name"),
            "type": j.get("type"),
            "parent": j.find("parent").get("link"),
            "child": j.find("child").get("link"),
            "xyz": vec(origin.get("xyz") if origin is not None else None),
            "rpy": vec(origin.get("rpy") if origin is not None else None),
            "axis": vec(axis.get("xyz") if axis is not None else None, "1 0 0"),
            "lower": float(limit.get("lower")) if limit is not None else 0.0,
            "upper": float(limit.get("upper")) if limit is not None else 0.0,
        }
    )
links = [l.get("name") for l in root.findall("link")]
children = {j["child"] for j in joints}
rootlink = [l for l in links if l not in children][0]
out_json.write_text(json.dumps({"root": rootlink, "links": links, "joints": joints}, separators=(",", ":")))
print("root", rootlink, "joints", len(joints))
