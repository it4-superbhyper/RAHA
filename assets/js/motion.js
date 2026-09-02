/* ==========================================================================
   RAHA — motion driver
   Pointer-tracked 3D tilt, magnetic buttons, hero parallax, scroll progress.

   Everything degrades to the static styles in raha.css: this file only ever
   ADDS the `.tilt` / `[data-magnetic]` hooks, and it adds nothing at all when
   the visitor prefers reduced motion or is on a touch device.
   ========================================================================== */
(function () {
  'use strict';

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  function wantsMotion() { return !motionQuery.matches; }
  function hasFinePointer() { return pointerQuery.matches; }

  /* ---- Scroll progress ---------------------------------------------------- */
  (function scrollProgress() {
    if (!wantsMotion()) return;

    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.setProperty('--progress', ratio.toFixed(4));
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* ---- Hero parallax ------------------------------------------------------ */
  (function heroParallax() {
    var slides = document.querySelector('.hero__slides');
    var hero = document.querySelector('.hero');
    if (!slides || !hero || !wantsMotion()) return;

    var ticking = false;
    function update() {
      var height = hero.offsetHeight;
      // Only worth computing while the hero is still on screen.
      var shift = Math.min(window.scrollY, height) * 0.28;
      slides.style.setProperty('--hero-shift', shift.toFixed(1) + 'px');
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    update();
  })();

  /* ---- 3D tilt ------------------------------------------------------------ */
  (function tilt() {
    if (!wantsMotion() || !hasFinePointer()) return;

    var TILTABLE = '.p-card, .cat-tile, .card--raise, .quote-card, .split__media';
    var targets = Array.prototype.slice.call(document.querySelectorAll(TILTABLE));
    if (!targets.length) return;

    var max = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--tilt-max')
    ) || 7;

    targets.forEach(function (el) { el.classList.add('tilt'); });

    var frame = null;
    var pending = null;

    function apply() {
      frame = null;
      if (!pending) return;
      var el = pending.el;
      el.style.setProperty('--rx', pending.rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', pending.ry.toFixed(2) + 'deg');
      el.style.setProperty('--mx', pending.mx.toFixed(1) + '%');
      el.style.setProperty('--my', pending.my.toFixed(1) + '%');
      pending = null;
    }

    function onMove(e) {
      var el = e.currentTarget;
      var box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;

      var px = (e.clientX - box.left) / box.width;   // 0 → 1 across
      var py = (e.clientY - box.top) / box.height;   // 0 → 1 down

      pending = {
        el: el,
        ry: (px - 0.5) * 2 * max,        // horizontal position spins around Y
        rx: (0.5 - py) * 2 * max,        // vertical position spins around X
        mx: px * 100,
        my: py * 100
      };

      if (frame === null) frame = window.requestAnimationFrame(apply);
    }

    function onEnter(e) { e.currentTarget.classList.add('is-tracking'); }

    function onLeave(e) {
      var el = e.currentTarget;
      el.classList.remove('is-tracking');
      if (pending && pending.el === el) pending = null;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }

    targets.forEach(function (el) {
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  })();

  /* ---- Magnetic buttons --------------------------------------------------- */
  (function magnetic() {
    if (!wantsMotion() || !hasFinePointer()) return;

    var MAGNETIC = '.hero__cta .btn, .cta-band__btns .btn, .fab-btn';
    var targets = Array.prototype.slice.call(document.querySelectorAll(MAGNETIC));
    if (!targets.length) return;

    var PULL = 0.28;   // fraction of the cursor's offset the button travels
    var CLAMP = 12;    // px

    targets.forEach(function (el) { el.setAttribute('data-magnetic', ''); });

    function clamp(value) { return Math.max(-CLAMP, Math.min(CLAMP, value)); }

    function onMove(e) {
      var el = e.currentTarget;
      var box = el.getBoundingClientRect();
      var dx = clamp((e.clientX - (box.left + box.width / 2)) * PULL);
      var dy = clamp((e.clientY - (box.top + box.height / 2)) * PULL);
      el.style.setProperty('--mag-x', dx.toFixed(1) + 'px');
      el.style.setProperty('--mag-y', dy.toFixed(1) + 'px');
    }

    function onEnter(e) { e.currentTarget.classList.add('is-tracking'); }

    function onLeave(e) {
      var el = e.currentTarget;
      el.classList.remove('is-tracking');
      el.style.setProperty('--mag-x', '0px');
      el.style.setProperty('--mag-y', '0px');
    }

    targets.forEach(function (el) {
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  })();
})();
