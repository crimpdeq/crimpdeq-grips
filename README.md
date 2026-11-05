# Crimpdeq Grips

![Photon (left) and Spark (right), facing the rollers](docs/src/images/grips.png)

3D-printed grips for isolated finger training, as parametric OpenSCAD models. In the two grips,
each finger rests on its own roller:

- **Photon** targets the deep flexor (FDP), which bends the fingertip joint. In a claw grip,
  each fingertip rests on its roller under a block that holds its last joint.
- **Spark** targets the superficial flexor (FDS), which bends the middle joint. Each finger bends
  over a larger roller (22 to 40 mm), the middle joint level with its axis and the end joint on
  its top.

Both are fitted to your hand from a photo (optional for Spark). Every part prints in plastic, pins
included; the only extra is a cord.

Mico, Quark and Slap are single printed parts hung from a cord:

| [Mico](https://grips.crimpdeq.com/mico/size.html) | [Quark](https://grips.crimpdeq.com/quark/pinches.html) | [Slap](https://grips.crimpdeq.com/slap/angles.html) |
| :---: | :---: | :---: |
| ![Mico](docs/src/mico/images/mico.png) | ![Quark](docs/src/quark/images/quark.png) | ![Slap](docs/src/slap/images/slap.png) |
| Mono (single finger) training: one finger goes through its hole and a cord through its nose. | Pinch block with four pinches (deep or shallow, wide or narrow); a cord runs through its two heads. | Sloper pump trainer: a bent bar, gripped over its bend, with five hanging angles. |

- Book: fitting, printing and assembly at [grips.crimpdeq.com](https://grips.crimpdeq.com), source in
  [`docs/`](docs/src/SUMMARY.md) (`mdbook serve docs`).
- Hand measuring page: [grips.crimpdeq.com/measure-hand.html](https://grips.crimpdeq.com/measure-hand.html),
  source in [`docs/src/measure-hand.html`](docs/src/measure-hand.html); it measures a photo
  and downloads the STLs of Photon, Spark or both in a zip (served with the book:
  `python3 scripts/fetch_openscad_wasm.py`, then `mdbook serve docs`).
- Models: [`grips/`](grips/); export all parts of one hand with
  `python3 scripts/export.py photon PARAMS --hand right --out DIR`, or Mico, Quark or Slap with
  `python3 scripts/export.py mico PARAMS --out DIR`.
- STLs and Bambu Lab A1 projects (3MF) of both grips for both hands and of Mico, Quark and Slap: attached to every
  [release](https://github.com/crimpdeq/crimpdeq-grips/releases); build a project from your own
  STLs with `python3 scripts/export_bambu_project.py DIR --output FILE.3mf`.

Photon and Spark are based on [OpenGrips](https://github.com/opengrips/Open_Grips) and
[Jared-Is-Coding's fork](https://github.com/Jared-Is-Coding/Open_Grips), whose Prometheus v43 and
Sisyphus v27 STEP files the models rebuild. Released under [CC0](LICENSE).
