# Printing

Print Mico in PETG (HF) with the settings of the grips. It has not been test-printed with them
yet.

| Setting | Value |
|---|---|
| Layer height | 0.2 mm |
| Walls | 5 |
| Infill | 35% cubic, or more |
| Plate | Textured PEI |
| Supports | None |
| Brim | None |

The STL is already in its print pose: lying on its bottom face, `Crimpdeq Mico` on top. In this
pose the cord hole runs across the plate and needs no supports.

Each release has Mico's STL (`crimpdeq-grips-mico.stl`) and a Bambu Studio project for the Bambu
Lab A1 (`crimpdeq-grips-mico.3mf`) with these settings. To build the project from your own STL:

```sh
python3 scripts/export_bambu_project.py exports/mico
```
