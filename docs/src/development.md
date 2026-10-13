# Models and checks

`grips/photon.scad` and `grips/spark.scad` rebuild the OpenGrips Prometheus v43 and Sisyphus v27
STEP files of [Jared-Is-Coding's fork](https://github.com/Jared-Is-Coding/Open_Grips) as the
parametric Photon and Spark models, without the STEP files' TPU guard: nothing attaches to it, and the anchor's
cord exits are rounded without it. Shared helpers are in `grips/common.scad`. The models need
OpenSCAD 2025 or newer (the Manifold backend; older releases take minutes per part).

## Previewing and exporting

Open a model in OpenSCAD, set the values in the Customizer (Window → Customizer), pick a `part`
and `hand`, render (F6) and export the STL. `part = "assembly"` shows all parts in place; rendering
it takes about a minute.

`scripts/export.py` exports all 14 parts of one hand at once:

```sh
python3 scripts/export.py photon my-right-hand.txt --hand right --out my-right-hand
python3 scripts/export.py spark --hand left --out spark-left
```

The parameter file is optional and uses the format of the `parameters.txt` files the
[measuring page](measure-hand.html) puts in its zip (`Name = value` lines, `#` comments); names
that are not parameters of the model are rejected. The STLs are named `<model>_<hand>_<part>.stl`. `--in-place` keeps the parts in assembly coordinates
instead of their print pose.

## Measuring page

`docs/src/measure-hand.html` renders the STLs in the browser with the official WebAssembly build of
OpenSCAD, which `scripts/fetch_openscad_wasm.py` downloads to `docs/src/openscad/` (pinned and
checked, not in git; the CI book build runs it). It loads the models from `docs/src/grips`, a link
to `grips/`, so the book carries the models it renders. Its script is in `docs/src/measure-hand/`:

| Module | Role |
|---|---|
| `hand.js` | Points → finger lengths → grip parameters, plausibility warnings, `parameters.txt` |
| `photo-canvas.js` | The photo: drawing, zoom and pan (wheel or pinch), placing and moving points, the magnifier |
| `render.js`, `worker.js` | OpenSCAD in web workers: every part in its own instance, up to three at once (one on phones and tablets), and the check of the parameters |
| `zip.js` | The zip of the STLs |
| `saved.js` | Choices, photos and points kept in the browser's IndexedDB |
| `main.js` | The page: choices, the point grid, undo, the download |

Once every point is placed, the page renders the post with the measured parameters: the models'
assertions run for any part, so the model itself says whether it can be made, before the download.
To run the page locally:

```sh
python3 scripts/fetch_openscad_wasm.py
mdbook serve docs   # then open /measure-hand.html; opened as a file it cannot load the models
```

CGAL fails in WebAssembly, so the models avoid `minkowski()` of non-convex solids, which needs it
and falls back to minutes per part: `along_x_ball_swept()` builds the ball-swept extrusions of the
rounded edges from offset profiles in 0.2 mm layers, the print layer height.

## Parameters

### Photon

Names and meanings match the VarSet of the original FreeCAD model
(`Original/OpenGrips_Prometheus.FCStd` at commit `f14f3e9`). The finger defaults (`Height`,
`Depth`, `To_Blocker`) are one measured right hand, recorded at the top of `photon.scad` with
the v43 values for comparison; the roller and frame sizes are the VarSet's.

The outer faces of the frame and the end wall carry an engraved `crimpdeq.com` in Inter Bold, as
on the Crimpdeq case, and the front of the crossbar an engraved `Crimpdeq Photon`; the font is
bundled in `grips/fonts/` (SIL Open Font License). The space for `crimpdeq.com` depends on the hand:
when it is short, the text shrinks to fit, and below a 2.5 mm text size it is left out, so the
engraving never rules a hand out. `Crimpdeq Photon` has a fixed space; the model stops with a
message if it does not fit.

### Spark

The values of the original model's VarSet (`Original/OpenGrips_Sisyphus.FCStd` at commit
`f14f3e9`), renamed consistently (`Base_<F>_height` → `Base_<F>_Height`, `Base_R_diamter` →
`Base_R_Diameter`, `I_width` → `Base_I_Width`, `Base_wall_width` → `Wall_Width`):

| Parameter | Meaning |
|---|---|
| `Base_<F>_Height` | Roller position along the fingers, relative to the pinky |
| `Base_<F>_Blocker` | How far the seat under each roller reaches past its axis (the pinky's stops short of it) |
| `Base_<F>_Diameter`, `Base_<F>_Width` | Roller size; all roller tops are level with the middle roller's |
| `Base_Frame_Height` | Wall length up to the lock slot |

The finger stops and the anchor have no counterpart in the original model and keep v27's
dimensions.

As on Photon, the outer faces of the frame and the end wall carry an engraved `crimpdeq.com`, and
the sloped top face of the anchor bar an engraved `Crimpdeq Spark`. Their space depends on the
roller diameters and the frame length, not on the hand, so the model stops with a message if the
text does not fit between the end wall's post hole and lock or on the anchor bar.

## Checks

CI runs these on every pull request:

- `uv run scripts/check_step.py` exports each part at the STEP's own values and compares it with
  the STEP solid, read from git history (needs a full clone) and tessellated with OpenCascade.
  The engravings, absent from the STEP files, are left out. Every part is within 0.5% of the STEP
  volume and within about 0.1 mm of its surface at the 95th percentile. It fails beyond 1% or 0.6 mm.
- `python3 scripts/check_stl.py` on the exports of both grips for both hands: each STL is one
  closed body resting on z = 0.
- `uvx ruff check --line-length 120 scripts` and `mdbook build docs`, after
  `python3 scripts/fetch_openscad_wasm.py`.

Known differences from the STEP files:

- Photon blocker tips follow the original rule: v43's hand-moved tips sit 0.15–0.38 mm lower.
- Pins are centered in their holes; v43's index pin and v27's ring and index pins are 0.1 mm off.
- Spark: the pinky cradle is approximated by one roller cut.
- Some exports contain zero-area triangles where rounded surfaces meet flat ones; slicers ignore
  them.

The checks are geometric only; fit, strength and comfort still need a test print.

## Illustrations

`docs/illustrations/render.sh` renders the Photon part and assembly pictures from the
right-hand defaults. Rerun it when the model changes.

## Website

Every push to `main` builds this book with the measuring page and the WebAssembly OpenSCAD and,
once every check of `.github/workflows/ci.yml` passes, its `deploy` job publishes it to
[grips.crimpdeq.com](https://grips.crimpdeq.com) (Cloudflare Pages project `crimpdeq-grips`).

## Releases

Creating a GitHub release runs `.github/workflows/release.yml`, which exports both grips for both
hands, checks the STLs and attaches one zip of STLs and one Bambu Studio project per grip and hand.
Run the workflow manually for a dry run.

`scripts/export_bambu_project.py` builds the project from the STLs of one grip and hand: it lays
the parts out in rows on the A1 plate, far enough apart for their brims, assembles the project with
the Bambu Studio CLI and the settings of [Printing](photon/printing.md) (for Spark too,
untested in print), and fails if slicing it gives an error or a warning, such as a floating
cantilever. The release workflow installs the pinned Bambu Studio AppImage with
`.github/actions/setup-bambu-studio`; locally, set `BAMBU_STUDIO` if `bambu-studio` is not on the
`PATH` or is a wrapper script.
