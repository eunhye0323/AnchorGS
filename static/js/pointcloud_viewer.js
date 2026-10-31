// Interactive point-cloud viewer (three.js, ES module): rotate (drag), zoom (wheel / pinch), pan (right-drag / two fingers).
// Markup:
//   <div class="pc-viewer">
//     <div class="buttons ... cmp-tabs pc-scenes"><button data-base="./static/pointclouds/replica_scan2" data-up="0,0,1" data-cut="1.0" ...>Replica scan2</button> ...</div>
//     <div class="buttons ... cmp-tabs pc-methods"><button data-cloud="g4splat" ...>G4Splat</button> ...</div>
//     <div class="pc-canvas-wrap"><canvas class="pc-canvas"></canvas><div class="pc-status"></div></div>
//     <div class="pc-controls"> <input class="pc-size" type="range"> <button class="pc-reset"> </div>
//   </div>
// Clouds are <base>_<cloud>.ply (binary PLY, xyz + rgb). The first cloud loads when the viewer scrolls into view, the others on
// their first click; within a scene all methods share one camera, so switching the method keeps the viewpoint. Switching the scene
// reframes the camera. Everything above data-cut (scene units along the up axis, fixed per scene) is clipped away, like the
// back-face culling of the orbit videos.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { attachFlyKeys } from './fly_keys.js';

const LABEL = { g4splat: 'G4Splat', retracegs: 'AnchorGS', gt: 'GT' };   // data-cloud is the file key; the label is what the page shows

function setup(box) {
  const canvas = box.querySelector('.pc-canvas'); const wrap = box.querySelector('.pc-canvas-wrap');
  const status = box.querySelector('.pc-status');
  const sceneBtns = box.querySelectorAll('.pc-scenes button'), methodBtns = box.querySelectorAll('.pc-methods button');
  const sizeIn = box.querySelector('.pc-size'), resetBtn = box.querySelector('.pc-reset');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0xffffff, 1); renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);          // keeps points with  up·p <= cut
  const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, sizeAttenuation: true, clippingPlanes: [clip] });

  // per-scene state
  let base = '', upV = new THREE.Vector3(0, 0, 1), cut = Infinity, clouds = {}, current = null, bounds = null, home = null, method = null, gen = 0;

  function resize() {
    const w = wrap.clientWidth, h = Math.round(w * 9 / 16); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function frameBounds(b) {
    const c = new THREE.Vector3(); b.getCenter(c); const diag = b.getSize(new THREE.Vector3()).length();
    const ref = Math.abs(upV.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const e1 = new THREE.Vector3().crossVectors(upV, ref).normalize(), e2 = new THREE.Vector3().crossVectors(upV, e1);
    const el = THREE.MathUtils.degToRad(55), az = THREE.MathUtils.degToRad(-45);
    const dir = e1.clone().multiplyScalar(Math.cos(el) * Math.cos(az)).add(e2.clone().multiplyScalar(Math.cos(el) * Math.sin(az))).add(upV.clone().multiplyScalar(Math.sin(el)));
    camera.position.copy(c).add(dir.multiplyScalar(0.9 * diag)); controls.target.copy(c); controls.update();
    home = { pos: camera.position.clone(), target: c.clone() };
  }
  function show(name) {
    if (current) scene.remove(current); current = clouds[name]; scene.add(current); method = name;
    methodBtns.forEach(b => { const on = b.dataset.cloud === name; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function load(name) {
    if (clouds[name]) { show(name); return; }
    const myGen = gen; status.textContent = 'Loading ' + (LABEL[name] || name) + ' …'; status.style.display = 'block';
    new PLYLoader().load(base + '_' + name + '.ply', g => {
      if (myGen !== gen) { g.dispose(); return; }                       // a scene switch happened while loading
      const pts = new THREE.Points(g, material); clouds[name] = pts; g.computeBoundingBox();
      if (!bounds) { bounds = g.boundingBox.clone(); frameBounds(bounds); }
      status.style.display = 'none'; show(name);
    }, xhr => { if (myGen === gen && xhr.total) status.textContent = 'Loading ' + (LABEL[name] || name) + ' … ' + Math.round(100 * xhr.loaded / xhr.total) + '%'; },
    () => { if (myGen === gen) status.textContent = 'Could not load ' + (LABEL[name] || name); });
  }
  function selectScene(btn, firstMethod) {
    gen += 1; if (current) scene.remove(current);
    Object.values(clouds).forEach(p => p.geometry.dispose()); clouds = {}; current = null; bounds = null; home = null;
    base = btn.dataset.base; upV = new THREE.Vector3(...(btn.dataset.up || '0,0,1').split(',').map(Number)).normalize();
    cut = btn.dataset.cut !== undefined ? Number(btn.dataset.cut) : Infinity;
    camera.up.copy(upV); clip.normal.copy(upV).negate(); clip.constant = cut;
    sceneBtns.forEach(b => { const on = b === btn; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    load(firstMethod || method || (box.querySelector('.pc-methods button.is-selected') || methodBtns[0]).dataset.cloud);
  }
  sceneBtns.forEach(b => b.addEventListener('click', () => { if (!b.classList.contains('is-selected')) selectScene(b); }));
  methodBtns.forEach(b => b.addEventListener('click', () => load(b.dataset.cloud)));
  sizeIn.addEventListener('input', () => { material.size = Number(sizeIn.value); });
  if (resetBtn) resetBtn.addEventListener('click', () => { if (home) { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); } });
  attachFlyKeys(wrap, () => ({ camera, controls, up: upV }), { speed: 1.5 });
  window.addEventListener('resize', resize); resize();
  (function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); })();
  // first scene / cloud when the viewer becomes visible
  const firstScene = box.querySelector('.pc-scenes button.is-selected') || sceneBtns[0];
  const firstMethod = (box.querySelector('.pc-methods button.is-selected') || methodBtns[0]).dataset.cloud;
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); selectScene(firstScene, firstMethod); } }, { rootMargin: '200px' });
  io.observe(box);
}
document.querySelectorAll('.pc-viewer').forEach(setup);
