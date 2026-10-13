// Renders one part per message ({ module: compiled openscad.wasm, sources: [[path, bytes]], args })
// with the WebAssembly OpenSCAD (../openscad, from scripts/fetch_openscad_wasm.py) and answers
// { stl } or { error }. Each part gets a fresh instance: OpenSCAD's main runs once per instance.
import OpenSCAD from '../openscad/openscad.js';

onmessage = async ({ data: { module, sources, args } }) => {
  const log = [];
  try {
    const openscad = await OpenSCAD({
      noInitialRun: true,
      print: line => log.push(line),
      printErr: line => log.push(line),
      instantiateWasm: (imports, receive) => {
        WebAssembly.instantiate(module, imports).then(instance => receive(instance, module));
        return {};
      },
    });
    openscad.FS.mkdir('/grips');
    openscad.FS.mkdir('/grips/fonts');
    for (const [path, bytes] of sources) openscad.FS.writeFile('/grips/' + path, bytes);
    const code = openscad.callMain([...args, '--backend=manifold', '--export-format=binstl', '-o', '/out.stl']);
    const errors = log.filter(line => /^(ERROR|WARNING)/.test(line));
    if (code || errors.length) throw new Error((errors.length ? errors : log.slice(-5)).join('\n'));
    const stl = openscad.FS.readFile('/out.stl');
    postMessage({ stl }, [stl.buffer]);
  } catch (e) {
    postMessage({ error: String(e?.message ?? e) });
  }
};
