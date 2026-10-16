# Fit to your hand

The [measuring page](../measure-hand.html) fits the grips to your hand: it measures a photo of it
and downloads print-ready STLs of Photon, Spark or both, for one hand or both, in one zip. Its
steps are on the page. This chapter explains the values it computes and how to export the same
parts yourself. To print the STLs of the zip as they are, skip it and go to
[Printing](printing.md).

## Values

Photon places each roller from three values per finger, relative to the pinky:

| Value | Meaning | Computed from |
|---|---|---|
| `Height` | Roller up/down | Fingertip position in the OpenGrips claw grip (proximal phalanx vertical, PIP and DIP flexed 55°), including how far each base crease sits along the hand |
| `Depth` | Roller forward/backward | Same claw grip, front-to-back fingertip position |
| `To_Blocker` | Roof height: roller top to blocker | `DIP→tip / tan(angle)`, with angles of 57° (index), 60° (middle, ring) and 55° (pinky) |

The original OpenGrips instructions set `Height` to the full finger length minus the pinky's. That
rule ignores that the pinky starts lower on the hand, which put the rollers 8–14 mm too low on the
measured example hand.

Photon's frame length follows the middle finger, so no other finger's `Height + To_Blocker` may
reach much past the middle finger's. Once every point is placed, the page checks the values against
the model itself and shows its message when a grip cannot be made from them.

The values do not depend on which hand the photo shows, so one photo can fit both hands; the model
is a left-hand grip and the right hand is its mirror.

## Exporting yourself

Each folder of the zip holds `parameters.txt`, the values the parts were rendered with, and the
clicked points. With [OpenSCAD](https://openscad.org) 2025 or newer installed, `scripts/export.py`
exports the same STLs from it, e.g. after editing a value:

```sh
python3 scripts/export.py photon crimpdeq-grips-photon-right/parameters.txt --hand right
```

For a Bambu Lab A1, `scripts/export_bambu_project.py` turns a folder of STLs into a Bambu Studio
project with all parts on one plate and the settings of [Printing](printing.md):

```sh
python3 scripts/export_bambu_project.py exports/photon-right
```

The STLs go to `exports/photon-right/` and the project to `exports/photon-right.3mf`. It needs
[Bambu Studio](https://bambulab.com/en/download/studio) installed and slices the project to check it.
