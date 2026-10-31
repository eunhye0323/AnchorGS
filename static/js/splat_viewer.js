// Interactive Gaussian-splat viewer (GaussianSplats3D on three.js). The trained 2DGS models are shown as flat 3D Gaussians
// (.splat files made by launch/261031/splat_web_01/convert_2dgs_splat.py: third scale 0.1 mm along the surfel normal, SH degree 0).
// Markup:
//   <div class="gs-viewer">
//     <div class="buttons ... cmp-tabs gs-scenes"><button data-base="./static/splats/replica_scan2" data-up="x,y,z" data-pos="x,y,z" data-look="x,y,z" data-size="67 / 62 MB">Replica scan2</button></div>
//     <div class="buttons ... cmp-tabs gs-methods"><button data-cloud="g4splat">G4Splat</button> <button data-cloud="retracegs">ReTraceGS</button></div>
//     <div class="gs-canvas-wrap">
//       <div class="gs-root"></div>
//       <div class="gs-overlay"><div class="gs-title"></div><button class="gs-load">Load</button><div class="gs-progress-text"></div></div>
//     </div>
//   </div>
// Nothing is downloaded until Load is pressed (60-95 MB per model); while loading the overlay shows "Loading ..." and the
// percentage from the loader's onProgress callback (text only, no bar; the library's built-in loading UI is off). Switching the scene or the method disposes the viewer and
// loads the new file; the camera starts inside the room at the real cameras' mean position.
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';
import { attachFlyKeys } from './fly_keys.js';

const LABEL = { g4splat: 'G4Splat', retracegs: 'AnchorGS', gt: 'GT' };   // data-cloud is the file key; the label is what the page shows

function setup(box) {
  const root = box.querySelector('.gs-root'), wrap = box.querySelector('.gs-canvas-wrap');
  const overlay = box.querySelector('.gs-overlay'), title = box.querySelector('.gs-title'), loadBtn = box.querySelector('.gs-load'), ptext = box.querySelector('.gs-progress-text');
  const sceneBtns = box.querySelectorAll('.gs-scenes button'), methodBtns = box.querySelectorAll('.gs-methods button');
  let viewer = null, started = false, loading = false, scene = box.querySelector('.gs-scenes button.is-selected') || sceneBtns[0];
  let method = (box.querySelector('.gs-methods button.is-selected') || methodBtns[0]).dataset.cloud;
  const vec = s => s.split(',').map(Number);
  attachFlyKeys(wrap, () => (viewer && viewer.camera && viewer.controls ? { camera: viewer.camera, controls: viewer.controls, up: new THREE.Vector3(...vec(scene.dataset.up || '0,0,1')).normalize() } : {}), { speed: 1.5 });

  function sizeOf() { const sz = (scene.dataset.size || '').split('/').map(x => x.trim().replace(/\s*MB$/, '')); return sz.length === 2 ? sz[method === 'g4splat' ? 0 : 1] + ' MB' : ''; }
  function mark(btns, pick) { btns.forEach(b => { const on = pick(b); b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function idle() {            // overlay before the first load, or after a failed one
    overlay.hidden = false; loadBtn.hidden = false; ptext.hidden = true;
    title.textContent = scene.textContent + ' — ' + (LABEL[method] || method);
    loadBtn.textContent = 'Load ' + sizeOf();
  }
  // status = the library's LoaderStatus (not exported by the build): 0 Downloading, 1 Processing, 2 Done
  function progress(pct, label, status) {
    const processing = status === 1 || status === 2 || /process|done/i.test(String(status));
    // the processing phase reports 0 % then 100 % only, so it gets no number
    ptext.textContent = processing ? 'Preparing splats …' : 'Downloading · ' + Math.round(Math.max(0, Math.min(100, pct || 0))) + '%';
  }
  async function show() {
    if (loading) return; loading = true;
    if (viewer) { try { await viewer.dispose(); } catch (e) {} viewer = null; root.innerHTML = ''; }
    overlay.hidden = false; loadBtn.hidden = true; ptext.hidden = false; progress(0, '0%', 0);
    title.textContent = 'Loading ' + (LABEL[method] || method) + ' …';
    viewer = new GaussianSplats3D.Viewer({
      rootElement: root, cameraUp: vec(scene.dataset.up || '0,0,1'), initialCameraPosition: vec(scene.dataset.pos), initialCameraLookAt: vec(scene.dataset.look),
      sharedMemoryForWorkers: false, gpuAcceleratedSort: false, selfDrivenMode: true, useBuiltInControls: true, logLevel: GaussianSplats3D.LogLevel.None,
    });
    const path = scene.dataset.base + '_' + method + '.splat';
    try {
      await viewer.addSplatScene(path, { showLoadingUI: false, progressiveLoad: false, splatAlphaRemovalThreshold: 5, format: GaussianSplats3D.SceneFormat.Splat, onProgress: progress });
      viewer.start(); overlay.hidden = true;
    } catch (e) { idle(); loadBtn.textContent = 'Could not load ' + (LABEL[method] || method) + ' — retry'; }
    loading = false;
  }
  loadBtn.addEventListener('click', () => { started = true; show(); });
  sceneBtns.forEach(b => b.addEventListener('click', () => { if (b === scene || loading) return; scene = b; mark(sceneBtns, x => x === b); if (started) show(); else idle(); }));
  methodBtns.forEach(b => b.addEventListener('click', () => { if (b.dataset.cloud === method || loading) return; method = b.dataset.cloud; mark(methodBtns, x => x.dataset.cloud === method); if (started) show(); else idle(); }));
  idle();
}
document.querySelectorAll('.gs-viewer').forEach(setup);
