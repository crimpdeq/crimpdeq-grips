# Fit to your hand

Photon places each roller from three values per finger, relative to the pinky. The
[measuring page](../measure-hand.html) computes them from a photo of your hand and downloads
print-ready STLs of every part in one zip. It can also place Spark's rollers from the same photo,
or give Spark at its default roller positions without a photo.

## 1. Measure

Open the [measuring page](../measure-hand.html) in Chrome, Safari or Firefox. It renders the parts
with OpenSCAD inside the page, so it has to be served with the book (`mdbook serve docs` locally,
after `python3 scripts/fetch_openscad_wasm.py`); opened as a file it cannot load the models.

- What to print: Photon, Spark or both, and the right hand, the left or both. Fitting Spark to your
  hand is optional; untick it and Spark keeps its standard roller positions (those of Sisyphus
  v27) and needs no photo. For both hands one photo of either hand fits both (the values do not
  depend on which hand it shows); tick "A photo of each hand" to measure each from its own photo,
  switching between them with the Left/Right hand buttons.
- Photo: palm up, fingers straight and slightly apart, a millimetre ruler beside the fingers raised
  to palm height (e.g. on a book), phone parallel to the table and above the fingers. Use the
  original full-resolution JPEG or PNG, not a screenshot.
- Points: the bar below the photo names the next point to click, and the list beside it shows
  them all. First two ruler marks far apart (e.g. 0 and 10 cm; set their distance if it is not
  100 mm), then on each finger, from index to pinky, the base crease, middle joint (PIP) crease,
  end joint (DIP) crease and fingertip. Scroll to zoom, drag to pan or move a point; click a point
  in the list to place it again.
- **Show measurements** opens the measured lengths and the values below, next to the defaults.

The page sets three values per finger for Photon:

| Value | Meaning | Computed from |
|---|---|---|
| `Height` | Roller up/down | Fingertip position in the OpenGrips claw grip (proximal phalanx vertical, PIP and DIP flexed 55°), including how far each base crease sits along the hand |
| `Depth` | Roller forward/backward | Same claw grip, front-to-back fingertip position |
| `To_Blocker` | Roof height: roller top to blocker | `DIP→tip / tan(angle)`, with angles of 57° (index), 60° (middle, ring) and 55° (pinky) |

The original OpenGrips instructions set `Height` to the full finger length minus the pinky's. That
rule ignores that the pinky starts lower on the hand, which put the rollers 8–14 mm too low on the
measured example hand.

For Spark it sets `Height`, the position of each roller top, relative to the pinky. In the
original Sisyphus grip the proximal phalanx is vertical against the roller and the DIP joint rests
on its top; the page puts the PIP joint at the roller axis, so each roller top sits half its
diameter past the PIP crease, including how far each base crease sits along the hand.

Two things skew the values:

- The ruler distance must match the clicked marks: a 1 cm span entered as 100 mm gives values ten
  times too large.
- Camera tilt changes the scale along the photo (about 10% seen); use widely spaced ruler marks
  beside the fingers. A ruler lying below the palm reads lengths about 4% long; raise it to palm
  height.

## 2. Download

**Download STLs (zip)** renders the 14 parts of every chosen grip and hand, about ten seconds per
grip and hand, and downloads one zip with a folder per grip and hand
(`crimpdeq-grips-<grip>-<hand>/`). The STLs are already oriented for printing; the model is a
left-hand grip and the right hand is its mirror. Photon's frame length follows the middle finger,
so its `Base_M_Height + Base_M_To_Blocker` must be the largest of the four; the page shows the
model's message if not.

Each folder also holds `parameters.txt`, the values the parts were rendered with, and the clicked
points. With [OpenSCAD](https://openscad.org) 2025 or newer installed, `scripts/export.py` exports
the same STLs from it:

```sh
python3 scripts/export.py photon crimpdeq-grips-photon-right/parameters.txt --hand right --out my-right-hand
```

For a Bambu Lab A1, `scripts/export_bambu_project.py` turns a folder of STLs into a Bambu Studio
project with all parts on one plate and the settings of [Printing](printing.md):

```sh
python3 scripts/export_bambu_project.py crimpdeq-grips-photon-right --output my-right-hand.3mf
```

It needs [Bambu Studio](https://bambulab.com/en/download/studio) installed and slices the project
to check it.

The fit has only been checked digitally; adjust the values after a test print.
