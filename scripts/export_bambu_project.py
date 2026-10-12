"""Build a ready-to-print Bambu Studio project (Bambu Lab A1) from the STLs of one grip and hand.

Usage:
    python3 scripts/export_bambu_project.py STL_DIR --output FILE.3mf [--skip-slice]

STL_DIR holds the 14 STLs of one grip and hand as scripts/export.py names them. The parts are laid
out in rows on one plate, far enough apart for their brims; the Bambu Studio CLI assembles the
project with the print settings of docs/src/photon/printing.md and slices it to confirm that
the plate prints without errors or warnings.

BAMBU_STUDIO names the Bambu Studio executable (default: bambu-studio on PATH, then the macOS
application); BAMBU_STUDIO_PROFILES its profiles directory (default: found next to the executable).
"""

import argparse
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from check_stl import read_triangles
from export import PARTS

MACOS_APP = Path("/Applications/BambuStudio.app/Contents/MacOS/BambuStudio")

PRINTER = "Bambu Lab A1 0.4 nozzle"
PROCESS = "0.20mm Standard @BBL A1"
FILAMENT = "Bambu PETG HF @BBL A1"
BED_TYPE = "Textured PEI Plate"

# The settings table in docs/src/photon/printing.md.
PROCESS_OVERRIDES = {
    "layer_height": "0.2",
    "wall_loops": "5",
    "sparse_infill_density": "35%",
    "sparse_infill_pattern": "cubic",
    "enable_support": "0",
    "brim_type": "no_brim",
}
BRIM_WIDTH = 5.0
SUPPORT = {"enable_support": "1", "support_type": "normal(auto)"}
BRIM = {"brim_type": "outer_only", "brim_width": f"{BRIM_WIDTH:g}"}
PART_SETTINGS = {
    "frame": SUPPORT | BRIM,
    "ring_wall": BRIM,
    "middle_wall": BRIM,
    "index_wall": BRIM,
}
# Between the bounding boxes of two parts: both brims, each 0.1 mm off its part (brim_object_gap),
# and over 2 mm between them, or the brims can merge.
PART_GAP = 2 * BRIM_WIDTH + 3


def find_bambu_studio():
    candidate = os.environ.get("BAMBU_STUDIO") or shutil.which("bambu-studio")
    if candidate:
        return Path(candidate)
    if MACOS_APP.exists():
        return MACOS_APP
    sys.exit("Bambu Studio not found: set BAMBU_STUDIO or put bambu-studio on PATH")


def find_profiles(bambu_studio):
    if os.environ.get("BAMBU_STUDIO_PROFILES"):
        return Path(os.environ["BAMBU_STUDIO_PROFILES"])
    exe_dir = bambu_studio.resolve().parent
    # macOS bundle, extracted AppImage.
    for candidate in (exe_dir.parent / "Resources" / "profiles", exe_dir / "resources" / "profiles"):
        if (candidate / "BBL").is_dir():
            return candidate
    sys.exit(f"Bambu Studio profiles not found near {bambu_studio}: set BAMBU_STUDIO_PROFILES")


def flattened_preset(profiles, kind, name):
    """A Bambu Lab system preset merged along its `inherits` chain."""
    paths = [p for p in (profiles / "BBL" / kind).rglob("*.json") if json.loads(p.read_bytes()).get("name") == name]
    if len(paths) != 1:
        sys.exit(f"Bambu Studio has {len(paths)} {kind} presets named {name!r}, expected 1")
    preset = json.loads(paths[0].read_bytes())
    parent = preset.pop("inherits", None)
    return (flattened_preset(profiles, kind, parent) if parent else {}) | preset


def write_presets(profiles, grip, work):
    process = flattened_preset(profiles, "process", PROCESS)
    for key in ("setting_id", "instantiation"):
        process.pop(key, None)
    # A project preset on top of the system process, so Bambu Studio lists the changed settings
    # against it; `from: User` on the machine or filament makes the CLI reject the process.
    process |= PROCESS_OVERRIDES | {"name": f"0.20mm {grip.title()} @BBL A1", "inherits": PROCESS, "from": "User"}
    presets = {
        "machine": flattened_preset(profiles, "machine", PRINTER),
        "process": process,
        "filament": flattened_preset(profiles, "filament", FILAMENT),
    }
    for kind, preset in presets.items():
        (work / f"{kind}.json").write_text(json.dumps(preset, indent=4))
    return presets


def read_parts(stl_dir):
    """The STLs of STL_DIR by part name, and their grip and hand."""
    names = sorted(p.name for p in stl_dir.glob("*.stl"))
    if not names:
        sys.exit(f"{stl_dir}: no STLs")
    grip, hand = names[0].split("_")[:2]
    expected = sorted(f"{grip}_{hand}_{part}.stl" for part in PARTS)
    if names != expected:
        sys.exit(f"{stl_dir}: expected the STLs of export.py for {grip} ({hand} hand), found {names}")
    return grip, hand, {part: stl_dir / f"{grip}_{hand}_{part}.stl" for part in PARTS}


def lay_out(parts, bed, work):
    """Copies of the STLs moved into rows on the bed, deepest parts first."""
    meshes = {part: read_triangles(path) for part, path in parts.items()}
    xs = {part: [t[i] for t in triangles for i in (0, 3, 6)] for part, triangles in meshes.items()}
    ys = {part: [t[i] for t in triangles for i in (1, 4, 7)] for part, triangles in meshes.items()}
    x, y, row_depth = BRIM_WIDTH, BRIM_WIDTH, 0.0
    placed = {}
    for part in sorted(parts, key=lambda p: min(ys[p]) - max(ys[p])):
        width, depth = max(xs[part]) - min(xs[part]), max(ys[part]) - min(ys[part])
        if x + width > bed[0] - BRIM_WIDTH:
            x, y, row_depth = BRIM_WIDTH, y + row_depth + PART_GAP, 0.0
        if x + width > bed[0] - BRIM_WIDTH or y + depth > bed[1] - BRIM_WIDTH:
            sys.exit(f"the parts do not fit on the {bed[0]:g} x {bed[1]:g} mm bed with their brims")
        dx, dy = x - min(xs[part]), y - min(ys[part])
        path = work / parts[part].name
        with path.open("wb") as stl:
            stl.write(bytes(80) + struct.pack("<I", len(meshes[part])))
            for t in meshes[part]:
                moved = [v + (dx, dy, 0)[i % 3] for i, v in enumerate(t)]
                stl.write(struct.pack("<12fH", 0, 0, 0, *moved, 0))
        placed[part] = path
        print(f"{part}: X {x:.1f}..{x + width:.1f}, Y {y:.1f}..{y + depth:.1f}")
        x += width + PART_GAP
        row_depth = max(row_depth, depth)
    return placed


def list_changed_settings(project, system_process):
    """Record the process overrides in the project's different_settings_to_system.

    When Bambu Studio opens a project whose preset inherits a system preset, it keeps only the
    settings listed there and resets the rest to the system values. The CLI leaves the list empty.
    """
    changed = sorted(k for k, v in PROCESS_OVERRIDES.items() if system_process.get(k) not in (v, [v]))
    name = "Metadata/project_settings.config"
    with zipfile.ZipFile(project) as archive:
        entries = [(info, archive.read(info)) for info in archive.infolist()]
    with zipfile.ZipFile(project, "w", zipfile.ZIP_DEFLATED) as archive:
        for info, data in entries:
            if info.filename == name:
                settings = json.loads(data)
                lost = [k for k in changed if settings.get(k) != PROCESS_OVERRIDES[k]]
                if lost:
                    sys.exit(f"Bambu Studio did not keep the process overrides {lost}")
                # Process first, then the filament and printer presets.
                settings["different_settings_to_system"][0] = ";".join(changed)
                data = json.dumps(settings, indent=4).encode()
            archive.writestr(info, data)


def run_bambu(bambu_studio, args, out_dir):
    """Run the Bambu Studio CLI in out_dir, where it writes result.json, and fail on its errors."""
    out_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [str(bambu_studio), "--debug", "1", *args, "--outputdir", str(out_dir)],
        cwd=out_dir,
        capture_output=True,
        text=True,
        check=False,
    )
    result_path = out_dir / "result.json"
    result = json.loads(result_path.read_text()) if result_path.exists() else {}
    if proc.returncode or result.get("return_code", 0):
        sys.stderr.write(proc.stdout[-8000:] + proc.stderr[-8000:])
        sys.exit(f"Bambu Studio failed ({proc.returncode}): {result.get('error_string', 'no result.json')}")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("stl_dir", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--skip-slice", action="store_true", help="don't slice the project to check it")
    args = parser.parse_args()

    bambu_studio = find_bambu_studio()
    profiles = find_profiles(bambu_studio)
    grip, hand, parts = read_parts(args.stl_dir)
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        presets = write_presets(profiles, grip, work)
        corners = [[float(v) for v in c.split("x")] for c in presets["machine"]["printable_area"]]
        placed = lay_out(parts, [max(c[i] for c in corners) for i in (0, 1)], work)
        assemble_list = {
            "plates": [
                {
                    "plate_name": f"{grip.title()} {hand} hand",
                    "need_arrange": False,
                    "plate_params": {"curr_bed_type": BED_TYPE},
                    "objects": [
                        {"path": str(path), "count": 1, "filaments": [1], "print_params": PART_SETTINGS.get(part, {})}
                        for part, path in placed.items()
                    ],
                }
            ]
        }
        (work / "assemble.json").write_text(json.dumps(assemble_list, indent=4))

        project = work / "project" / args.output.name
        run_bambu(
            bambu_studio,
            [
                "--load-settings",
                f"{work / 'machine.json'};{work / 'process.json'}",
                "--load-filaments",
                str(work / "filament.json"),
                "--load-assemble-list",
                str(work / "assemble.json"),
                "--export-3mf",
                project.name,
            ],
            project.parent,
        )
        list_changed_settings(project, flattened_preset(profiles, "process", PROCESS))
        if not args.skip_slice:
            result = run_bambu(bambu_studio, ["--slice", "0", str(project)], work / "slice")
            # Object collisions and floating cantilevers, among others.
            warnings = [p["warning_message"] for p in result["sliced_plates"] if p["warning_message"]]
            if warnings:
                sys.exit("Bambu Studio sliced the plate with warnings:\n  " + "\n  ".join(warnings))
            print("Sliced the plate without warnings")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(project, args.output)
    print(f"Exported {args.output}")


if __name__ == "__main__":
    main()
