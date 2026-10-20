// Mico: a one-piece loop for mono (single finger) training, engraved "Crimpdeq Mico" and
// "crimpdeq.com".
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

// Engravings, set along arcs. OpenSCAD cannot set text along a path, so each letter is placed
// on its own from its advance width: ADVANCES holds those of the engraved characters in font
// units (Inter Bold has 2048 per em, `hmtx` table); OpenSCAD makes an em size / 0.72 long.
TEXT_FONT = "Inter:style=Bold";
TEXT_DEPTH = 0.5;
ADVANCES = [[" ", 485], [".", 684], ["C", 1515], ["M", 1908], ["c", 1205], ["d", 1291], ["e", 1220], ["i", 555],
            ["m", 1869], ["o", 1256], ["p", 1291], ["q", 1291], ["r", 834]];
function font_mm(units, size) = units * size / (0.72 * 2048);
function advance(ch, size) =
  let(a = [for (g = ADVANCES) if (g[0] == ch) g[1]])
  assert(len(a) == 1, str("no advance for \"", ch, "\" in ADVANCES"))
  font_mm(a[0], size);

// Name, on the top face in two arcs around the finger hole, letter tops toward the nose: read
// with the nose up, the outer arc comes first. On one arc it only fits below size 2.5. The
// inner baseline clears the rim round by 0.6 (Mico has no descenders); the outer line's
// descenders (418 units) clear the inner line's i dots (1572) by 0.5.
NAME_LINES = ["Crimpdeq", "Mico"];
NAME_SIZE = 2.8;
NAME_RADII = let(r = HOLE_R + RIM_R + 0.6) [r + font_mm(418 + 1572, NAME_SIZE) + 0.5, r];

// Around the back of the body, upright, centered on its height between the descenders of p and
// q (-418 units) and the ascender of d (1490).
BRAND_TEXT = "crimpdeq.com";
BRAND_SIZE = 5;
BRAND_BASELINE = HEIGHT / 2 - font_mm((1490 - 418) / 2, BRAND_SIZE);

function sum(v, n) = n <= 0 ? 0 : v[n - 1] + sum(v, n - 1);

// Angles of the letter centers of text set on a circle of radius r, centered on angle `at` and
// running counterclockwise (dir = 1) or clockwise (dir = -1).
function letter_angles(text, size, r, at, dir) =
  let(adv = [for (ch = text) advance(ch, size)], total = sum(adv, len(adv)))
  [for (i = [0:len(adv) - 1]) at + dir * (sum(adv, i) + adv[i] / 2 - total / 2) / r * 180 / PI];

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

// The name lines, reading from +X to -X: seen from above with the nose up, left to right.
module name() {
  for (l = [0:len(NAME_LINES) - 1]) {
    line = NAME_LINES[l];
    r = NAME_RADII[l];
    a = letter_angles(line, NAME_SIZE, r, -90, -1);
    for (i = [0:len(line) - 1])
      translate([r * cos(a[i]), r * sin(a[i]), HEIGHT - TEXT_DEPTH]) rotate(a[i] - 90)
        linear_extrude(TEXT_DEPTH + 1) letter(line[i], NAME_SIZE);
  }
}

// BRAND_TEXT, reading from +X to -X: seen from behind (+Y), left to right.
module brand() {
  a = letter_angles(BRAND_TEXT, BRAND_SIZE, BODY_R, 90, 1);
  for (i = [0:len(BRAND_TEXT) - 1])
    rotate(a[i] - 90) translate([0, BODY_R - TEXT_DEPTH, BRAND_BASELINE]) rotate([90, 0, 180])
      linear_extrude(TEXT_DEPTH + 1) letter(BRAND_TEXT[i], BRAND_SIZE);
}

render() difference() {
  chamfered(HEIGHT, CHAMFER) plan();
  finger_hole();
  cord_path();
  name();
  brand();
}
