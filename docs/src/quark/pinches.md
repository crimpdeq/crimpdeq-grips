# Pinches and cord

![Quark with its long arms up: Crimpdeq Quark on the stop lug](images/quark.png)

Quark is one printed pinch block with four pinches. Its profile has two long arms and two short arms with round heads, on either side of a hollow hub, 115 mm
long. A lug on each side of the hub carries the engravings, and its flat ledge stops the fingers
on the long arms.

| Pinch | Hold | Across | Depth |
|---|---|---|---|
| Deep wide | Both long arms from outside | 73 mm at the ledge, 86 mm at the tips | 66 mm to the ledge |
| Deep narrow | One long arm, the thumb in the gap | 20.5 mm at the ledge, 27 mm at the tip | 62 mm to the gap's floor |
| Shallow wide | Both heads from outside | 90 mm | |
| Shallow narrow | One head, the thumb in the gap | 29 mm | 30 mm to the gap's floor |

The long arms widen toward their tips. Unlike the hollow hub and cord heads, the long arms are
solid to reduce flex during the deep wide pinch. They are still separate: for a deep narrow pinch,
put the thumb between the arms and hold just one ear.

For more traction on the deep wide pinch, try adhesive-backed fine grip tape (around 120–180 grit)
on the two long arms' outer faces. Cut strips to fit the straight faces, leaving the rounded tips,
ledge and end edges uncovered. Clean and dry the PETG first; press the tape down firmly and check
that it does not peel before each session. Start with light loads: abrasive tape can irritate skin.
Do not put tape on the cord heads or inside their cells.

## Cord

The cord runs through the cells of both heads and stays there for all four pinches. Use about
1.6 m of 5 mm rated accessory cord: thread it through both heads and knot its two sides together
below the block. The cord bends over the ends of the head cells, whose edges are rounded.

The solid-arm revision and grip tape have not been test-printed or load-tested. Build up the load
gradually, and replace the block if it whitens or cracks, above all at the arm roots and ends of
the heads. Check whether either arm visibly deflects before using heavier loads.

## Size

The gap between the arms of a side (`Gap`, 32 mm, room for the thumb), the depths of the gaps
(`Shallow`, 30 mm, and `Deep`, 62 mm) and the length (`Length`, 115 mm) are parameters. For other
values, set them in a parameter file and export Quark with it:

```sh
echo "Deep = 55" > my-quark.txt
python3 scripts/export.py quark my-quark.txt
```

The STL goes to `exports/quark/quark.stl`. The same values are in OpenSCAD's Customizer (Window →
Customizer) when you open `grips/quark.scad`. The engravings grow or shrink to fill the lugs' faces.
The [measuring page](../measure-hand.html) does not cover Quark.
