# Printing

Print Mico in PLA with these settings. It has not been test-printed with them yet.

| Setting | Value |
|---|---|
| Layer height | 0.2 mm |
| Walls | 7 |
| Infill | 35% cubic, or more |
| Plate | Textured PEI |
| Supports | None |
| Brim | None |

PETG (HF) works too, with the same settings: it bends before it breaks, where PLA cracks, and it
takes more heat. PLA softens from about 55 °C, so keep a PLA Mico out of hot cars and summer sun.
Either way, replace it if it whitens or cracks, above all around the cord hole.

The STL is already in its print pose: lying on its bottom face, the finger hole upright. In this
pose the cord hole runs across the plate and needs no supports. The engravings are around the
back, where walls should give them cleaner edges than the top face, on which a smaller name closed
up in a test print; they have not been test-printed there yet.

Each release has Mico's STL (`crimpdeq-grips-mico.stl`) and a Bambu Studio project for the Bambu
Lab A1 (`crimpdeq-grips-mico.3mf`) with these settings, in Bambu PLA Basic; for PETG, change the
filament in Bambu Studio. To build the project from your own STL:

```sh
python3 scripts/export_bambu_project.py exports/mico
```
