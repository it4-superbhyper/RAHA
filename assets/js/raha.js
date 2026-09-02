/* ==========================================================================
   RAHA — shared site behaviour
   Header state, mobile navigation, scroll reveal, counters, back-to-top.
   Every block is defensive: a page that omits an element simply skips it.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Sticky header shadow ---------------------------------------------- */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.fab--top');

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (toTop) toTop.classList.toggle('is-on', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---- Mobile navigation -------------------------------------------------- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('mobileNav');
  var scrim = document.getElementById('scrim');

  function setNav(open) {
    if (!burger || !mobileNav) return;
    burger.setAttribute('aria-expanded', String(open));
    mobileNav.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });
  if (mobileNav) {
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setNav(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setNav(false);
  });

  /* ---- Scroll reveal ------------------------------------------------------ */
  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealables.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ---- Animated counters -------------------------------------------------- */
  var counters = document.querySelectorAll('[data-count]');

  function format(value, target, suffix) {
    var out;
    if (target >= 1000000) out = (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    else if (target >= 1000) out = Math.round(value / 1000) + 'K';
    else out = String(Math.round(value));
    return out + suffix;
  }

  function runCounter(el) {
    var target = parseFloat(el.dataset.count) || 0;
    var suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = format(target, target, suffix); return; }

    var duration = 1800;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = format(target * eased, target, suffix);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      var countObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---- Hero slideshow ----------------------------------------------------- */
  var heroSlides = document.querySelectorAll('.hero__slide');
  var heroDots = document.querySelectorAll('.hero__dot');

  if (heroSlides.length > 1) {
    var index = 0;
    var timer = null;

    function show(next) {
      index = (next + heroSlides.length) % heroSlides.length;
      heroSlides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === index);
      });
      heroDots.forEach(function (dot, i) {
        dot.setAttribute('aria-selected', String(i === index));
      });
    }
    function play() {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(function () { show(index + 1); }, 6500);
    }
    function stop() { if (timer) window.clearInterval(timer); }

    heroDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { show(i); play(); });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else play();
    });
    play();
  }

  /* ---- Footer year -------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
