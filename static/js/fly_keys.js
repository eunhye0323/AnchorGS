// Keyboard fly controls for the three.js viewers (point clouds and Gaussian splats).
//   W / S  forward / back      A / D  left / right      R / F  up / down (along the scene's up axis)
//   arrows  turn (left / right) and look (up / down)    Shift  3x faster
// The camera and its orbit target move together, so mouse orbit / zoom keep working around the new position.
// Keys are read only while the viewer element has focus (click it first); arrow keys do not scroll the page then.
import * as THREE from 'three';

export function attachFlyKeys(el, get, opts = {}) {
  const speed = opts.speed || 1.5;            // scene units per second
  const turn = opts.turn || 1.2;              // radians per second
  const keys = new Set(); let last = null;
  el.tabIndex = 0; el.style.outline = 'none';
  el.addEventListener('pointerdown', () => el.focus());
  el.addEventListener('keydown', e => { keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
  el.addEventListener('keyup', e => keys.delete(e.code));
  el.addEventListener('blur', () => keys.clear());
  const f = new THREE.Vector3(), r = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion();
  function step(t) {
    requestAnimationFrame(step);
    const dt = last === null ? 0 : Math.min(0.05, (t - last) / 1000); last = t;
    if (!keys.size || !dt) return;
    const { camera, controls, up } = get(); if (!camera || !controls) return;
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1;
    f.subVectors(controls.target, camera.position); const dist = f.length(); f.normalize();
    r.crossVectors(f, up).normalize(); d.set(0, 0, 0);
    if (keys.has('KeyW')) d.add(f); if (keys.has('KeyS')) d.sub(f);
    if (keys.has('KeyD')) d.add(r); if (keys.has('KeyA')) d.sub(r);
    if (keys.has('KeyR')) d.add(up); if (keys.has('KeyF')) d.sub(up);
    if (d.lengthSq() > 0) { d.normalize().multiplyScalar(speed * fast * dt); camera.position.add(d); controls.target.add(d); }
    let yaw = 0, pitch = 0;
    if (keys.has('ArrowLeft')) yaw += turn * dt; if (keys.has('ArrowRight')) yaw -= turn * dt;
    if (keys.has('ArrowUp')) pitch += turn * dt; if (keys.has('ArrowDown')) pitch -= turn * dt;
    if (yaw || pitch) {                        // first-person look: rotate the view direction about the camera position
      q.setFromAxisAngle(up, yaw); f.applyQuaternion(q);
      r.crossVectors(f, up).normalize(); q.setFromAxisAngle(r, pitch);
      const f2 = f.clone().applyQuaternion(q);
      if (Math.abs(f2.dot(up)) < 0.98) f.copy(f2);   // keep away from the poles
      controls.target.copy(camera.position).addScaledVector(f, dist);
    }
    controls.update();
  }
  requestAnimationFrame(step);
}
