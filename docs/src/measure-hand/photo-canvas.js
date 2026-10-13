// The photo with its points: drawing, zoom and pan, placing and moving points.
// Mouse: click places the current point, drag pans or moves a point, the wheel zooms.
// Touch: touch and slide places the current point or moves one, two fingers pinch and pan.
// A magnifier (loupe) shows the photo under the point while it is placed or moved.
import { CHAINS, STEPS, dist } from './hand.js';

const LOUPE_ZOOM = 3; // relative to the photo on screen
const HIT_PX = { mouse: 8, touch: 24 };

// Undo record of a photo's points.
const snapshot = p => ({ points: { ...p.points }, active: p.active });
const nextActive = p => STEPS.findIndex(s => !p.points[s.id]);
const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// photo(): the photo shown ({ img, view, points, active, history }; a null view fits the photo);
// editable(): whether the photo is in use; changed(): called after the points change.
export function photoCanvas(canvas, loupe, { photo, editable, changed }) {
  const ctx = canvas.getContext('2d');
  const loupeCtx = loupe.getContext('2d');
  const pointers = new Map(); // pointerId -> canvas position
  let gesture = null;

  const toScreen = q => { const v = photo().view; return { x: q.x * v.s + v.x, y: q.y * v.s + v.y }; };
  const toImage = q => { const v = photo().view; return { x: (q.x - v.x) / v.s, y: (q.y - v.y) / v.s }; };
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function fit(p) {
    const s = Math.min(canvas.clientWidth / p.img.width, canvas.clientHeight / p.img.height);
    p.view = { s, x: (canvas.clientWidth - p.img.width * s) / 2, y: (canvas.clientHeight - p.img.height * s) / 2 };
  }

  function draw() {
    const dpr = devicePixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const p = photo();
    if (!p.img || !editable()) return;
    if (!p.view) fit(p);
    const { img, view } = p;
    const points = gesture?.kind === 'place' ? { ...p.points, [STEPS[p.active].id]: toImage(gesture.at) } : p.points;
    ctx.drawImage(img, view.x, view.y, img.width * view.s, img.height * view.s);
    ctx.lineWidth = 1.5;
    for (const { ids, color } of CHAINS) {
      const ps = ids.map(id => points[id]).filter(Boolean).map(toScreen);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ps.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      ctx.stroke();
    }
    // Hollow markers keep the clicked crease visible.
    for (const step of STEPS) {
      if (!points[step.id]) continue;
      const { x, y } = toScreen(points[step.id]);
      ctx.strokeStyle = step.color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = step.color;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // The photo around screen point `at`, magnified, in the corner away from it.
  function showLoupe(at, color) {
    const p = photo();
    loupe.hidden = false;
    const size = loupe.clientWidth;
    const dpr = devicePixelRatio;
    loupe.width = loupe.height = size * dpr;
    loupeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = toImage(at);
    const half = size / 2 / (p.view.s * LOUPE_ZOOM);
    loupeCtx.fillStyle = '#101a26';
    loupeCtx.fillRect(0, 0, size, size);
    loupeCtx.drawImage(p.img, c.x - half, c.y - half, 2 * half, 2 * half, 0, 0, size, size);
    loupeCtx.strokeStyle = color;
    loupeCtx.lineWidth = 1.5;
    loupeCtx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      loupeCtx.moveTo(size / 2 + dx * 6, size / 2 + dy * 6);
      loupeCtx.lineTo(size / 2 + dx * 20, size / 2 + dy * 20);
    }
    loupeCtx.stroke();
    const nearCorner = at.x < size + 40 && at.y < size + 40;
    loupe.style.left = nearCorner ? 'auto' : '12px';
    loupe.style.right = nearCorner ? '12px' : 'auto';
  }

  // The current point placed at screen point `at`.
  function place(p, at) {
    const before = snapshot(p);
    p.points[STEPS[p.active].id] = toImage(at);
    p.active = nextActive(p);
    p.history.push(before);
  }

  // Drops a point gesture when a second finger starts a pinch.
  function cancel(p) {
    if (gesture?.kind === 'point' && gesture.moved) Object.assign(p, gesture.before);
    gesture = null;
    loupe.hidden = true;
  }

  canvas.addEventListener('pointerdown', e => {
    const p = photo();
    if (!p.img || !editable()) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, canvasPos(e));
    if (pointers.size === 2) {
      cancel(p);
      const [a, b] = pointers.values();
      gesture = { kind: 'pinch', view: { ...p.view }, center: middle(a, b), span: dist(a, b) };
      return draw();
    }
    if (pointers.size > 2 || gesture) return;
    const at = canvasPos(e);
    const touch = e.pointerType !== 'mouse';
    const hit = STEPS.filter(s => p.points[s.id])
      .map(s => ({ id: s.id, d: dist(toScreen(p.points[s.id]), at) }))
      .filter(h => h.d < HIT_PX[touch ? 'touch' : 'mouse'])
      .sort((a, b) => a.d - b.d)[0];
    if (hit) gesture = { kind: 'point', id: hit.id, before: snapshot(p), at, moved: false };
    else if (touch && p.active >= 0) {
      gesture = { kind: 'place', at };
      showLoupe(at, STEPS[p.active].color);
      draw();
    } else gesture = { kind: 'pan', at, view: { ...p.view }, moved: false };
  });

  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    const at = canvasPos(e);
    pointers.set(e.pointerId, at);
    const p = photo();
    if (gesture.kind === 'pinch') {
      if (pointers.size < 2) return;
      // The photo point under the starting center follows the fingers' center.
      const [a, b] = pointers.values();
      const c = middle(a, b);
      const k = dist(a, b) / gesture.span;
      const { view, center } = gesture;
      p.view = { s: view.s * k, x: c.x - (center.x - view.x) * k, y: c.y - (center.y - view.y) * k };
      return draw();
    }
    if (gesture.kind === 'place') {
      gesture.at = at;
      showLoupe(at, STEPS[p.active].color);
      return draw();
    }
    gesture.moved ||= dist(at, gesture.at) > 3;
    if (!gesture.moved) return;
    if (gesture.kind === 'point') {
      p.points[gesture.id] = toImage(at);
      showLoupe(at, STEPS.find(s => s.id === gesture.id).color);
      changed();
    } else {
      p.view = { ...gesture.view, x: gesture.view.x + at.x - gesture.at.x, y: gesture.view.y + at.y - gesture.at.y };
      draw();
    }
  });

  function end(e) {
    if (!pointers.delete(e.pointerId) || !gesture) return;
    const p = photo();
    if (gesture.kind === 'pinch') {
      if (!pointers.size) gesture = null;
      return;
    }
    const done = e.type === 'pointerup';
    if (gesture.kind === 'point' && gesture.moved) {
      if (done) p.history.push(gesture.before);
      else Object.assign(p, gesture.before);
    } else if (done && !gesture.moved && p.active >= 0) place(p, gesture.kind === 'place' ? gesture.at : canvasPos(e));
    gesture = null;
    loupe.hidden = true;
    changed();
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  canvas.addEventListener('wheel', e => {
    const p = photo();
    if (!p.img || !editable()) return;
    e.preventDefault();
    const at = canvasPos(e);
    const k = Math.exp(-e.deltaY * 0.002);
    const { view } = p;
    p.view = { s: view.s * k, x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k };
    draw();
  }, { passive: false });

  return { draw };
}
