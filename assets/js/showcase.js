/* ==========================================================================
   RAHA — 3D product showcase driver

   Writes two numbers per item — `--o` (signed offset from centre) and
   `--ao` (its magnitude) — and lets CSS derive every transform from them.
   Handles arrows, dots, drag/swipe, keyboard, autoplay and pointer camera.
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('showcaseStage');
  if (!stage) return;

  var track = stage.querySelector('.sc-track');
  var items = Array.prototype.slice.call(stage.querySelectorAll('.sc-item'));
  var captions = Array.prototype.slice.call(document.querySelectorAll('.sc-caption'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.sc-dot'));
  var prev = document.getElementById('scPrev');
  var next = document.getElementById('scNext');
  if (!track || items.length < 2) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  var count = items.length;
  var active = 0;
  var VISIBLE = 3;          // how many items deep stay in frame either side
  var AUTOPLAY_MS = 4200;
  var timer = null;

  /* ---- Layout ------------------------------------------------------------- */

  // Shortest signed distance from `index` to the active item, wrapping around.
  function offsetOf(index) {
    var raw = index - active;
    if (raw > count / 2) raw -= count;
    if (raw < -count / 2) raw += count;
    return raw;
  }

  function layout() {
    items.forEach(function (item, i) {
      var o = offsetOf(i);
      var ao = Math.abs(o);

      item.style.setProperty('--o', o);
      item.style.setProperty('--ao', ao);
      item.style.zIndex = String(count - ao);
      item.classList.toggle('is-far', ao > VISIBLE);
      item.setAttribute('aria-hidden', ao === 0 ? 'false' : 'true');
    });

    captions.forEach(function (caption, i) {
      caption.classList.toggle('is-active', i === active);
    });

    dots.forEach(function (dot, i) {
      dot.setAttribute('aria-current', String(i === active));
    });
  }

  function goTo(index) {
    active = ((index % count) + count) % count;
    layout();
  }

  function step(delta) { goTo(active + delta); }

  /* ---- Autoplay ----------------------------------------------------------- */
  function play() {
    if (reduce.matches) return;
    stop();
    timer = window.setInterval(function () { step(1); }, AUTOPLAY_MS);
  }
  function stop() { if (timer) { window.clearInterval(timer); timer = null; } }

  stage.addEventListener('pointerenter', stop);
  stage.addEventListener('pointerleave', play);
  stage.addEventListener('focusin', stop);
  stage.addEventListener('focusout', play);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else play();
  });

  /* ---- Controls ----------------------------------------------------------- */
  if (prev) prev.addEventListener('click', function () { step(-1); play(); });
  if (next) next.addEventListener('click', function () { step(1); play(); });

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goTo(i); play(); });
  });

  // Clicking a side item brings it to the front. `suppressClick` stops the
  // click that fires at the end of a drag from also re-targeting an item.
  var suppressClick = false;

  items.forEach(function (item, i) {
    item.addEventListener('click', function () {
      if (suppressClick) return;
      if (i !== active) { goTo(i); play(); }
    });
  });

  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); play(); }
  });

  /* ---- Drag / swipe -------------------------------------------------------- */
  var dragging = false;
  var startX = 0;
  var moved = false;

  stage.addEventListener('pointerdown', function (e) {
    dragging = true;
    moved = false;
    startX = e.clientX;
    stage.classList.add('is-dragging');
    stop();
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 55 && !moved) {
      moved = true;
      step(dx < 0 ? 1 : -1);
    }
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (moved) {
      suppressClick = true;
      window.setTimeout(function () { suppressClick = false; }, 0);
    }
    play();
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', endDrag);

  /* ---- Pointer camera ------------------------------------------------------ */
  if (finePointer.matches && !reduce.matches) {
    var frame = null;
    var camPending = null;

    function applyCam() {
      frame = null;
      if (!camPending) return;
      stage.style.setProperty('--cam-y', camPending.y.toFixed(2) + 'deg');
      stage.style.setProperty('--cam-x', camPending.x.toFixed(2) + 'deg');
      camPending = null;
    }

    stage.addEventListener('pointermove', function (e) {
      var box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;
      var px = (e.clientX - box.left) / box.width - 0.5;
      var py = (e.clientY - box.top) / box.height - 0.5;

      camPending = { y: px * 11, x: -py * 7 };
      stage.classList.add('is-tracking');
      if (frame === null) frame = window.requestAnimationFrame(applyCam);
    });

    stage.addEventListener('pointerleave', function () {
      stage.classList.remove('is-tracking');
      stage.style.setProperty('--cam-y', '0deg');
      stage.style.setProperty('--cam-x', '0deg');
    });
  }

  /* ---- Go ------------------------------------------------------------------ */
  layout();
  play();

  if (typeof reduce.addEventListener === 'function') {
    reduce.addEventListener('change', function () {
      if (reduce.matches) stop(); else play();
    });
  }
})();
