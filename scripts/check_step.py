# /// script
# requires-python = ">=3.10"
# dependencies = ["cadquery-ocp", "numpy", "rtree", "scipy", "trimesh"]
# ///
"""Compare every part of the OpenSCAD models with the STEP files they rebuild.

Usage:
    uv run scripts/check_step.py [photon|spark]

The STEP files are read from STEP_COMMIT, the last commit that has them (needs a full clone), and
tessellated with OpenCascade (OCP). Each OpenSCAD part is exported in assembly coordinates
(in_place) at the STEP's own values, and the script reports its volume difference and the distance
from its surface to the STEP part's. It fails if a part drifts beyond the tolerances below.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import trimesh
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.STEPControl import STEPControl_Reader
from OCP.StlAPI import StlAPI_Writer
from OCP.TopAbs import TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer

ROOT = Path(__file__).resolve().parent.parent
STEP_COMMIT = "f14f3e9a8debcf543786029dc3705c084ce92c35"
# Solid order in both STEP files: frame, then roller, pin and wall per finger, end wall, post (the
# TPU guard, solid 14, is not rebuilt).
SOLIDS = {
    "frame": 0,
    "pinky_roller": 1,
    "pinky_pin": 2,
    "ring_wall": 3,
    "ring_roller": 4,
    "ring_pin": 5,
    "middle_wall": 6,
    "middle_roller": 7,
    "middle_pin": 8,
    "index_wall": 9,
    "index_roller": 10,
    "index_pin": 11,
    "end_wall": 12,
    "post": 13,
}
MODELS = {
    # v43's values; it moved the blockers by hand but kept the frame length of the original blocker
    # positions.
    "photon": {
        "step": "OpenGrips Prometheus v43.step",
        "defines": [
            f"-DBase_{finger}_{name}={value}"
            for name, values in (("Height", (23, 32, 15)), ("Depth", (8, 12, 12)), ("To_Blocker", (14.2, 13.9, 12.7)))
            for finger, value in zip("IMR", values)
        ]
        + ["-DBase_P_To_Blocker=8.8", "-DBase_Frame_Height=104"],
        "offset": [0, 0, 0],
        "solids": SOLIDS,
    },
    # v27 also holds an all-round copy of the post (13); the printable, chamfered one is 15.
    "spark": {
        "step": "OpenGrips Sisyphus v27.step",
        "defines": [],
        "offset": [-5.965, -8.069, -4.13],
        "solids": SOLIDS | {"post": 15},
    },
}
MAX_VOLUME_DIFF = 1.0  # %
MAX_P95 = 0.6  # mm


def step_solids(path, out):
    """Write every solid of the STEP file as out/<index>.stl, in file order."""
    reader = STEPControl_Reader()
    if reader.ReadFile(str(path)) != 1:
        sys.exit(f"cannot read {path}")
    reader.TransferRoots()
    solids = TopExp_Explorer(reader.OneShape(), TopAbs_SOLID)
    i = 0
    while solids.More():
        solid = solids.Current()
        BRepMesh_IncrementalMesh(solid, 0.02, False, 0.1)
        StlAPI_Writer().Write(solid, str(out / f"{i}.stl"))
        solids.Next()
        i += 1


def without_slivers(mesh):
    """Drop zero-volume fragments (coincident faces left by booleans) that would break the comparison."""
    with np.errstate(invalid="ignore"):  # their center of mass divides by their zero volume
        return trimesh.util.concatenate([b for b in mesh.split(only_watertight=False) if abs(b.volume) >= 1e-3])


def compare(mine, ref):
    sample = mine.sample(20000)
    _, dist, _ = trimesh.proximity.closest_point(ref, sample)
    return 100 * (mine.volume / ref.volume - 1), np.percentile(dist, 95), np.percentile(dist, 99), dist.max()


def check(name, model, tmp):
    step = subprocess.run(
        ["git", "-C", ROOT, "show", f"{STEP_COMMIT}:{model['step']}"], check=False, capture_output=True
    )
    if step.returncode:
        sys.exit(f"cannot read {model['step']} from {STEP_COMMIT}: {step.stderr.decode().strip()}")
    step_path = tmp / f"{name}.step"
    step_path.write_bytes(step.stdout)
    step_dir = tmp / f"{name}_step"
    step_dir.mkdir()
    step_solids(step_path, step_dir)
    failed = []
    print(f"{name}: part, volume %, p95 / p99 / max surface distance (mm)")
    for part, solid in model["solids"].items():
        path = tmp / f"{name}_{part}.stl"
        subprocess.run(
            [
                "openscad",
                "--backend",
                "Manifold",
                "-o",
                str(path),
                f'-Dpart="{part}"',
                "-Din_place=true",
                *model["defines"],
                str(ROOT / "grips" / f"{name}.scad"),
            ],
            check=True,
            capture_output=True,
        )
        ref = trimesh.load(step_dir / f"{solid}.stl")
        ref.apply_translation(model["offset"])
        volume, p95, p99, worst = compare(without_slivers(trimesh.load(path)), ref)
        ok = abs(volume) <= MAX_VOLUME_DIFF and p95 <= MAX_P95
        failed += [] if ok else [part]
        print(f"  {part:14s} {volume:+6.2f}  {p95:.3f} / {p99:.3f} / {worst:.3f}{'' if ok else '  FAIL'}")
    return failed


def main():
    names = sys.argv[1:] or list(MODELS)
    with tempfile.TemporaryDirectory() as tmp:
        failed = [f"{name} {part}" for name in names for part in check(name, MODELS[name], Path(tmp))]
    if failed:
        sys.exit("beyond tolerance: " + ", ".join(failed))


if __name__ == "__main__":
    main()
