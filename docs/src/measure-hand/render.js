// Renders parts with OpenSCAD in workers (worker.js), and checks parameters against the models.

// The models and their font: docs/src/grips links to the repository's grips/.
const SOURCES = ['photon.scad', 'spark.scad', 'common.scad', 'fonts/Inter-Bold.ttf'];
// A frame needs about 400 MB, so at most this many render at once.
const WORKERS = 3;
const newWorker = () => new Worker(new URL('worker.js', import.meta.url), { type: 'module' });

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

// The compiled openscad.wasm and the model sources, fetched once.
let assets = null;
function loadAssets() {
  const base = new URL('../', import.meta.url);
  assets ??= Promise.all([
    fetchBytes(new URL('openscad/openscad.wasm', base)).then(bytes => WebAssembly.compile(bytes)),
    Promise.all(SOURCES.map(async path => [path, await fetchBytes(new URL(`grips/${path}`, base))])),
  ]).catch(e => { assets = null; throw e; });
  return assets;
}

// OpenSCAD's arguments for one part of a model.
export const modelArgs = (grip, params, part, hand) =>
  [`/grips/${grip}.scad`, ...Object.entries(params).map(([name, value]) => `-D${name}=${value}`),
    `-Dpart="${part}"`, `-Dhand="${hand}"`];

function runJob(worker, job, module, sources) {
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => data.error ? reject(new Error(`${job.name}:\n${data.error}`)) : resolve(data.stl);
    worker.onerror = e => reject(new Error(`${job.name}: ${e.message || 'the OpenSCAD worker failed to start'}`));
    worker.postMessage({ module, sources, args: job.args });
  });
}

// jobs: [{ name, args }]. Sets job.stl on every job and calls onDone(job) after each; rejects
// with signal's reason when it aborts.
export async function renderParts(jobs, onDone, signal) {
  const [module, sources] = await loadAssets();
  signal.throwIfAborted();
  const workers = Array.from({ length: Math.min(WORKERS, navigator.hardwareConcurrency || 1, jobs.length) }, newWorker);
  const aborted = new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  let next = 0;
  try {
    await Promise.race([aborted, Promise.all(workers.map(async worker => {
      while (next < jobs.length && !signal.aborted) {
        const job = jobs[next++];
        job.stl = await runJob(worker, job, module, sources);
        onDone(job);
      }
    }))]);
  } finally {
    workers.forEach(worker => worker.terminate());
  }
}

// The models' assertions run for any part, so rendering the post (a fraction of a second) checks
// the parameters. Checks run one at a time in their own worker.
let checker = null;
let checks = Promise.resolve();

// '' when the model accepts params, else its assertion message. Rejects when the check itself
// fails (loading, the worker, OpenSCAD); the next check starts a new worker.
export function checkModel(grip, params) {
  const run = async () => {
    const [module, sources] = await loadAssets();
    checker ??= newWorker();
    try {
      await runJob(checker, { name: grip, args: modelArgs(grip, params, 'post', 'left') }, module, sources);
      return '';
    } catch (e) {
      const assertion = e.message.match(/Assertion .* failed: "(.*)"/);
      if (assertion) return assertion[1];
      checker.terminate();
      checker = null;
      throw e;
    }
  };
  checks = checks.then(run, run);
  return checks;
}
