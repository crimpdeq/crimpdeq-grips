# crimpdeq-grips

User-facing workflows live in the book (`docs/`). This file holds what an agent needs to change or
rerun them.

## Layout

- `grips/`: the OpenSCAD models. `prometheus.scad` and `sisyphus.scad` are one model per grip,
  every part in assembly coordinates plus a print pose; `part`/`hand` select the output, the hidden
  `in_place` skips the pose. Shared helpers (extrusion and edge rounding, pins, post, lock slot,
  bore exit round) are in `common.scad`. `fonts/` bundles Inter Bold for the Prometheus
  `crimpdeq.com` engraving (frame and end wall outer faces), the font of `crimpdeq-case`.
- `scripts/export.py`: all parts of one hand (stdlib only); parameter file of `Name = value` lines,
  unknown names rejected.
- `scripts/check_step.py`: compares every part with its STEP solid (`uv run`, inline dependencies;
  reads the STEP files from git history at `STEP_COMMIT` and tessellates them with OCP).
- `scripts/check_stl.py`: each exported STL is one closed body resting on z = 0 (stdlib only).
- `docs/`: mdBook (the website). `src/measure-hand.html` is the hand measuring page, served as-is:
  photo → parameter text; formulas live in `measure()`, parameter names and defaults match the
  Prometheus model. `illustrations/render.sh` regenerates `src/prometheus/images` from the
  right-hand defaults (`export.py --in-place`, then `illustrations/prometheus.scad`); rerun it when
  the model changes. Sisyphus chapters and illustrations are not written yet.
- `.github/workflows/`: `ci.yml` runs the checks below on pull requests; `release.yml` exports
  both grips for both hands and attaches one zip per grip and hand to the release.
- Generated files (STLs, 3MF projects, `docs/book/`) do not go in git; releases carry the STLs.

## Origins

- Rebuilt from Jared-Is-Coding's fork of OpenGrips (Prometheus v43, Sisyphus v27 STEP files), whose
  originals (STEP, FreeCAD models, PDF) were removed. They remain at commit `f14f3e9`, which
  `check_step.py` reads (`STEP_COMMIT`); code comments cite that commit.
- Remotes: `origin` is `crimpdeq/crimpdeq-grips` (canonical; base task branches on `origin/main`
  and push them there), `fork` is the user's personal fork, `jared` and `upstream` are the sources
  (fetch only, never push).
- No TPU guard and no non-printed parts besides the cord.

## Model facts

- Coordinates as in the original FreeCAD models: X along the roller axes (pinky at low X), Y along
  the fingers, Z depth. Both are left-hand grips (facing the rollers, the pinky is on the left);
  right hand = mirror across YZ. Sisyphus is shifted so its frame corner is the origin (STEP minus
  [5.965, 8.069, 4.13]).
- Prometheus parameters follow the original VarSet (`Base_<I|M|R|P>_<Height|Depth|To_Blocker>`, plus
  diameters, widths and wall sizes); pinky `Height` and `Depth` are the 0 reference.
- Sisyphus reproduces v27 at its defaults. Prometheus defaults to the user's measured right hand;
  `check_step.py` passes v43's values (it moved the blockers by hand, `To_Blocker`
  8.8/12.7/13.9/14.2, but kept the frame length of the VarSet blockers, `Base_Frame_Height` 104).
  Sisyphus features absent from the original model (finger stops, anchor, cradle tool offsets) are
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

## Verify after changes

1. `uvx ruff check --line-length 120 scripts`.
2. Model changes: `uv run scripts/check_step.py` passes (each part within 1% volume and 0.6 mm at
   p95), and `scripts/export.py` for both grips and both hands passes `scripts/check_stl.py`.
3. Prometheus model changes: rerun `docs/illustrations/render.sh`.
4. Measuring page changes: load `docs/src/measure-hand.html` in a browser, place all points,
   confirm no console errors.
5. `mdbook build docs`.

Digital checks do not validate fit, strength or comfort; report the test print as pending.

## Building the Bambu Lab A1 project

Not scripted yet (see `crimpdeq-platform/scripts/export-bambu-project.py` for the pattern) and not
committed. It was built with the Bambu Studio CLI
(`/Applications/BambuStudio.app/Contents/MacOS/BambuStudio`):

1. Flatten the system presets (merge each `inherits` chain) from
   `BambuStudio.app/Contents/Resources/profiles/BBL`: machine `Bambu Lab A1 0.4 nozzle`, filament
   `Bambu PETG HF @BBL A1`, and process `0.20mm Standard @BBL A1` overridden to `wall_loops 5`,
   `sparse_infill_density 35%`, `sparse_infill_pattern cubic`, `enable_support 0`,
   `curr_bed_type Textured PEI Plate` (the default Cool Plate rejects PETG). Keep `from: system`
   on the machine and filament and set `from: User` only on the renamed process
   (`0.20mm Prometheus @BBL A1`); otherwise the CLI reports the process as incompatible.
2. Import the STLs with `--orient 0 --arrange 1 --export-3mf` (no slicing).
3. In `Metadata/model_settings.config`, add per-object `enable_support 1` / `support_type
   normal(auto)` to the frame and index wall, plus `brim_type outer_only` / `brim_width 5` to the
   frame and the ring, middle and index walls. Without a brim, a middle wall lifted on its first
   layers in a test print and the rest of it printed as spaghetti over the plate.
4. Re-run `--arrange 1 --orient 0` on that 3MF (supports added after arranging collide), then
   `--slice 0` to confirm no conflicts or floating-cantilever warnings. Slicing needs the same
   `--load-settings`/`--load-filaments` again; read `warning_message` in `<outputdir>/result.json`.
5. The CLI arrange ignores brims: check the gaps between first-layer paths of different objects in
   the G-code (keep them ≥ 2 mm) and move the item `transform` in `3D/3dmodel.model` where brims
   come closer.

Use absolute output paths; the CLI also drops a `result.json` in the working directory, so run it
outside the repository.
