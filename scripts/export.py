"""Export every part of a grip model in ../grips as print-ready STLs.

Usage:
    python3 scripts/export.py photon PARAMS --hand right
    python3 scripts/export.py spark --hand left --out DIR
    python3 scripts/export.py photon PARAMS --hand right --in-place --out DIR
    python3 scripts/export.py mico PARAMS --out DIR

PARAMS (optional) holds `Name = value` lines, `#` lines ignored, e.g. a parameters.txt from the
zip of ../docs/src/measure-hand.html; names must be parameters of the model. The STLs, named
<model>_<hand>_<part>.stl, go to --out, by default exports/<model>-<hand> (ignored by git).
--in-place keeps every part where it sits in the assembly instead of its print pose.
Mico is one part with no hand, modelled in its print pose: mico.stl, by default in exports/mico.
"""

import argparse
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRIPS = ROOT / "grips"
EXPORTS = ROOT / "exports"
PARTS = [
    "frame",
    "ring_wall",
    "middle_wall",
    "index_wall",
    "end_wall",
    "pinky_roller",
    "ring_roller",
    "middle_roller",
    "index_roller",
    "pinky_pin",
    "ring_pin",
    "middle_pin",
    "index_pin",
    "post",
]


def model_parameters(scad):
    """Names assigned at the top of the model, before its hidden section."""
    text = scad.read_text().split("/* [Hidden] */")[0]
    return set(re.findall(r"^(\w+)\s*=", text, re.MULTILINE))


def read_params(path, allowed):
    params = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.fullmatch(r"(\w+)\s*=\s*(-?[\d.]+)", line)
        if not match:
            raise SystemExit(f"{path}: cannot parse line: {line}")
        if match[1] not in allowed:
            raise SystemExit(f"{path}: {match[1]} is not a parameter of the model")
        params[match[1]] = match[2]
    return params


def export(openscad, scad, values, path):
    defines = [f"-D{k}={v}" for k, v in values.items()]
    result = subprocess.run(
        [openscad, "--backend", "Manifold", "--export-format", "binstl", "-o", str(path), *defines, str(scad)],
        capture_output=True,
        text=True,
        check=False,
    )
    errors = [line for line in result.stderr.splitlines() if line.startswith(("ERROR", "WARNING"))]
    if result.returncode or errors:
        raise SystemExit(f"{path.name}: openscad failed:\n" + "\n".join(errors or result.stderr.splitlines()[-5:]))
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("model", choices=("photon", "spark", "mico"))
    parser.add_argument("params", type=Path, nargs="?")
    parser.add_argument("--hand", choices=("left", "right"), help="required for photon and spark")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--in-place", action="store_true", help="assembly coordinates instead of print pose")
    args = parser.parse_args()
    if args.model == "mico" and (args.hand or args.in_place):
        parser.error("mico has no hand and no assembly: drop --hand and --in-place")
    if args.model != "mico" and not args.hand:
        parser.error(f"{args.model} needs --hand")

    openscad = shutil.which("openscad") or "/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD"
    if not Path(openscad).exists():
        sys.exit("openscad not found; install OpenSCAD (2025 or newer, for the Manifold backend)")
    scad = GRIPS / f"{args.model}.scad"
    params = read_params(args.params, model_parameters(scad)) if args.params else {}
    if args.model == "mico":
        out = args.out or EXPORTS / "mico"
        stls = {out / "mico.stl": params}
    else:
        out = args.out or EXPORTS / f"{args.model}-{args.hand}"
        pose = {"hand": f'"{args.hand}"', "in_place": str(args.in_place).lower()}
        stls = {out / f"{args.model}_{args.hand}_{part}.stl": params | pose | {"part": f'"{part}"'} for part in PARTS}
    out.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor() as pool:
        jobs = [pool.submit(export, openscad, scad, values, path) for path, values in stls.items()]
        for job in jobs:
            print(job.result())


if __name__ == "__main__":
    main()
