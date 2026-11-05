# Printing

Print Slap in PETG (HF) with these settings. It has not been test-printed yet.

| Setting | Value |
|---|---|
| Layer height | 0.2 mm |
| Walls | 5 |
| Infill | 35% cubic, or more |
| Plate | Textured PEI |
| Supports | None |
| Brim | 5 mm |

The STL is already in its print pose: standing on an end face, 90 mm tall, the profile flat on the
plate. In this pose the cord slot is a vertical hole and every wall is vertical, so nothing needs
supports, and the layers follow the profile: the load across the bend runs along them instead of
pulling them apart. The brim holds the rounded bottom edges down on the first layers. Wash the
plate with dish soap before printing.

Each release has Slap's STL (`crimpdeq-grips-slap.stl`) and a Bambu Studio project for the Bambu
Lab A1 (`crimpdeq-grips-slap.3mf`) with these settings. To build the project from your own STL:

```sh
python3 scripts/export_bambu_project.py exports/slap
```
