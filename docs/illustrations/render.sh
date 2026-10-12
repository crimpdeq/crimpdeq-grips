#!/bin/sh
# Renders the Photon illustrations in ../src/photon/images from the model's right-hand defaults.
# Needs OpenSCAD 2025 or newer.
set -eu
cd "$(dirname "$0")"
images=../src/photon/images
stl=$(mktemp -d)
trap 'rm -r "$stl"' EXIT
python3 ../../scripts/export.py photon --hand right --in-place --out "$stl" >/dev/null

render() {
  out=$1
  shift
  openscad -q --colorscheme Tomorrow -D "stl=\"$stl/photon_right_\"" -o "$images/$out.png" "$@" photon.scad
}

mkdir -p "$images"
for part in frame ring_wall middle_wall index_wall end_wall pinky_roller ring_roller pinky_pin ring_pin post; do
  render "$part" -D "part=\"$part\"" --imgsize 400,300 --viewall --autocenter --camera 0,0,0,50,0,-30,300
done
for step in 1 2 3 4 5 6 7 8 9 10; do
  render "step-$step" -D "step=$step" --imgsize 900,600 --camera -75,60,10,50,0,-30,420
done
