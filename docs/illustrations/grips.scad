// Both finished grips side by side, Photon on the left, from the STLs of
// ../../scripts/export.py --in-place; render.sh sets stl to their directory, which also holds per
// grip its name engraving's cut (part "name") and its frame without the name: their intersection
// fills the engraving in, in a color of its own.

stl = "/tmp/";

PARTS = ["frame", "ring_wall", "middle_wall", "index_wall", "end_wall", "pinky_roller", "ring_roller",
  "middle_roller", "index_roller", "pinky_pin", "ring_pin", "middle_pin", "index_pin", "post"];

module grip(name) {
  color("gainsboro") for (p = PARTS) import(str(stl, name, "_right_", p, ".stl"));
  color("tomato") intersection() {
    import(str(stl, name, "_right_name.stl"));
    import(str(stl, name, "_right_unnamed_frame.stl"));
  }
}

grip("photon");
translate([125, 0, 0]) grip("spark");
