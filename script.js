/* ==========================================================================
   hotohhilal.com — shared behaviour
   Loaded by every page. Each block checks that its elements exist first, so
   the same file is safe on a page that does not use that feature.
   ========================================================================== */
(function () {
  'use strict';

  /* --- Sticky bar: add a shadow once the page has scrolled ---------------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile menu -------------------------------------------------------- */
  var btn = document.querySelector('.menu-btn');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav ul a'));
  if (nav && btn) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* --- Highlight the section in view -------------------------------------
     Only links pointing at an anchor on THIS page take part. Links to another
     page (projects.html, publications.html) keep the active class the build
     step gave them.                                                          */
  var spyLinks = links.filter(function (a) {
    return (a.getAttribute('href') || '').charAt(0) === '#';
  });
  var pageLinkIsActive = links.some(function (a) {
    return a.classList.contains('active') && (a.getAttribute('href') || '').charAt(0) !== '#';
  });

  if ('IntersectionObserver' in window) {
    if (spyLinks.length && !pageLinkIsActive) {
      var sections = spyLinks
        .map(function (a) { return document.querySelector(a.getAttribute('href')); })
        .filter(Boolean);
      var current = null;
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { current = e.target.id; } });
        spyLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
      sections.forEach(function (s) { spy.observe(s); });
    }

    /* --- Reveal on scroll ------------------------------------------------- */
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(function (el) { reveal.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Publication filter -------------------------------------------------
     Buttons carry data-f, publication groups carry data-kind.                */
  var fbtns = document.querySelectorAll('.filter button');
  var groups = document.querySelectorAll('.year');
  if (fbtns.length && groups.length) {
    fbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        fbtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        groups.forEach(function (g) {
          g.classList.toggle('hidden', !(f === 'all' || g.getAttribute('data-kind') === f));
        });
      });
    });
  }

  /* --- Current year in the footer ----------------------------------------- */
  var yr = document.getElementById('yr');
  if (yr) { yr.textContent = new Date().getFullYear(); }
})();
