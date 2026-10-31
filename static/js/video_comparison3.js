// Three-way video wipe slider with two draggable handles (layout after the HAD project page's
// three-image detection slider). Expects an MP4 whose three equal-width panels are methods A | B | C
// (the three clips concatenated horizontally, so the three layers are always frame-synced):
//   <div class="video-compare3">
//     <video class="video" loop muted playsinline preload="none"><source src="..."></video>
//     <canvas class="videoMerge3"></canvas>
//     <span class="cmp3-label cmp3-label--left">A</span> ... --middle ... --right
//     <button type="button" class="cmp3-handle" data-handle="left" aria-label="..."></button>
//     <button type="button" class="cmp3-handle" data-handle="right" aria-label="..."></button>
//   </div>
// Left of the left handle shows A, between the handles B, right of the right handle C.

(function () {
  var MIN_GAP = 0.04;

  function setup(box) {
    var video = box.querySelector('video');
    var canvas = box.querySelector('.videoMerge3');
    var handles = { left: box.querySelector('[data-handle="left"]'), right: box.querySelector('[data-handle="right"]') };
    var mid = box.querySelector('.cmp3-label--middle');
    var cut = { left: 1 / 3, right: 2 / 3 };
    var active = null, started = false;

    function setCuts(l, r) {
      cut.left = Math.max(0, Math.min(l, r - MIN_GAP));
      cut.right = Math.min(1, Math.max(r, cut.left + MIN_GAP));
      box.style.setProperty('--cut-left', (cut.left * 100) + '%');
      box.style.setProperty('--cut-right', (cut.right * 100) + '%');
      if (mid) mid.hidden = cut.right - cut.left < 0.12;
    }

    function xFrac(e) {
      var rect = canvas.getBoundingClientRect();
      return rect.width ? (e.clientX - rect.left) / rect.width : 0;
    }

    function move(which, x) {
      if (which === 'left') setCuts(x, cut.right); else setCuts(cut.left, x);
    }

    ['left', 'right'].forEach(function (k) {
      handles[k].addEventListener('pointerdown', function (e) {
        active = k; e.preventDefault();
        if (box.setPointerCapture) box.setPointerCapture(e.pointerId);
      });
      handles[k].addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowLeft' ? -0.02 : e.key === 'ArrowRight' ? 0.02 : 0;
        if (d) { e.preventDefault(); move(k, cut[k] + d); }
      });
    });
    // a press anywhere on the video grabs the nearer handle
    canvas.addEventListener('pointerdown', function (e) {
      var x = xFrac(e);
      active = Math.abs(x - cut.left) <= Math.abs(x - cut.right) ? 'left' : 'right';
      move(active, x);
      if (box.setPointerCapture) box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function (e) { if (active) { e.preventDefault(); move(active, xFrac(e)); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      box.addEventListener(t, function () { active = null; });
    });

    function draw() {
      var ctx = canvas.getContext('2d');
      function step() {
        var w = video.videoWidth / 3, h = video.videoHeight;
        if (w && h) {
          var a = Math.round(w * cut.left), b = Math.round(w * cut.right);
          if (a > 0) ctx.drawImage(video, 0, 0, a, h, 0, 0, a, h);
          if (b > a) ctx.drawImage(video, w + a, 0, b - a, h, a, 0, b - a, h);
          if (w > b) ctx.drawImage(video, 2 * w + b, 0, w - b, h, b, 0, w - b, h);
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function start() {
      if (started || !video.videoWidth) return;
      started = true;
      canvas.width = video.videoWidth / 3;
      canvas.height = video.videoHeight;
      draw();
    }
    video.addEventListener('loadeddata', start);
    video.addEventListener('play', start);
    setCuts(cut.left, cut.right);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var boxes = document.querySelectorAll('.video-compare3');
    boxes.forEach(setup);
    // decode only the clips on screen
    var vids = Array.prototype.map.call(boxes, function (b) { return b.querySelector('video'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target.querySelector('video');
          if (e.isIntersecting) v.play().catch(function () {}); else v.pause();
        });
      }, { threshold: 0.25 });
      boxes.forEach(function (b) { io.observe(b); });
    } else {
      vids.forEach(function (v) { v.play().catch(function () {}); });
    }
  });
})();
