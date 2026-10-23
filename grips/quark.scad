// Quark: a one-piece pinch block with four pinches, engraved "Crimpdeq Quark" and "crimpdeq.com"
// on its finger stops.
//
// A profile extruded Length long: two solid long arms (deep pinches) and two hollow short arms with
// round heads (shallow pinches) on either side of a hexagonal hub, with a stop lug on each side
// whose flat ledge stops the fingers on the long arms. The long arms resist flexing under a wide
// pinch, but remain separate for a one-arm pinch. Pinch both arms from outside (wide) or one arm
// with the thumb in the gap (narrow). The cord runs through the heads' cells
// and stays there for all four pinches.
//
// The profile is drawn in (X, Y), symmetric about X = 0, long arms toward +Y; the floor of the gap
// between the long arms is at Y = 0; the heads are 90 mm across.
//
// One piece, in its print pose: standing on an end face, the profile along Z, so the walls print
// without supports.

use <common.scad>
use <fonts/Inter-Bold.ttf>

/* [Pinches (mm)] */
// Between the arms of a side, for the thumb.
Gap = 32;
// Depth of the gap between the heads (shallow pinches).
Shallow = 30;
// Depth of the gap between the long arms (deep pinches).
Deep = 62;
// Along the fingers.
Length = 115;

/* [Hidden] */
$fa = 3;
$fs = 0.3;

eps = 0.01;
WALL = 3;
HEAD_D = 29; // short arms' round heads
ARM_W = 27; // long arms, at their round tips
ARM_ROOT_W = 20.5; // long arms, at the stop ledge: their outer faces flare toward the tips
HUB_H = 25.4; // between the floors of the two gaps
LEDGE_Y = -4; // the stop ledge facing the long arms
STOP_TOP = -16.5; // where the lug's outer face meets its slope up to the neck
STOP_X = 48; // the lugs' outer faces
NECK = [Gap / 2 + HEAD_D - 4.5, -HUB_H + 2.4]; // the waist between a head and its lug
HEAD_C = [Gap / 2 + HEAD_D / 2, -HUB_H - Shallow + HEAD_D / 2];
TIP_C = [Gap / 2 + ARM_W / 2, Deep - ARM_W / 2];
HEX_V = [Gap / 2 + 10.8, -0.43 * HUB_H]; // the hub cell's side vertex, where three webs meet
CONVEX_R = 1.5; // rounds of the outline's corners
CONCAVE_R = 3;
CELL_R = 2; // rounds of the cells' corners
END_R = 1.2; // rounds of the edges of both end faces, where the cord bends

assert(Gap >= 25, str("Gap = ", Gap, " leaves no room for the thumb (25 mm or more)"));
assert(Shallow > HEAD_D / 2 + WALL, str("Shallow = ", Shallow, " is shorter than a head"));
assert(Deep > ARM_W, str("Deep = ", Deep, " is shorter than a long arm's tip"));

BRAND_TEXT = "crimpdeq.com";
NAME_TEXT = "Crimpdeq Quark";
TEXT_FONT = "Inter:style=Bold";
TEXT_DEPTH = 0.8;
TEXT_MARGIN = 0.5; // between the text and the rounds of the lug face, or the end rounds
// The flat of a lug's outer face, between the rounds of its corners: square at the ledge, at the
// top turned by the slope from the neck.
FACE_Y = [STOP_TOP + CONVEX_R * tan((90 - atan2(STOP_TOP - NECK[1], STOP_X - NECK[0])) / 2), LEDGE_Y - CONVEX_R];
// Inter Bold metrics in font units, 2048 per em; OpenSCAD makes an em size / 0.72 long (as in
// mico.scad; textmetrics() is still experimental in the OpenSCAD of CI). The engraved glyphs reach
// from the p and q descenders (-418) to the i dots (1572); ADVANCES holds the advance widths of
// the engraved characters (`hmtx` table).
FONT_UNITS_PER_SIZE = 0.72 * 2048;
GLYPHS_HEIGHT = 418 + 1572;
ADVANCES = [[" ", 485], [".", 684], ["C", 1515], ["Q", 1591], ["a", 1189], ["c", 1205], ["d", 1291],
            ["e", 1220], ["i", 555], ["k", 1188], ["m", 1869], ["o", 1256], ["p", 1291], ["q", 1291],
            ["r", 834], ["u", 1275]];
function advance(ch) =
  let(a = [for (g = ADVANCES) if (g[0] == ch) g[1]])
  assert(len(a) == 1, str("no advance for \"", ch, "\" in ADVANCES"))
  a[0];
function text_units(t, i = 0) = i == len(t) ? 0 : advance(t[i]) + text_units(t, i + 1);
// The largest size at which text t fits the flat and the length between the end rounds.
function text_size(t) =
  FONT_UNITS_PER_SIZE * min((FACE_Y[1] - FACE_Y[0] - 2 * TEXT_MARGIN) / GLYPHS_HEIGHT,
                            (Length - 2 * (END_R + TEXT_MARGIN)) / text_units(t));

// The right half of the outline (x >= 0), mirrored by the caller.
module half_outline2d() {
  translate(HEAD_C) circle(HEAD_D / 2);
  hull() {
    translate([Gap / 2, LEDGE_Y]) square([ARM_ROOT_W, eps]);
    translate(TIP_C) circle(ARM_W / 2);
  }
  // The hub, a head's neck and its stop lug.
  polygon([
    [-eps, -HUB_H], [Gap / 2, -HUB_H], [Gap / 2, HEAD_C[1]], [NECK[0], HEAD_C[1]], NECK,
    [STOP_X, STOP_TOP], [STOP_X, LEDGE_Y], [Gap / 2 + ARM_ROOT_W, LEDGE_Y],
    [Gap / 2 + ARM_ROOT_W, LEDGE_Y + 1], [Gap / 2, LEDGE_Y + 1], [Gap / 2, 0], [-eps, 0],
  ]);
}

module outline2d() {
  round2d(-CONCAVE_R) round2d(CONVEX_R) for (m = [0, 1]) mirror([m, 0]) half_outline2d();
}

// A web WALL thick from p to q.
module web2d(p, q) {
  hull() for (c = [p, q]) translate(c) circle(WALL / 2);
}

// The hollows: the hub cell, a cell in each head (the cord's) and one in each long arm with its
// stop lug, split by three webs from each of the hub cell's side vertices.
module cells2d() {
  round2d(CELL_R) difference() {
    offset(-WALL) outline2d();
    // Stop the long-arm cells at the ledge; solid arms resist the bending of a wide pinch.
    // The hub and head cells remain open for the cord and to save weight.
    translate([-STOP_X - 1, LEDGE_Y + 1]) square([2 * (STOP_X + 1), Deep + ARM_W]);
    for (m = [0, 1]) mirror([m, 0]) {
      web2d([Gap / 2 + WALL / 2, -HUB_H + WALL / 2], HEX_V);
      web2d(HEX_V, [Gap / 2 + WALL / 2, -WALL / 2]);
      web2d(HEX_V, NECK - [WALL / 2, 0]);
    }
  }
}

module profile2d() {
  difference() {
    outline2d();
    cells2d();
  }
}

// Text as large as fits, centered on the flat of a stop lug's outer face, set along the block.
module engraving(t) {
  translate([Length / 2, STOP_X - TEXT_DEPTH, (FACE_Y[0] + FACE_Y[1]) / 2]) rotate([90, 0, 180])
    linear_extrude(TEXT_DEPTH + 1)
      text(t, size = text_size(t), font = TEXT_FONT, halign = "center", valign = "center");
}

// Built along X (along_x maps the profile's (X, Y) to (Y, Z)), then stood up on its x = 0 end.
render() rotate([0, -90, 0]) difference() {
  along_x_ball_swept(END_R, Length - END_R, END_R) offset(-END_R) profile2d();
  engraving(NAME_TEXT);
  translate([Length / 2, 0, 0]) rotate(180) translate([-Length / 2, 0, 0]) engraving(BRAND_TEXT);
}
