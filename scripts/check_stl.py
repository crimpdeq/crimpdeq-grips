"""Check that every exported STL is one closed body resting on the print bed.

Usage:
    python3 scripts/check_stl.py FILE.stl [...]

Each binary STL must be a single connected body, closed and with its lowest point at z = 0.
Closed means no open edge: every edge is shared by an even number of triangles. Not exactly two,
because the zero-area slivers left where rounds meet faces tangentially (slicers ignore them)
share some edges four or six times; collapsed slivers (two corners on one vertex) are skipped.
"""

import struct
import sys
from collections import Counter
from pathlib import Path


def read_triangles(path):
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 80)[0] if len(data) >= 84 else -1
    if len(data) != 84 + 50 * count:
        sys.exit(f"{path}: not a binary STL")
    return [struct.unpack_from("<9f", data, 84 + 50 * i + 12) for i in range(count)]


def problems(path):
    triangles = read_triangles(path)
    if not triangles:
        return ["no triangles"]
    ids = {}
    faces = [[ids.setdefault(t[i : i + 3], len(ids)) for i in (0, 3, 6)] for t in triangles]
    faces = [f for f in faces if len(set(f)) == 3]
    edges = Counter(tuple(sorted((f[i], f[i - 1]))) for f in faces for i in range(3))
    found = []
    open_edges = sum(n % 2 for n in edges.values())
    if open_edges:
        found.append(f"{open_edges} open edges")
    parent = list(range(len(ids)))

    def root(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for a, b in edges:
        parent[root(a)] = root(b)
    bodies = len({root(v) for v in range(len(ids))})
    if bodies != 1:
        found.append(f"{bodies} bodies")
    z_min = min(z for t in triangles for z in t[2::3])
    if abs(z_min) > 1e-3:
        found.append(f"lowest point at z = {z_min:.3f}")
    return found


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    failed = False
    for path in map(Path, sys.argv[1:]):
        found = problems(path)
        failed |= bool(found)
        print(f"{path.name}: {'; '.join(found) or 'ok'}")
    if failed:
        sys.exit("some STLs failed")


if __name__ == "__main__":
    main()
