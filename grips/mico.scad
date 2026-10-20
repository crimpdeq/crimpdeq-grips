// Mico: a one-piece loop for mono (single finger) training, engraved "Crimpdeq Mico" and
// "crimpdeq.com" around the back.
//
// One piece, in its print pose: lying on z = 0 with the finger hole along Z around the origin.
// The nose points toward -Y, ending in a flat face; the cord bore crosses it along X.

use <common.scad>
use <fonts/Inter-Bold.ttf>

/* [Finger hole (mm)] */
Hole_Diameter = 22;

/* [Hidden] */
$fa = 3;
$fs = 0.3;

HEIGHT = 25;
HOLE_R = Hole_Diameter / 2;
BODY_R = HOLE_R + 8; // round body around the hole
CHAMFER = 2.5; // 45 degrees, around the top and bottom faces
RIM_R = 2.5; // rounds of the finger hole rims

// Nose: sides tangent to the body that converge toward -Y at SIDE_ANGLE, a flat end face
// NOSE_LENGTH past the body, and NOSE_FILLET_R rounds between them. SIDE_N is the right side's
// outward normal; the side lies on SIDE_N * p = BODY_R.
SIDE_ANGLE = 17.46;
SIDE_N = [cos(SIDE_ANGLE), -sin(SIDE_ANGLE)];
NOSE_LENGTH = 11;
END_Y = -(BODY_R + NOSE_LENGTH);
NOSE_FILLET_R = 2;
// The right nose round's center: NOSE_FILLET_R inside the side and the end face.
FILLET_C = let(y = END_Y + NOSE_FILLET_R)
  [(BODY_R - NOSE_FILLET_R + y * sin(SIDE_ANGLE)) / cos(SIDE_ANGLE), y];

// Cord bore: its axis at z = HEIGHT / 2, 11.31 from the end face; exits rounded.
CORD_D = 8.5;
CORD_Y = END_Y + 11.31;
CORD_EXIT_R = 1.5;

// Engravings, set along the back of the body. OpenSCAD cannot set text along a path, so each letter is placed
// on its own from its advance width: ADVANCES holds those of the engraved characters in font
// units (Inter Bold has 2048 per em, `hmtx` table); OpenSCAD makes an em size / 0.72 long.
TEXT_FONT = "Inter:style=Bold";
TEXT_DEPTH = 0.8;
ADVANCES = [[" ", 485], [".", 684], ["C", 1515], ["M", 1908], ["c", 1205], ["d", 1291], ["e", 1220], ["i", 555],
            ["m", 1869], ["o", 1256], ["p", 1291], ["q", 1291], ["r", 834]];
function font_mm(units, size) = units * size / (0.72 * 2048);
function advance(ch, size) =
  let(a = [for (g = ADVANCES) if (g[0] == ch) g[1]])
  assert(len(a) == 1, str("no advance for \"", ch, "\" in ADVANCES"))
  font_mm(a[0], size);

// Upright lines around the back, the first on top, centered on the height between the lowest
// descender (p, q: 418 units) and the highest top (i dots: 1572). On walls the strokes print
// clean; on the top face, text small enough to fit the nose closed up in a test print.
TEXT_LINES = ["Crimpdeq Mico", "crimpdeq.com"];
TEXT_SIZE = 5;
LINE_PITCH = font_mm(418 + 1572, TEXT_SIZE) + 1;
BASELINES = let(b = HEIGHT / 2 - (LINE_PITCH + font_mm(1572 - 418, TEXT_SIZE)) / 2) [b + LINE_PITCH, b];

function sum(v, n) = n <= 0 ? 0 : v[n - 1] + sum(v, n - 1);

// Angles of the letter centers of text set on a circle of radius r, centered on angle `at` and
// running counterclockwise (dir = 1) or clockwise (dir = -1).
function letter_angles(text, size, r, at, dir) =
  let(adv = [for (ch = text) advance(ch, size)], total = sum(adv, len(adv)))
  [for (i = [0:len(adv) - 1]) at + dir * (sum(adv, i) + adv[i] / 2 - total / 2) / r * 180 / PI];

// Each line stays on the round back, between the tangent points of the nose sides.
for (line = TEXT_LINES)
  assert(sum([for (ch = line) advance(ch, TEXT_SIZE)], len(line)) / BODY_R * 180 / PI < 180 + 2 * SIDE_ANGLE - 10,
         str("\"", line, "\" is too long for the back of the body"));

// One letter, centered on its advance along X, its baseline on Y = 0.
module letter(ch, size) {
  translate([-advance(ch, size) / 2, 0]) text(ch, size = size, font = TEXT_FONT);
}

// Plan: the body and the nose rounds, hulled.
module plan() {
  hull() {
    circle(BODY_R);
    for (m = [0, 1]) mirror([m, 0]) translate(FILLET_C) circle(NOSE_FILLET_R);
  }
}

// A convex 2D shape extruded h high with c chamfers around both faces.
module chamfered(h, c) {
  hull() {
    linear_extrude(h) offset(-c) children();
    translate([0, 0, c]) linear_extrude(h - 2 * c) children();
  }
}

module finger_hole() {
  module rim2d() {
    difference() {
      translate([0, -1]) square([HOLE_R + RIM_R, RIM_R + 1]);
      translate([HOLE_R + RIM_R, RIM_R]) circle(RIM_R);
    }
  }
  rotate_extrude() {
    translate([0, -1]) square([HOLE_R, HEIGHT + 2]);
    rim2d();
    translate([0, HEIGHT]) mirror([0, 1]) rim2d();
  }
}

module cord_path() {
  translate([-BODY_R - 1, CORD_Y, HEIGHT / 2]) rotate([0, 90, 0]) cylinder(d = CORD_D, h = 2 * BODY_R + 2);
  for (m = [0, 1]) mirror([m, 0, 0])
    bore_exit_round([CORD_Y, HEIGHT / 2], CORD_D / 2, BODY_R * SIDE_N, SIDE_N, CORD_EXIT_R);
}

// TEXT_LINES, reading from +X to -X: seen from behind (+Y), left to right.
module engraving() {
  for (l = [0:len(TEXT_LINES) - 1]) {
    line = TEXT_LINES[l];
    a = letter_angles(line, TEXT_SIZE, BODY_R, 90, 1);
    for (i = [0:len(line) - 1])
      rotate(a[i] - 90) translate([0, BODY_R - TEXT_DEPTH, BASELINES[l]]) rotate([90, 0, 180])
        linear_extrude(TEXT_DEPTH + 1) letter(line[i], TEXT_SIZE);
  }
}

render() difference() {
  chamfered(HEIGHT, CHAMFER) plan();
  finger_hole();
  cord_path();
  engraving();
}
