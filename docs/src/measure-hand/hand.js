// Hand measurement: the points clicked on a photo -> finger lengths -> grip parameters.
// Parameter names and defaults match grips/photon.scad and grips/spark.scad.
// Photon: Height and Depth place each fingertip in the claw grip of Original/Open_Grips.pdf
// (commit f14f3e9; proximal phalanx vertical, PIP and DIP flexed 55 deg), relative to the pinky;
// the base crease offset along the middle finger stands in for the knuckle offset.
// To_Blocker = DIP-tip / tan(angle), with the angles of the OpenGrips instructions.
// Spark: the same PDF's Sisyphus grip has the proximal phalanx vertical against the roller and
// the DIP joint on the roller top; with the PIP joint at the roller axis, Height places each
// roller top D / 2 past the PIP crease, relative to the pinky, with Spark's default diameters D.

export const FINGERS = [
  { key: 'I', name: 'Index', angle: 57, color: '#e74c3c',
    photon: { Height: 23.5, Depth: 4.2, To_Blocker: 13.8 }, spark: { Height: 21, Diameter: 30 } },
  { key: 'M', name: 'Middle', angle: 60, color: '#2ecc71',
    photon: { Height: 32.1, Depth: 6.7, To_Blocker: 12.0 }, spark: { Height: 29, Diameter: 40 } },
  { key: 'R', name: 'Ring', angle: 60, color: '#3498db',
    photon: { Height: 22.0, Depth: 8.4, To_Blocker: 13.2 }, spark: { Height: 21, Diameter: 38 } },
  { key: 'P', name: 'Pinky', angle: 55, color: '#c56cf0',
    photon: { Height: 0, Depth: 0, To_Blocker: 13.9 }, spark: { Height: 0, Diameter: 22 } },
];
export const PHOTON_PARAMS = ['Height', 'Depth', 'To_Blocker'];
export const GRIP_NAMES = { photon: 'Photon', spark: 'Spark' };
// [id, short name, step label]
export const LANDMARKS = [
  ['base', 'Base', 'base crease, where it meets the palm'],
  ['pip', 'Middle joint', 'middle joint (PIP) crease'],
  ['dip', 'End joint', 'end joint (DIP) crease'],
  ['tip', 'Tip', 'tip'],
];
const RULER_COLOR = '#f1c40f';
export const RULER = { name: 'Ruler', color: RULER_COLOR, ids: ['ruler0', 'ruler1'] };
// Click order.
export const STEPS = [
  { id: 'ruler0', short: 'Mark 1', label: 'Ruler: first mark (e.g. 0)', color: RULER_COLOR },
  { id: 'ruler1', short: 'Mark 2', label: 'Ruler: second mark (e.g. 10 cm or 4 in)', color: RULER_COLOR },
  ...FINGERS.flatMap(f => LANDMARKS.map(([lm, short, text]) =>
    ({ id: `${f.key}_${lm}`, short, label: `${f.name} finger: ${text}`, color: f.color }))),
];
// Lines drawn between the points.
export const CHAINS = [RULER, ...FINGERS.map(f => ({ ids: LANDMARKS.map(([lm]) => `${f.key}_${lm}`), color: f.color }))];
// Millimetres per ruler unit, and the distance the page starts with: 0 to 10 cm or 0 to 4 in.
export const UNITS = { cm: { mm: 10, preset: '10' }, in: { mm: 25.4, preset: '4' } };

const CLAW = 55 * Math.PI / 180;
const SEGMENTS = [['basePip', 'base → middle joint'], ['pipDip', 'middle → end joint'], ['dipTip', 'end joint → tip']];
// Finger segments outside this range (mm) are not an adult hand: a wrong ruler or point.
const PLAUSIBLE_MM = [10, 70];

export const f1 = x => x.toFixed(1);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Lengths and parameters from the points of one photo, or null until all are placed.
export function measure({ ruler, points }, unit) {
  const mm = Number(ruler) * UNITS[unit].mm;
  if (!points.ruler0 || !points.ruler1 || !(mm > 0)) return null;
  const mmPerPx = mm / dist(points.ruler0, points.ruler1);
  const marks = FINGERS.map(f => LANDMARKS.map(([lm]) => points[`${f.key}_${lm}`]));
  if (marks.flat().some(p => !p)) return null;
  // Hand axis: the middle finger (anatomical long axis of the hand), base -> tip.
  const [middleBase, , , middleTip] = marks[FINGERS.findIndex(f => f.key === 'M')];
  const middleLength = dist(middleBase, middleTip);
  const axis = { x: (middleTip.x - middleBase.x) / middleLength, y: (middleTip.y - middleBase.y) / middleLength };
  const fingers = {};
  FINGERS.forEach((f, i) => {
    const [base, pip, dip, tip] = marks[i];
    fingers[f.key] = {
      basePip: dist(base, pip) * mmPerPx,
      pipDip: dist(pip, dip) * mmPerPx,
      dipTip: dist(dip, tip) * mmPerPx,
      base: (base.x * axis.x + base.y * axis.y) * mmPerPx,
    };
  });
  const reach = r => r.base + r.basePip + r.pipDip * Math.cos(CLAW) + r.dipTip * Math.cos(2 * CLAW);
  const depth = r => r.pipDip * Math.sin(CLAW) + r.dipTip * Math.sin(2 * CLAW);
  const rollerTop = f => fingers[f.key].base + fingers[f.key].basePip + f.spark.Diameter / 2;
  const pinky = fingers.P;
  const pinkyFinger = FINGERS.find(f => f.key === 'P');
  for (const r of Object.values(fingers)) r.stagger = r.base - pinky.base;
  const photon = Object.fromEntries(FINGERS.map(f => [f.key, {
    Height: reach(fingers[f.key]) - reach(pinky),
    Depth: depth(fingers[f.key]) - depth(pinky),
    To_Blocker: fingers[f.key].dipTip / Math.tan(f.angle * Math.PI / 180),
  }]));
  const spark = Object.fromEntries(FINGERS.map(f => [f.key, { Height: rollerTop(f) - rollerTop(pinkyFinger) }]));
  return { mmPerPx, fingers, photon, spark };
}

// Likely mistakes in the points so far, as messages.
export function warnings(points, m) {
  const out = [];
  // Ruler marks closer than half the middle finger: a small error in either is a large scale error.
  const { ruler0, ruler1, M_base, M_tip } = points;
  if (ruler0 && ruler1 && M_base && M_tip && dist(ruler0, ruler1) < dist(M_base, M_tip) / 2)
    out.push('The ruler marks are close together: pick two marks about as far apart as your fingers are long.');
  if (!m) return out;
  const odd = FINGERS.flatMap(f => SEGMENTS
    .filter(([key]) => m.fingers[f.key][key] < PLAUSIBLE_MM[0] || m.fingers[f.key][key] > PLAUSIBLE_MM[1])
    .map(([key, name]) => `${f.name} ${name} is ${f1(m.fingers[f.key][key])} mm`));
  if (odd.length >= 8) out.push('Most finger segments are far from usual lengths: check the ruler distance and its unit.');
  else if (odd.length) out.push(`${odd.join('; ')}: check those points.`);
  return out;
}

// Parameters passed to the model; none keeps its defaults.
export function gripParams(grip, m, fitSpark) {
  if (grip === 'photon')
    return Object.fromEntries(FINGERS.flatMap(f => PHOTON_PARAMS.map(p => [`Base_${f.key}_${p}`, f1(m.photon[f.key][p])])));
  if (!fitSpark) return {};
  return Object.fromEntries(FINGERS.map(f => [`Base_${f.key}_Height`, f1(m.spark[f.key].Height)]));
}

// The parameter file of one grip and hand, in the format of scripts/export.py; photo is the one
// measured (unused without parameters).
export function parametersText(grip, hand, params, photo, unit) {
  const lines = [`# ${GRIP_NAMES[grip]} parameters (mm) for the ${hand} hand; export the STLs again with`,
    `#   python3 scripts/export.py ${grip} parameters.txt --hand ${hand}`];
  if (!Object.keys(params).length) return [...lines, '# none: the defaults of grips/spark.scad'].join('\n');
  const m = measure(photo, unit);
  const rounded = Object.fromEntries(Object.entries(photo.points).map(([id, q]) => [id, [Math.round(q.x), Math.round(q.y)]]));
  return [
    ...lines,
    `# from ${photo.fileName}, ruler ${photo.ruler} ${unit}, ${f1(1 / m.mmPerPx)} px/mm`,
    ...FINGERS.map(f => {
      const r = m.fingers[f.key];
      return `# ${f.name}: base-PIP ${f1(r.basePip)}, PIP-DIP ${f1(r.pipDip)}, DIP-tip ${f1(r.dipTip)}, base offset ${f1(r.stagger)}`;
    }),
    `# points ${JSON.stringify(rounded)}`,
    ...Object.entries(params).map(([name, value]) => `${name} = ${value}`),
  ].join('\n');
}
