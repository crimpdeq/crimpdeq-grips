// The measuring page: choices, photos and their points, and the download of the STLs.
import {
  FINGERS, GRIP_NAMES, LANDMARKS, PHOTON_PARAMS, RULER, STEPS, UNITS,
  f1, gripParams, measure, parametersText, warnings,
} from './hand.js';
import { photoCanvas } from './photo-canvas.js';
import { checkModel, modelArgs, renderParts } from './render.js';
import { load, save } from './saved.js';
import { zip } from './zip.js';

// The parts of scripts/export.py.
const PARTS = ['frame', 'ring_wall', 'middle_wall', 'index_wall', 'end_wall', 'pinky_roller', 'ring_roller',
  'middle_roller', 'index_roller', 'pinky_pin', 'ring_pin', 'middle_pin', 'index_pin', 'post'];

const $ = id => document.getElementById(id);

// The measurements are mirror-invariant: photos.one serves every hand unless each hand has its own.
const newPhoto = () => ({
  file: null, // the photo as chosen (a Blob), kept for saving
  fileName: '',
  img: null,
  ruler: UNITS.cm.preset, // distance between the ruler marks, in unit()
  view: null, // canvas = image * s + (x, y); null fits the photo when drawn
  points: {}, // step id -> image pixel coordinates
  active: 0, // STEPS index placed next, -1 when all are placed
  history: [], // undo records: [{ points, active }]
});
const photos = { one: newPhoto(), left: newPhoto(), right: newPhoto() };
let current = 'one';
let photo = photos.one;
let lastUnit = 'cm';
let rendering = null; // AbortController of the download being rendered
let saving = 'pending'; // 'pending' until the saved state is restored, then 'ok' or 'failed'

const unit = () => document.querySelector('[name=unit]:checked').value;
const hands = () => document.querySelector('[name=hands]:checked').value;
const grips = () => ['photon', 'spark'].filter(grip => $(grip).checked);
const fitSpark = () => grips().includes('spark') && $('sparkFit').checked;
const needsPhoto = () => grips().includes('photon') || fitSpark();
const printHands = () => hands() === 'both' ? ['left', 'right'] : [hands()];
const separatePhotos = () => hands() === 'both' && $('separate').checked;
const photoKey = hand => separatePhotos() ? hand : 'one';

const canvas = photoCanvas($('canvas'), $('loupe'), { photo: () => photo, editable: needsPhoto, changed: update });

function selectPhoto(key) {
  current = key;
  photo = photos[key];
  $('ruler').value = photo.ruler;
  $('file').value = '';
  update();
}

// blob -> its decoded image, or null once the user is told it cannot be decoded.
function decode(blob, fileName) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      alert(`Cannot decode ${fileName}; export it as JPEG or PNG.`);
      resolve(null);
    };
    img.src = URL.createObjectURL(blob);
  });
}

// photos key -> the file chosen last for it; an earlier one that finishes decoding later is dropped.
const chosen = {};

// The photo goes to the one shown when it is chosen. Chosen while the saved state is restored, it
// replaces the restored one once restoring ends.
async function loadImage(file) {
  if (!file || !needsPhoto()) return;
  const key = current;
  chosen[key] = file;
  await restored;
  const img = await decode(file, file.name);
  if (!img || chosen[key] !== file) return;
  Object.assign(photos[key], { file, fileName: file.name, img, view: null, points: {}, active: 0, history: [] });
  // With its cleared points: saved apart, a reload in between would restore the old points on it.
  if (saving === 'ok')
    save([[`photo-${key}`, { file, fileName: file.name }], ['state', pageState()]]).catch(() => { saving = 'failed'; });
  update();
}

function undo() {
  const before = photo.history.pop();
  if (!before) return;
  Object.assign(photo, before);
  // Undoing a point placed again leaves it placed: go on with the next missing one.
  if (photo.points[STEPS[photo.active]?.id]) photo.active = STEPS.findIndex(s => !photo.points[s.id]);
  update();
}

// ---------------------------------------------------------------------------------------------
// Saved state

const pageState = () => ({
  photon: $('photon').checked, spark: $('spark').checked, sparkFit: $('sparkFit').checked,
  hands: hands(), separate: $('separate').checked, unit: unit(),
  photos: Object.fromEntries(Object.entries(photos).map(([key, p]) =>
    [key, { ruler: p.ruler, points: p.points, active: p.active }])),
});

let saveTimer;
function saveState() {
  if (saving !== 'ok') return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save([['state', pageState()]]).catch(() => { saving = 'failed'; }), 200);
}

async function restore() {
  try {
    const state = await load('state');
    if (state) {
      for (const id of ['photon', 'spark', 'sparkFit', 'separate']) $(id).checked = state[id];
      document.querySelector(`[name=hands][value=${state.hands}]`).checked = true;
      document.querySelector(`[name=unit][value=${state.unit}]`).checked = true;
      lastUnit = state.unit;
      await Promise.all(Object.entries(state.photos).map(async ([key, saved]) => {
        Object.assign(photos[key], saved);
        const image = await load(`photo-${key}`);
        const img = image && await decode(image.file, image.fileName);
        if (img) Object.assign(photos[key], { file: image.file, fileName: image.fileName, img, view: null });
      }));
    }
    saving = 'ok';
  } catch {
    saving = 'failed';
  }
  selectPhoto('one');
}

// ---------------------------------------------------------------------------------------------
// Model checks: whether each grip can be made from each photo's measurements

// grip and parameters -> '' when the model accepts them, its message otherwise, undefined while checking.
const verdicts = new Map();
const verdictKey = (grip, params) => `${grip} ${JSON.stringify(params)}`;
let checkError = ''; // why a check failed (loading OpenSCAD or the models, its worker); checks wait for a reload

// [{ grip, key: photo key, params }] the download needs; defaults need no check.
function needed() {
  return grips().flatMap(grip => [...new Set(printHands().map(photoKey))].flatMap(key => {
    const m = needsPhoto() ? measure(photos[key], unit()) : null;
    if (needsPhoto() && !m) return [];
    const params = gripParams(grip, m, fitSpark());
    return Object.keys(params).length ? [{ grip, key, params }] : [];
  }));
}

// Checks what is needed once the points stop moving.
let checkTimer;
function requestChecks() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    for (const { grip, params } of needed()) {
      const key = verdictKey(grip, params);
      if (verdicts.has(key)) continue;
      verdicts.set(key, undefined);
      checkModel(grip, params).then(message => verdicts.set(key, message), e => { checkError = e.message; }).then(update);
    }
  }, 300);
}

// ---------------------------------------------------------------------------------------------
// Side panel

// Rows of point cells, each a button that makes its point the one placed next.
function buildGrid() {
  const cell = i => `<td><button data-step="${i}" aria-label="${STEPS[i].label}" title="${STEPS[i].label}"
    style="--c: ${STEPS[i].color}"></button></td>`;
  const row = (name, color, steps) =>
    `<tr><th scope="row" style="--c: ${color}">${name}</th>${steps.map(cell).join('')}</tr>`;
  $('grid').innerHTML = [
    `<colgroup><col>${LANDMARKS.map(() => '<col>').join('')}</colgroup>`,
    row(RULER.name, RULER.color, [0, 1]),
    `<tr><td></td>${LANDMARKS.map(([, short]) => `<th scope="col">${short}</th>`).join('')}</tr>`,
    ...FINGERS.map(f => row(f.name, f.color, LANDMARKS.map(([lm]) => STEPS.findIndex(s => s.id === `${f.key}_${lm}`)))),
  ].join('');
}

function resultsTable(m) {
  const row = (label, cell) => `<tr><td>${label}</td>${FINGERS.map(f => `<td>${cell(f)}</td>`).join('')}</tr>`;
  const param = (grip, p) => row(`${GRIP_NAMES[grip]} ${p} <small>(default)</small>`,
    f => `${f1(m[grip][f.key][p])} <small>(${f[grip][p]})</small>`);
  return `<table>
    <tr><th></th>${FINGERS.map(f => `<th>${f.name}</th>`).join('')}</tr>
    ${row('Base → PIP', f => f1(m.fingers[f.key].basePip))}
    ${row('PIP → DIP', f => f1(m.fingers[f.key].pipDip))}
    ${row('DIP → tip', f => f1(m.fingers[f.key].dipTip))}
    ${row('Base offset', f => f1(m.fingers[f.key].stagger))}
    ${grips().includes('photon') ? PHOTON_PARAMS.map(p => param('photon', p)).join('') : ''}
    ${fitSpark() ? param('spark', 'Height') : ''}
  </table><small>Scale ${f1(1 / m.mmPerPx)} px/mm</small>`;
}

// What stops the download, or ''.
function missing() {
  if (location.protocol === 'file:') return 'Open this page from the book (mdbook serve docs): it cannot load the models from a file.';
  if (!grips().length) return 'Choose Photon, Spark or both.';
  if (!needsPhoto()) return '';
  const which = key => key === 'one' ? 'the photo' : `the ${key} hand's photo`;
  for (const key of new Set(printHands().map(photoKey)))
    if (!measure(photos[key], unit())) return `Place every point on ${which(key)} and enter the ruler distance.`;
  for (const { grip, key, params } of needed()) {
    const verdict = verdicts.get(verdictKey(grip, params));
    if (verdict === undefined) return checkError ? `Cannot check the measurements (${checkError}): reload the page to try again.`
      : 'Checking the measurements against the model…';
    if (verdict) return `${GRIP_NAMES[grip]} cannot be made from ${which(key)}: see the warning under Points.`;
  }
  return '';
}

function setStatus(text, error = false) {
  $('status').textContent = text;
  $('status').className = error ? 'error' : '';
}

function update() {
  const separate = separatePhotos() && needsPhoto();
  if (separate !== (current !== 'one')) return selectPhoto(separate ? 'left' : 'one');
  $('sparkFitOption').hidden = !grips().includes('spark');
  $('separateOption').hidden = hands() !== 'both' || !needsPhoto();
  $('measuring').hidden = !needsPhoto();
  $('tabs').hidden = !separate;
  $('tabs').replaceChildren(...['left', 'right'].map(key => {
    const button = document.createElement('button');
    button.textContent = `${key === 'left' ? 'Left' : 'Right'} hand${measure(photos[key], unit()) ? ' ✓' : ''}`;
    button.className = key === current ? 'primary' : '';
    button.onclick = () => selectPhoto(key);
    return button;
  }));

  // Photo
  $('photoPrompt').hidden = !needsPhoto();
  $('hintText').textContent = !grips().length ? 'Choose a grip'
    : !needsPhoto() ? 'Spark with its standard roller positions needs no photo: download it'
    : `Choose, drop, or paste a photo of ${current === 'one' ? 'your hand' : 'your ' + current + ' hand'}`;
  $('hint').hidden = needsPhoto() && Boolean(photo.img);
  const step = STEPS[photo.active];
  $('banner').hidden = !needsPhoto() || !photo.img;
  $('instruction').textContent = step ? `${matchMedia('(pointer: coarse)').matches ? 'Place' : 'Click'} ${step.label}` : 'All points placed';
  $('swatch').style.background = step ? step.color : 'transparent';
  $('progress').textContent = `(${STEPS.filter(s => photo.points[s.id]).length} of ${STEPS.length})`;
  $('gestures').textContent = matchMedia('(pointer: coarse)').matches
    ? 'Touch and slide to place a point; pinch to zoom, two fingers to pan.'
    : 'Scroll to zoom, drag to pan, drag a point to move it.';
  $('undo').disabled = !photo.history.length;

  // Points
  for (const button of $('grid').querySelectorAll('button')) {
    const i = Number(button.dataset.step);
    button.className = i === photo.active ? 'active' : photo.points[STEPS[i].id] ? 'done' : '';
  }
  const m = measure(photo, unit());
  const refused = needed().filter(n => n.key === current && verdicts.get(verdictKey(n.grip, n.params)))
    .map(n => `${GRIP_NAMES[n.grip]} cannot be made from these points: ${verdicts.get(verdictKey(n.grip, n.params))}. ` +
      'Check the points and the ruler distance.');
  const notes = [...refused, ...warnings(photo.points, m)];
  $('warnings').hidden = !notes.length;
  $('warnings').replaceChildren(...notes.map(note => Object.assign(document.createElement('li'), { textContent: note })));
  $('results').innerHTML = m ? resultsTable(m) : '<small>Place every point to see the measurements.</small>';

  // Download
  const why = missing();
  $('download').hidden = Boolean(rendering);
  $('download').disabled = Boolean(why);
  $('rendering').hidden = !rendering;
  $('missing').textContent = rendering ? '' : why;

  canvas.draw();
  saveState();
  requestChecks();
}

// ---------------------------------------------------------------------------------------------
// Download

// The choices are read once: changing them while rendering affects the next download only.
async function downloadStls() {
  const selected = grips();
  const hands = printHands();
  const files = [];
  const jobs = [];
  for (const grip of selected) {
    for (const hand of hands) {
      const source = photos[photoKey(hand)];
      const params = gripParams(grip, needsPhoto() ? measure(source, unit()) : null, fitSpark());
      const dir = `crimpdeq-grips-${grip}-${hand}`;
      files.push([`${dir}/parameters.txt`, new TextEncoder().encode(parametersText(grip, hand, params, source, unit()) + '\n')]);
      for (const part of PARTS)
        jobs.push({ name: `${dir}/${grip}_${hand}_${part}.stl`, args: modelArgs(grip, params, part, hand) });
    }
  }
  rendering = new AbortController();
  $('nextSteps').hidden = true;
  $('renderProgress').max = jobs.length;
  $('renderProgress').value = 0;
  setStatus(`Rendering ${jobs.length} parts…`);
  update();
  try {
    let done = 0;
    await renderParts(jobs, () => {
      $('renderProgress').value = ++done;
      setStatus(`Rendered ${done} of ${jobs.length} parts`);
    }, rendering.signal);
    files.push(...jobs.map(job => [job.name, job.stl]));
    setStatus('Zipping…');
    const link = document.createElement('a');
    const archive = await zip(files, rendering.signal);
    rendering.signal.throwIfAborted();
    link.href = URL.createObjectURL(archive);
    link.download = `crimpdeq-grips-${[...selected, ...hands].join('-')}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    setStatus(`Downloaded ${link.download}: ${jobs.length} STLs and their parameters.`);
    $('sparkNote').hidden = !selected.includes('spark');
    $('nextSteps').hidden = false;
    $('nextSteps').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    if (e.name === 'AbortError') setStatus('Cancelled.');
    else setStatus(e.message, true);
  } finally {
    rendering = null;
    update();
  }
}

// ---------------------------------------------------------------------------------------------
// Events

buildGrid();
$('grid').onclick = e => {
  const button = e.target.closest('button[data-step]');
  if (!button) return;
  photo.active = Number(button.dataset.step);
  update();
};
$('file').onchange = e => loadImage(e.target.files[0]);
$('choosePhoto').onclick = $('changePhoto').onclick = () => $('file').click();
$('undo').onclick = undo;
$('ruler').oninput = e => { photo.ruler = e.target.value; update(); };
// Distances still at the old unit's preset move to the new unit's; typed ones are kept.
document.querySelectorAll('[name=unit]').forEach(input => {
  input.onchange = () => {
    for (const p of Object.values(photos)) if (p.ruler === UNITS[lastUnit].preset) p.ruler = UNITS[unit()].preset;
    lastUnit = unit();
    selectPhoto(current);
  };
});
document.querySelectorAll('#photon, #spark, #sparkFit, [name=hands], #separate').forEach(input => { input.onchange = update; });
$('download').onclick = downloadStls;
$('cancel').onclick = () => rendering?.abort();
$('gripsHelp').onclick = () => {
  const open = $('gripsInfo').hidden;
  $('gripsInfo').hidden = !open;
  $('gripsHelp').setAttribute('aria-expanded', open);
};
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea') || !photo.img || !needsPhoto()) return;
  if (e.key === 'Backspace' || ((e.metaKey || e.ctrlKey) && e.key === 'z')) {
    e.preventDefault();
    undo();
  }
});
// Leaving loses a download being rendered, and the points when they could not be saved.
addEventListener('beforeunload', e => {
  const unsaved = saving === 'failed' && Object.values(photos).some(p => Object.keys(p.points).length);
  if (rendering || unsaved) e.preventDefault();
});
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); loadImage(e.dataTransfer.files[0]); });
addEventListener('paste', e => loadImage(e.clipboardData.files[0]));
addEventListener('resize', () => canvas.draw());
update();
const restored = restore();
