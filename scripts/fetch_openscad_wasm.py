"""Download the WebAssembly OpenSCAD that ../docs/src/measure-hand.html renders the STLs with.

Usage:
    python3 scripts/fetch_openscad_wasm.py

Writes openscad.js and openscad.wasm to docs/src/openscad/ (not in git), from the pinned
snapshot on files.openscad.org, the one .github/actions/setup-openscad installs.
"""

import hashlib
import io
import urllib.request
import zipfile
from pathlib import Path

VERSION = "2026.09.23"
SHA256 = "0e85026f486ab6b7c498ae582528a980db9e050ff8ae0df835917a8334ed3f79"
URL = f"https://files.openscad.org/snapshots/OpenSCAD-{VERSION}-WebAssembly-web.zip"
OUT = Path(__file__).resolve().parent.parent / "docs" / "src" / "openscad"
FILES = ["openscad.js", "openscad.wasm"]


def main():
    with urllib.request.urlopen(URL) as response:
        data = response.read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"{URL}: sha256 {digest}, expected {SHA256}")
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for name in FILES:
            (OUT / name).write_bytes(archive.read(name))
            print(OUT / name)


if __name__ == "__main__":
    main()
