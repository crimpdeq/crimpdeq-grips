# crimpdeq-grips

User-facing workflows live in the book (`docs/`). This file holds what an agent needs to change or
rerun them.

## Layout

- `grips/`: the OpenSCAD models. `photon.scad` and `spark.scad` are one model per grip,
  every part in assembly coordinates plus a print pose; `part`/`hand` select the output, the hidden
  `in_place` skips the pose. Shared helpers (extrusion and edge rounding, pins, post, lock slot,
  bore exit round) are in `common.scad`. `fonts/` bundles Inter Bold for the engravings
  (both grips: `crimpdeq.com` on the frame and end wall outer faces; Photon: `Crimpdeq Photon` on
  the crossbar front; Spark: `Crimpdeq Spark` on the anchor bar's sloped top face), the font of
  `crimpdeq-case`. Engraved texts are `BRAND_TEXT` and `NAME_TEXT`, which `check_step.py` empties.
  The part `name` (not in the part list) is the name engraving's cut, which `grips.png` fills in.
  `mico.scad` is a one-piece mono training loop in its print pose, no hand or parts, engraved
  `Crimpdeq Mico` over `crimpdeq.com` around the back. Letters are placed one by one from the
  font's advance widths (`ADVANCES`; add any new character there). Keep engravings on walls: on
  the top face, the name at the size that fit the nose (2.8) closed up in a test print.
  `quark.scad` is a one-piece four-pinch block in its print pose (standing on an end face), no
  hand or parts: a hollow profile 90 mm across the heads, with the cord through the head cells and solid long arms for the deep pinch; the outer faces are
  smooth for optional adhesive grip tape. `Crimpdeq Quark` and
  `crimpdeq.com` are engraved on the stop lugs' outer faces, sized to fill their flat from Inter
  Bold's glyph height and advance widths (`ADVANCES`): the CI snapshot has `textmetrics()` only
  as a disabled experimental feature.
- `scripts/export.py`: all parts of one hand, or the one STL of Mico or Quark (`ONE_PIECE`, no
  hand) (stdlib only); parameter file of `Name = value` lines, unknown names rejected.
- `scripts/check_step.py`: compares every part with its STEP solid (`uv run`, inline dependencies;
  reads the STEP files from git history at `STEP_COMMIT` and tessellates them with OCP).
- `scripts/check_stl.py`: each exported STL is one closed body resting on z = 0 (stdlib only).
- `scripts/export_bambu_project.py`: the Bambu Lab A1 project of one grip and hand, or of Mico or
  Quark, from its STLs (stdlib plus the Bambu Studio CLI); lays the parts out itself, slices to check.
- `scripts/fetch_openscad_wasm.py`: the pinned official WebAssembly OpenSCAD (sha256-checked) into
  `docs/src/openscad/` (not in git), which the measuring page renders with; CI runs it before
  `mdbook build docs`.
- `docs/`: mdBook (the website). `src/measure-hand.html` is the hand measuring page, served as-is:
  photo → zip of the STLs of Photon, Spark or both, for one or both hands, with a `parameters.txt`
  per grip and hand for `export.py`. Its ES modules are in `src/measure-hand/` (roles in
  `development.md`); formulas live in `hand.js` `measure()`, parameter names, defaults and the part
  list match the models and `export.py`. It renders with the WebAssembly OpenSCAD in web workers,
  loads the models through `src/grips`, a symlink to `grips/`, and checks measured parameters by
  rendering the post (the models' assertions are top level): keep model limits as assertions
  there, not copied into the page. It needs serving (`mdbook serve docs`), not `file://`. `illustrations/render.sh` regenerates `src/photon/images`
  and `src/spark/images` from the right-hand defaults (`export.py --in-place`, then
  `illustrations/grip.scad`), and `src/images/grips.png` of both grips for the README and the
  introduction (`illustrations/grips.scad`, orthographic: in perspective the off-axis names
  lean), and `src/mico/images/mico.png` and `src/quark/images/quark.png`; rerun it when a model
  changes.
- `.github/workflows/`: `ci.yml` runs the checks below on pull requests and, on pushes to `main`
  that pass them, deploys `docs/book/` to the Cloudflare Pages project `crimpdeq-grips`
  (grips.crimpdeq.com, org secret `CLOUDFLARE_API_TOKEN`); `release.yml` exports
  both grips for both hands and attaches one zip of STLs and one 3MF project per grip and hand to
  the release, plus `crimpdeq-grips-<model>.stl` and `crimpdeq-grips-<model>.3mf` of Mico and
  Quark. `actions/setup-bambu-studio` pins the Bambu Studio AppImage (as in
  `crimpdeq-platform`).
- Generated files (STLs, 3MF projects, `docs/book/`) do not go in git; releases carry them. Local
  exports default to `exports/` (`exports/<grip>-<hand>/` STLs, `exports/<grip>-<hand>.3mf`;
  `exports/<model>/<model>.stl`, `exports/<model>.3mf` for Mico and Quark).

## Origins

- Photon and Spark are rebuilt from Jared-Is-Coding's fork of OpenGrips (Prometheus v43 and Sisyphus
  v27 STEP files, respectively), whose originals (STEP, FreeCAD models, PDF) were removed. They
  remain at commit `f14f3e9`, which `check_step.py` reads (`STEP_COMMIT`); code comments cite that
  commit.
- Remotes: `origin` is `crimpdeq/crimpdeq-grips` (canonical; base task branches on `origin/main`
  and push them there), `fork` is the user's personal fork, `jared` and `upstream` are the sources
  (fetch only, never push).
- No TPU guard and no non-printed parts besides the cord.
- The book's print and assembly advice (walls print without supports, post installed right after
  the ring roller, lubricant, scaling walls but not the frame) follows the original author's
  OpenGrips assembly instructions (PDF of 2026-10-12, not kept); the same order applies to Spark.

## Model facts

- Coordinates as in the original FreeCAD models: X along the roller axes (pinky at low X), Y along
  the fingers, Z depth. Both are left-hand grips (facing the rollers, the pinky is on the left);
  right hand = mirror across YZ. Spark is shifted so its frame corner is the origin (STEP minus
  [5.965, 8.069, 4.13]).
- Photon parameters follow the original VarSet (`Base_<I|M|R|P>_<Height|Depth|To_Blocker>`, plus
  diameters, widths and wall sizes); pinky `Height` and `Depth` are the 0 reference.
- Spark reproduces Sisyphus v27 at its defaults. Photon defaults to the user's measured right hand;
  `check_step.py` passes v43's values (it moved the blockers by hand, `To_Blocker`
  8.8/12.7/13.9/14.2, but kept the frame length of the VarSet blockers, `Base_Frame_Height` 104).
  Spark features absent from the original model (finger stops, anchor, cradle tool offsets) are
  v27 constants, commented "as in v27".
- Pins replace the original metal poles with the v43 fit: pin Ø3.3 with a 0.2 mm flat, holes Ø3.5,
  roller bore Ø3.8 with 0.5 mm chamfers.
- Edges rounded by `along_x_rounded` need a keep-sharp profile reaching at least r past the edges
  to keep. Use `round2d` (round joins): `offset(delta)` miters spike through profiles at tangent
  cusps.
- Unioned pieces must overlap (`eps`), not touch, and cuts must not end on existing faces;
  coincident faces leave internal walls or zero-area slivers. A few slivers remain where rounds
  meet faces tangentially: `check_step.py` drops zero-volume fragments before comparing, and
  `check_stl.py` accepts edges shared four or six times (never an odd count).
- `render()` wraps every part: without it OpenCSG previews of the frame come out empty.
- No `minkowski()` of non-convex solids: it needs CGAL, which fails in WebAssembly and falls back
  to minutes per part on the measuring page. Round with `along_x_ball_swept` (offset layers).

## Verify after changes

1. `uvx ruff check --line-length 120 scripts`.
2. Model changes: `uv run scripts/check_step.py` passes (each part within 1% volume and 0.6 mm at
   p95), and `scripts/export.py` for both grips and both hands and for Mico and Quark passes
   `scripts/check_stl.py`.
3. Model changes: rerun `docs/illustrations/render.sh`.
4. Measuring page or model changes: `scripts/fetch_openscad_wasm.py`, `mdbook serve docs`, load
   the measuring page, place all points, download the zip, confirm no console errors and that its
   STLs pass `scripts/check_stl.py`.
5. `mdbook build docs`.

Digital checks do not validate fit, strength or comfort; report the test print as pending.

## Bambu Lab A1 project

`scripts/export_bambu_project.py` flattens the system presets (machine `Bambu Lab A1 0.4 nozzle`,
filament `Bambu PETG HF @BBL A1`, process `0.20mm Standard @BBL A1` with the overrides of
`docs/src/photon/printing.md`, repeated in `docs/src/spark/printing.md`; Mico: filament
`Bambu PLA Basic @BBL A1` and 7 walls, `docs/src/mico/printing.md`; Quark: those of Photon plus a
brim, `docs/src/quark/printing.md`), so keep its settings and
those pages in sync. Facts it relies on:

- Only the renamed process gets `from: User`; on the machine or filament the CLI reports the
  process as incompatible. The plate's `curr_bed_type` must be Textured PEI: the default Cool
  Plate rejects PETG.
- Without a brim, a middle wall lifted on its first layers in a test print and the rest of it
  printed as spaghetti over the plate.
- The CLI arrange ignores brims, so the script moves the STLs into rows itself (`need_arrange`
  false keeps STL coordinates), with gaps that keep brims over 2 mm apart.
- The CLI leaves `different_settings_to_system` empty, and Bambu Studio then resets the overrides
  when opening the project; the script fills it in.
- Slicing reports collisions and floating cantilevers in `warning_message` of `result.json`, which
  the CLI writes to its working directory; the script runs it in a temporary directory. Neither
  grip has a floating cantilever without supports; the walls need none (original instructions),
  and the frame, with the largest overhangs, keeps its support. Mico slices without warnings with
  neither supports nor a brim; Quark with a brim and no supports.
- Locally on Linux, `bambu-studio` may be a wrapper script: set `BAMBU_STUDIO` to the AppImage's
  `AppRun` so the profiles are found next to it.
