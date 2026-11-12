# Printing

Print Quark in PETG (HF) with these settings. The solid-arm revision has not been test-printed yet.

| Setting | Value |
|---|---|
| Layer height | 0.2 mm |
| Walls | 5 |
| Infill | 35% cubic, or more |
| Plate | Textured PEI |
| Supports | None |
| Brim | 5 mm |

The hollow hub and head walls are 3 mm thick, so 5 walls print them solid. The long arms now
have solid cross-sections in the model and receive the selected infill between their perimeters;
do not use zero infill.

The STL is already in its print pose: standing on an end face, 115 mm tall, the profile flat on the
plate. In this pose the outer walls and cell walls are vertical and need no supports. Its footprint
includes the thin walls of the profile, so the brim keeps it from lifting on its first layers. Wash
the plate with dish soap before printing.

Each release has Quark's STL (`crimpdeq-grips-quark.stl`) and a Bambu Studio project for the Bambu
Lab A1 (`crimpdeq-grips-quark.3mf`) with these settings. To build the project from your own STL:

```sh
python3 scripts/export_bambu_project.py exports/quark
```
