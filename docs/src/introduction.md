# Crimpdeq Grips

![Assembled Photon grip](photon/images/step-10.png)

Crimpdeq Grips are 3D-printed grips for isolated finger training: each finger rests on its own
roller, under a block that holds its last joint. There are two designs, both parametric OpenSCAD
models:

- **Photon**, fitted to your hand: [measure a photo of it](photon/fit.md) and export parts
  that place every roller under its fingertip.
- **Spark**, with larger rollers (22 to 40 mm). Its chapters are still to come; its parts export
  like Photon's (see [Models and checks](development.md)).

Every part, pins included, prints in the same plastic: no metal rods, screws or TPU. The only
extra is a cord through the anchor.

## Getting the parts

Each [release](https://github.com/crimpdeq/crimpdeq-grips/releases) attaches the STLs of both grips
for both hands, at the models' defaults; Photon defaults to one measured right hand. To fit
Photon to your own hand, export the parts yourself as described in
[Fit to your hand](photon/fit.md).

## Credits

The grips build on [OpenGrips](https://github.com/opengrips/Open_Grips) and on
[Jared-Is-Coding's fork](https://github.com/Jared-Is-Coding/Open_Grips), whose Prometheus v43 and
Sisyphus v27 STEP files the OpenSCAD models rebuild as Photon and Spark. Like them, this project is
released under CC0.

All illustrations are rendered from the OpenSCAD models, so they match the exported parts.
