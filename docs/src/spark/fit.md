# Fit to your hand

The [measuring page](../measure-hand.html) fits the grips to your hand: it measures a photo of it
and downloads print-ready STLs of Photon, Spark or both, for one hand or both, in one zip. Its
steps are on the page. This chapter explains the values it computes and how to export the same
parts yourself. To print the STLs of the zip as they are, skip it and go to
[Printing](printing.md).

## Values

Fitting Spark is optional: untick *Fit Spark to my hand* on the page and Spark keeps the roller
positions of Sisyphus v27, with no photo needed for it. Fitted, the page sets one value per finger:

| Value | Meaning | Computed from |
|---|---|---|
| `Height` | Roller position along the fingers, relative to the pinky | PIP crease plus half the roller diameter, including how far each base crease sits along the hand |

In the original Sisyphus grip the proximal phalanx is vertical against the roller and the DIP joint
rests on its top. The page puts the PIP joint at the roller axis, so each roller top sits half its
diameter past the PIP crease. The roller diameters (index 30, middle 40, ring 38, pinky 22 mm) keep
their defaults.

Each roller sits on a seat in its wall, in front of a finger stop. Once every point is placed, the
page checks the values against the model itself and shows its message when a grip cannot be made
from them, for example when a finger's `Height` runs its seat into its finger stop.

The values do not depend on which hand the photo shows, so one photo can fit both hands; the model
is a left-hand grip and the right hand is its mirror.

## Exporting yourself

Each folder of the zip holds `parameters.txt`, the values the parts were rendered with, and the
clicked points. With [OpenSCAD](https://openscad.org) 2025 or newer installed, `scripts/export.py`
exports the same STLs from it, e.g. after editing a value:

```sh
python3 scripts/export.py spark crimpdeq-grips-spark-right/parameters.txt --hand right
```

For a Bambu Lab A1, `scripts/export_bambu_project.py` turns a folder of STLs into a Bambu Studio
project with all parts on one plate and the settings of [Printing](printing.md):

```sh
python3 scripts/export_bambu_project.py exports/spark-right
```

The STLs go to `exports/spark-right/` and the project to `exports/spark-right.3mf`. It needs
[Bambu Studio](https://bambulab.com/en/download/studio) installed and slices the project to check it.
