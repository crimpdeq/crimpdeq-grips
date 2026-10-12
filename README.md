# Crimpdeq Grips

![Assembled Prometheus grip](docs/src/prometheus/images/step-10.png)

3D-printed grips for isolated finger training, as parametric OpenSCAD models: each finger rests
on its own roller. Prometheus is fitted to your hand from a photo; Sisyphus has larger rollers.
Every part prints in plastic, pins included; the only extra is a cord.

- Book: fitting, printing and assembly in [`docs/`](docs/src/SUMMARY.md) (`mdbook serve docs`).
- Hand measuring page: [`docs/src/measure-hand.html`](docs/src/measure-hand.html).
- Models: [`grips/`](grips/); export all parts of one hand with
  `python3 scripts/export.py prometheus PARAMS --hand right --out DIR`.
- STLs of both grips for both hands: attached to every
  [release](https://github.com/crimpdeq/crimpdeq-grips/releases).

Based on [OpenGrips](https://github.com/opengrips/Open_Grips) and
[Jared-Is-Coding's fork](https://github.com/Jared-Is-Coding/Open_Grips), whose Prometheus v43 and
Sisyphus v27 STEP files the models rebuild. Released under [CC0](LICENSE).
