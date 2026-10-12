# Fit to your hand

Prometheus places each roller from three values per finger, relative to the pinky. The
[measuring page](../measure-hand.html) computes them from a photo of your hand, and
`scripts/export.py` turns them into print-ready STLs.

## 1. Measure

Open the [measuring page](../measure-hand.html) in Chrome or Safari. It is a single HTML file
(`docs/src/measure-hand.html`) and also works offline.

- Hands: measure one hand and use it for both (the values do not depend on which hand the photo
  shows), or measure each hand from its own photo, switching between them with the Left/Right
  buttons.
- Photo: palm up, fingers straight and slightly apart, a millimetre ruler beside the fingers raised
  to palm height (e.g. on a book), phone parallel to the table and above the fingers. Use the
  original full-resolution JPEG or PNG, not a screenshot.
- Enter the distance between two ruler marks far apart (e.g. 0 and 10 cm = 100 mm) and click them.
- For each finger, from index to pinky, click the base crease, middle joint (PIP) crease, end joint
  (DIP) crease and fingertip. Scroll to zoom, drag to pan or move a point.
- Copy the text block into a file, e.g. `my-right-hand.txt`; when measuring each hand, one file per
  hand. Its first line says which `--hand` to export it with.

The page sets three values per finger:

| Value | Meaning | Computed from |
|---|---|---|
| `Height` | Roller up/down | Fingertip position in the OpenGrips claw grip (proximal phalanx vertical, PIP and DIP flexed 55°), including how far each base crease sits along the hand |
| `Depth` | Roller forward/backward | Same claw grip, front-to-back fingertip position |
| `To_Blocker` | Roof height: roller top to blocker | `DIP→tip / tan(angle)`, with angles of 57° (index), 60° (middle, ring) and 55° (pinky) |

The original OpenGrips instructions set `Height` to the full finger length minus the pinky's. That
rule ignores that the pinky starts lower on the hand, which put the rollers 8–14 mm too low on the
measured example hand.

Two things skew the values:

- The ruler distance must match the clicked marks: a 1 cm span entered as 100 mm gives values ten
  times too large.
- Camera tilt changes the scale along the photo (about 10% seen); use widely spaced ruler marks
  beside the fingers. A ruler lying below the palm reads lengths about 4% long; raise it to palm
  height.

## 2. Export

With [OpenSCAD](https://openscad.org) 2025 or newer installed, from the repository root:

```sh
python3 scripts/export.py prometheus my-right-hand.txt --hand right --out my-right-hand
```

This writes one STL per part to `my-right-hand/`, already oriented for printing. The model is a
left-hand grip; `--hand right` mirrors it. The frame length follows the middle finger, so its
`Base_M_Height + Base_M_To_Blocker` must be the largest of the four; the export stops with a
message if not.

The fit has only been checked digitally; adjust the values after a test print.
