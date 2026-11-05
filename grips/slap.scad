// Slap: a one-piece sloper pump trainer, engraved "Crimpdeq Slap" and "crimpdeq.com" under its
// gripped arm.
//
// A bent bar hung from a cord: a short cord arm, a bend of Bend_Angle and a long gripped arm, the
// hand over the convex outer face, with sandpaper glued on for friction. The cord runs through a
// slot across the cord arm, out of both end faces, and is tied above; the load pulls it into one of
// the slot's notches, which set the hanging angle.
//
// The profile is drawn in (X, Y) as the trainer hangs, the bend's center at the origin: the cord
// arm runs toward -X along Y = BEND_R, the gripped arm drops toward +X, the outer face is up.
//
// One piece, in its print pose: standing on an end face, the profile along Z, so the slot is a
// vertical hole and the layers follow the profile.

use <common.scad>
use <fonts/Inter-Bold.ttf>

/* [Size (mm, degrees)] */
// Across the fingers.
Width = 90;
// Between the directions of the two arms.
Bend_Angle = 55;

/* [Hidden] */
$fa = 3;
$fs = 0.3;

eps = 0.01;
THICKNESS = 16;
SHORT_ARM = 60; // cord arm, straight part of its centerline
LONG_ARM = 62; // gripped arm, straight part of its centerline
BEND_R = 28; // centerline; the sloper's radius is BEND_R + THICKNESS / 2
TIP_R = 3; // corners of the cord arm's tip
END_OUTER_R = 9; // corners of the gripped arm's end
END_INNER_R = 4;
END_R = 1.5; // rounds of the edges of both end faces, where the cord bends
OUTER_R = BEND_R + THICKNESS / 2;
INNER_R = BEND_R - THICKNESS / 2;
// The gripped arm's direction toward its end and its outer normal.
ARM_U = [cos(Bend_Angle), -sin(Bend_Angle)];
ARM_N = [sin(Bend_Angle), cos(Bend_Angle)];

// Cord slot: a channel along the cord arm with NOTCHES straight-sided notches rising from it
// toward the outer face, FIRST_NOTCH from the bend and NOTCH_PITCH apart.
CORD = 4;
SLOT_W = CORD + 1;
NOTCHES = 5;
NOTCH_PITCH = 11;
NOTCH_RISE = 3.5; // the notches' round tops above the channel's centerline
FIRST_NOTCH = 2;
TOP_WALL = 4; // above the notches, carrying the cord's load
SLOT_Y = OUTER_R - TOP_WALL - SLOT_W / 2 - NOTCH_RISE;
NOTCH_X = [for (k = [0:NOTCHES - 1]) -(FIRST_NOTCH + k * NOTCH_PITCH)];
BOTTOM_WALL = SLOT_Y - SLOT_W / 2 - INNER_R;
TIP_WALL = SHORT_ARM + NOTCH_X[NOTCHES - 1] - SLOT_W / 2;

// Inter Bold metrics in font units, 2048 per em; OpenSCAD makes an em size / 0.72 long (as in
// mico.scad). The engraved glyphs reach from the p and q descenders (-418) to the i dots (1572);
// ADVANCES holds the advance widths of the engraved characters (`hmtx` table).
TEXT_LINES = ["Crimpdeq Slap", "crimpdeq.com"];
TEXT_FONT = "Inter:style=Bold";
TEXT_SIZE = 6;
TEXT_DEPTH = 0.8;
TEXT_MARGIN = 1; // between the text and the end rounds
FONT_UNITS_PER_SIZE = 0.72 * 2048;
LINE_PITCH = TEXT_SIZE * (418 + 1572) / FONT_UNITS_PER_SIZE + 1.5;
ADVANCES = [[" ", 485], [".", 684], ["C", 1515], ["S", 1341], ["a", 1189], ["c", 1205], ["d", 1291],
            ["e", 1220], ["i", 555], ["l", 555], ["m", 1869], ["o", 1256], ["p", 1291], ["q", 1291],
            ["r", 834]];
function advance(ch) =
  let(a = [for (g = ADVANCES) if (g[0] == ch) g[1]])
  assert(len(a) == 1, str("no advance for \"", ch, "\" in ADVANCES"))
  a[0];
function text_length(t, i = 0) = i == len(t) ? 0 : TEXT_SIZE * advance(t[i]) / FONT_UNITS_PER_SIZE + text_length(t, i + 1);

assert(Bend_Angle >= 30 && Bend_Angle <= 80, str("Bend_Angle = ", Bend_Angle, " is outside 30 to 80 degrees"));
assert(BOTTOM_WALL >= 3, str("the wall under the cord slot is ", BOTTOM_WALL, " mm, under 3 mm"));
assert(TIP_WALL >= 8, str("the cord arm ends ", TIP_WALL, " mm past the slot, under 8 mm"));
for (line = TEXT_LINES)
  assert(text_length(line) <= Width - 2 * (END_R + TEXT_MARGIN), str("Width = ", Width, " is too narrow for \"", line, "\""));

function arc(c, r, a0, a1, n = 24) = [for (i = [0:n]) c + r * [cos(a0 + (a1 - a0) * i / n), sin(a0 + (a1 - a0) * i / n)]];

// The bar, with rounded corners at both ends.
module bar2d() {
  t = THICKNESS / 2;
  e = BEND_R * ARM_N + LONG_ARM * ARM_U; // the gripped arm's end on the centerline
  polygon(concat(
    arc([-SHORT_ARM + TIP_R, BEND_R + t - TIP_R], TIP_R, 180, 90),
    arc([0, 0], OUTER_R, 90, 90 - Bend_Angle),
    arc(e + (t - END_OUTER_R) * ARM_N - END_OUTER_R * ARM_U, END_OUTER_R, 90 - Bend_Angle, -Bend_Angle),
    arc(e - (t - END_INNER_R) * ARM_N - END_INNER_R * ARM_U, END_INNER_R, -Bend_Angle, -90 - Bend_Angle),
    arc([0, 0], INNER_R, 90 - Bend_Angle, 90),
    arc([-SHORT_ARM + TIP_R, BEND_R - t + TIP_R], TIP_R, 270, 180)
  ));
}

module slot2d() {
  hull() for (x = [NOTCH_X[0], NOTCH_X[NOTCHES - 1]]) translate([x, SLOT_Y]) circle(d = SLOT_W);
  for (x = NOTCH_X) hull() for (y = [SLOT_Y, SLOT_Y + NOTCH_RISE]) translate([x, y]) circle(d = SLOT_W);
}

module profile2d() {
  difference() {
    bar2d();
    slot2d();
  }
}

// TEXT_LINES across the gripped arm's inner face, centered on its flat, the first line nearer
// the bend. Built along X like the bar: the text runs along X, its up toward the bend.
module engravings() {
  o = -ARM_N; // out of the inner face
  s = (LONG_ARM - END_INNER_R) / 2;
  face = (BEND_R - THICKNESS / 2) * ARM_N + s * ARM_U;
  multmatrix([[1, 0, 0, Width / 2], [0, -ARM_U.x, o.x, face.x], [0, -ARM_U.y, o.y, face.y]])
    for (l = [0:len(TEXT_LINES) - 1])
      translate([0, (0.5 - l) * LINE_PITCH, -TEXT_DEPTH]) linear_extrude(TEXT_DEPTH + 1)
        text(TEXT_LINES[l], size = TEXT_SIZE, font = TEXT_FONT, halign = "center", valign = "center");
}

echo(str("Slap: sandpaper for the outer face, ", Width, " x ",
         round(SHORT_ARM + OUTER_R * Bend_Angle * PI / 180 + LONG_ARM), " mm"));

// Built along X (along_x maps the profile's (X, Y) to (Y, Z)), then stood up on its x = 0 end.
render() rotate([0, -90, 0]) difference() {
  along_x_ball_swept(END_R, Width - END_R, END_R) offset(-END_R) profile2d();
  engravings();
}
