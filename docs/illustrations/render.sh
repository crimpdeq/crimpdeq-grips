#!/bin/sh
# Renders the illustrations in ../src/<grip>/images of both grips, and ../src/images/grips.png of
# both together, from the models' right-hand defaults. Needs OpenSCAD 2025 or newer and ImageMagick.
set -eu
cd "$(dirname "$0")"
stl=$(mktemp -d)
trap 'rm -r "$stl"' EXIT

render() {
  out=$1
  shift
  openscad -q --colorscheme Tomorrow -D "stl=\"$stl/${grip}_right_\"" -o "../src/$grip/images/$out.png" "$@" grip.scad
}

# grip "parts pictured" "camera of the assembly steps"
illustrate() {
  grip=$1
  python3 ../../scripts/export.py "$grip" --hand right --in-place --out "$stl" >/dev/null
  mkdir -p "../src/$grip/images"
  for part in $2; do
    render "$part" -D "part=\"$part\"" --imgsize 400,300 --viewall --autocenter --camera 0,0,0,50,0,-30,300
  done
  for step in 1 2 3 4 5 6 7 8 9 10; do
    render "step-$step" -D "step=$step" --imgsize 900,600 --camera "$3"
  done
}

walls="frame ring_wall middle_wall index_wall end_wall"
illustrate photon "$walls pinky_roller ring_roller pinky_pin ring_pin post" -75,60,10,50,0,-30,420
illustrate spark "$walls pinky_roller ring_roller middle_roller index_roller pinky_pin ring_pin middle_pin post" \
  -80,55,10,50,0,-30,440

# Each grip's name engraving (part "name") and its frame without the name, to fill the name in.
for grip in photon spark; do
  model="../../grips/$grip.scad"
  openscad -q --backend Manifold -D 'part="name"' -D 'hand="right"' -o "$stl/${grip}_right_name.stl" "$model"
  openscad -q --backend Manifold -D 'part="frame"' -D 'hand="right"' -D in_place=true -D 'NAME_TEXT=""' \
    -o "$stl/${grip}_right_unnamed_frame.stl" "$model"
done
mkdir -p ../src/images
# Orthographic: in perspective the names, off the view axis, lean like italics.
openscad -q --render --backend Manifold --colorscheme Tomorrow -D "stl=\"$stl/\"" -o ../src/images/grips.png \
  --imgsize 1200,620 --projection ortho --camera 7,64,20,15,0,0,400 grips.scad
# OpenSCAD has no transparent background: clear the Tomorrow scheme's flat one, which the grips
# never show.
magick ../src/images/grips.png -transparent "#f8f8f8" ../src/images/grips.png
