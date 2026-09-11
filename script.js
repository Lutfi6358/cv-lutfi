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

/* ==========================================================================
   hotohhilal.com — depth, motion and interactive pieces
   A second, self-contained pass. Every block checks for its own elements and
   for the visitor's motion preference before it does anything, so this file
   stays safe on a page that has none of the markup below.
   ========================================================================== */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Size a canvas to its CSS box in device pixels and return the 2d context
     already scaled, so all drawing below can work in CSS pixels. */
  function fit(cv, ratio) {
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    var d = ratio || dpr;
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    var ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* --- Reading progress ---------------------------------------------------
     Built here rather than in the markup so every page gets it for free.    */
  (function progress() {
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('i');
    bar.appendChild(fill);
    document.body.appendChild(bar);

    var ticking = false;
    function paint() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      fill.style.width = (pct * 100).toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener('resize', paint, { passive: true });
    paint();
  }());

  /* --- Starfields ---------------------------------------------------------
     One canvas per sky band, all driven by a single animation loop. A band
     that has scrolled out of view is skipped, and a visitor who has asked for
     reduced motion gets a single still frame.                               */
  (function starfields() {
    var hosts = document.querySelectorAll('.band, .skynow');
    if (!hosts.length) { return; }
    var fields = [];

    hosts.forEach(function (host) {
      var cv = document.createElement('canvas');
      cv.className = 'starfield';
      cv.setAttribute('aria-hidden', 'true');
      var shade = host.querySelector(':scope > .band-shade');
      if (shade && shade.nextSibling) { host.insertBefore(cv, shade.nextSibling); }
      else if (shade) { host.appendChild(cv); }
      else { host.insertBefore(cv, host.firstChild); }

      var field = {
        cv: cv,
        host: host,
        meteors: host.classList.contains('hero') || host.classList.contains('skynow'),
        visible: true,
        stars: [],
        shots: [],
        next: 2000 + Math.random() * 4000
      };
      fields.push(field);
      size(field);
    });

    function size(f) {
      var s = fit(f.cv, Math.min(dpr, 1.75));
      f.ctx = s.ctx; f.w = s.w; f.h = s.h;
      // Roughly one star per 5,500 square pixels, capped so a tall band on a
      // large display does not turn into a particle benchmark.
      var n = clamp(Math.round((s.w * s.h) / 5500), 30, 190);
      f.stars = [];
      for (var i = 0; i < n; i++) {
        f.stars.push({
          x: Math.random() * s.w,
          y: Math.random() * s.h,
          r: Math.random() < 0.08 ? 1.5 + Math.random() * 1.1 : 0.4 + Math.random() * 0.8,
          base: 0.18 + Math.random() * 0.5,
          amp: 0.12 + Math.random() * 0.4,
          sp: 0.4 + Math.random() * 1.5,
          ph: Math.random() * TAU,
          warm: Math.random() < 0.18
        });
      }
    }

    function paint(f, t) {
      var ctx = f.ctx;
      if (!ctx) { return; }
      ctx.clearRect(0, 0, f.w, f.h);

      for (var i = 0; i < f.stars.length; i++) {
        var s = f.stars[i];
        var a = reduced ? s.base + s.amp * 0.5
                        : s.base + s.amp * (0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph));
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.fillStyle = s.warm ? '#FFE9C4' : '#EAF1FF';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
        if (s.r > 1.4) {                      // a cross flare on the brightest few
          ctx.globalAlpha = clamp(a * 0.35, 0, 1);
          ctx.fillRect(s.x - s.r * 3.4, s.y - 0.4, s.r * 6.8, 0.8);
          ctx.fillRect(s.x - 0.4, s.y - s.r * 3.4, 0.8, s.r * 6.8);
        }
      }
      ctx.globalAlpha = 1;

      for (var j = f.shots.length - 1; j >= 0; j--) {
        var m = f.shots[j];
        m.p += m.v;
        if (m.p > 1.25) { f.shots.splice(j, 1); continue; }
        var head = clamp(m.p, 0, 1);
        var tail = clamp(m.p - 0.16, 0, 1);
        var g = ctx.createLinearGradient(
          m.x + m.dx * tail, m.y + m.dy * tail,
          m.x + m.dx * head, m.y + m.dy * head);
        g.addColorStop(0, 'rgba(198,214,255,0)');
        g.addColorStop(1, 'rgba(232,240,255,' + (0.85 * (1 - Math.abs(m.p - 0.5) * 1.4)).toFixed(3) + ')');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x + m.dx * tail, m.y + m.dy * tail);
        ctx.lineTo(m.x + m.dx * head, m.y + m.dy * head);
        ctx.stroke();
      }
    }

    function shoot(f) {
      var len = f.w * (0.22 + Math.random() * 0.2);
      var ang = 0.35 + Math.random() * 0.25;         // shallow, falling to the right
      f.shots.push({
        x: Math.random() * f.w * 0.7,
        y: Math.random() * f.h * 0.45,
        dx: Math.cos(ang) * len,
        dy: Math.sin(ang) * len,
        p: 0,
        v: 0.018 + Math.random() * 0.014
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          fields.forEach(function (f) { if (f.host === e.target) { f.visible = e.isIntersecting; } });
        });
      }, { rootMargin: '120px' });
      hosts.forEach(function (h) { io.observe(h); });
    }

    var last = 0;
    function loop(t) {
      fields.forEach(function (f) {
        if (!f.visible) { return; }
        if (f.meteors && !reduced) {
          f.next -= (t - last);
          if (f.next <= 0) { shoot(f); f.next = 5000 + Math.random() * 9000; }
        }
        paint(f, t);
      });
      last = t;
      requestAnimationFrame(loop);
    }

    if (reduced) {
      fields.forEach(function (f) { paint(f, 0); });
    } else {
      requestAnimationFrame(function (t) { last = t; loop(t); });
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        fields.forEach(function (f) { size(f); paint(f, performance.now()); });
      }, 180);
    }, { passive: true });
  }());

  /* --- Parallax on the sky bands ------------------------------------------
     The drawn scene drifts a little slower than the page. The image is held
     at scale(1.14) in CSS so the edges never come into view.                */
  (function parallax() {
    if (reduced) { return; }
    var bgs = Array.prototype.slice.call(document.querySelectorAll('.band-bg'));
    if (!bgs.length) { return; }
    var ticking = false;
    function paint() {
      var vh = window.innerHeight;
      bgs.forEach(function (bg) {
        var host = bg.parentElement;
        var r = host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) { return; }
        // -1 when the band sits below the fold, +1 when it has passed above it
        var p = clamp((vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2), -1, 1);
        bg.style.transform = 'translate3d(0,' + (p * 2.6).toFixed(2) + '%,0) scale(1.07)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener('resize', paint, { passive: true });
    paint();
  }());

  /* --- Counting numbers ---------------------------------------------------
     Any whole number in a stat block counts up the first time it is seen.   */
  (function counters() {
    var cells = document.querySelectorAll('.stat b, .award-summary div b');
    if (!cells.length || !('IntersectionObserver' in window)) { return; }

    function run(el) {
      if (reduced) { return; }
      var original = el.textContent.trim();
      // Counts only. A figure that is not a bare number, or that is large
      // enough to be a year, is left exactly as the page author wrote it:
      // watching "First publication" tick up through 1658 is both wrong and
      // silly, and these numbers are a research record before they are motion.
      if (!/^\d+$/.test(original)) { return; }
      var target = parseInt(original, 10);
      if (!target || target >= 1000) { return; }

      var t0 = null;
      var dur = 900 + Math.min(target, 40) * 12;
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.style.display = 'inline-block';
      function step(t) {
        if (t0 === null) { t0 = t; }
        var k = clamp((t - t0) / dur, 0, 1);
        if (k >= 1) { el.textContent = original; return; }   // always land on the real value
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        requestAnimationFrame(step);
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    cells.forEach(function (c) { io.observe(c); });
  }());

  /* --- Cursor spotlight on cards ------------------------------------------ */
  (function spotlight() {
    if (reduced || !window.matchMedia || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) { return; }
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card) { return; }
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    }, { passive: true });
  }());

  /* ========================================================================
     The moon tonight
     Phase is taken from the mean synodic month measured against a known new
     moon. That is accurate to within a few hours, which is the right level of
     precision for a page banner: the real decision still belongs to the
     observation and to the isbat committee.
     ======================================================================== */
  (function moonTonight() {
    var cv = document.getElementById('moon-now');
    if (!cv) { return; }

    var SYNODIC = 29.530588853;                       // days
    var EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0) / 86400000;   // a known new moon
    var TILT = -0.42;                                 // schematic tilt of the horns

    function phaseAt(date) {
      var cycles = (date.getTime() / 86400000 - EPOCH) / SYNODIC;
      var frac = cycles - Math.floor(cycles);
      var next = new Date((Math.floor(cycles) + 1) * SYNODIC * 86400000 + EPOCH * 86400000);
      return {
        frac: frac,
        age: frac * SYNODIC,
        illum: (1 - Math.cos(TAU * frac)) / 2,
        next: next
      };
    }

    function name(f) {
      if (f < 0.02 || f > 0.98) { return 'New moon'; }
      if (f < 0.23) { return 'Waxing crescent'; }
      if (f < 0.27) { return 'First quarter'; }
      if (f < 0.48) { return 'Waxing gibbous'; }
      if (f < 0.52) { return 'Full moon'; }
      if (f < 0.73) { return 'Waning gibbous'; }
      if (f < 0.77) { return 'Last quarter'; }
      return 'Waning crescent';
    }

    /* The lit region is the right half of the disc closed by the terminator,
       an ellipse whose width is R·cos(phase angle). A positive width curves
       the terminator towards the bright limb and gives a crescent; a negative
       one curves it away and gives a gibbous moon. A waning moon is the same
       figure mirrored. */
    function litPath(ctx, R, frac) {
      var a = R * Math.cos(TAU * frac);
      ctx.beginPath();
      ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(0, 0, Math.abs(a), R, 0, Math.PI / 2, -Math.PI / 2, a > 0);
      ctx.closePath();
    }

    var CRATERS = [[-.30, -.34, .17], [.16, -.20, .12], [-.06, .30, .21],
                   [.34, .30, .10], [.40, -.46, .08], [-.44, .12, .09]];

    function draw(frac) {
      var s = fit(cv);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      // Held well inside the canvas box so the halo fades out before it can
      // reach an edge and print a visible square.
      var R = Math.min(w, h) * 0.30;

      ctx.save();
      ctx.translate(w / 2, h / 2);

      var glow = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.6);
      glow.addColorStop(0, 'rgba(176,198,255,.26)');
      glow.addColorStop(0.4, 'rgba(150,175,255,.09)');
      glow.addColorStop(1, 'rgba(150,175,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, TAU); ctx.fill();

      ctx.rotate(TILT);
      if (frac > 0.5) { ctx.scale(-1, 1); }

      // Earthshine: the unlit disc is not black, it is lit by the earth
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
      var dark = ctx.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R);
      dark.addColorStop(0, '#1E2749');
      dark.addColorStop(1, '#141B33');
      ctx.fillStyle = dark; ctx.fill();
      ctx.strokeStyle = 'rgba(150,175,255,.22)';
      ctx.lineWidth = 1; ctx.stroke();

      ctx.save();
      litPath(ctx, R, frac);
      ctx.clip();
      var lit = ctx.createLinearGradient(-R, -R, R, R);
      lit.addColorStop(0, '#EFF2FB');
      lit.addColorStop(0.5, '#FDFCF6');
      lit.addColorStop(1, '#DCE2F0');
      ctx.fillStyle = lit;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.fillStyle = 'rgba(120,132,166,.20)';
      CRATERS.forEach(function (c) {
        ctx.beginPath();
        ctx.arc(c[0] * R, c[1] * R, c[2] * R, 0, TAU);
        ctx.fill();
      });
      ctx.restore();

      // The bright limb. Close to conjunction the lit region is thinner than a
      // pixel and fills to nothing, which reads as a drawing bug rather than as
      // a crescent, so the limb itself is always stroked at a legible width.
      var lw = Math.max(1.8, R * 0.022);
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R - lw / 2, -Math.PI / 2, Math.PI / 2, false);
      ctx.strokeStyle = 'rgba(253,252,246,.92)';
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(214,228,255,.85)';
      ctx.shadowBlur = R * 0.3;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    function fmt(d) {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
    function set(id, html) {
      var el = document.getElementById(id);
      if (el) { el.innerHTML = html; }
    }

    function update() {
      var p = phaseAt(new Date());
      draw(p.frac);
      set('moon-age', p.age.toFixed(1) + ' <small>days</small>');
      set('moon-illum', (p.illum * 100).toFixed(1) + ' <small>%</small>');
      set('moon-phase', name(p.frac));
      var hrs = (p.next - Date.now()) / 3600000;
      set('moon-next', fmt(p.next));
      set('moon-next-label', 'Next new moon &middot; in ' +
        (hrs < 48 ? Math.round(hrs) + 'h' : Math.round(hrs / 24) + 'd'));
    }

    update();
    setInterval(update, 60000);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(update, 180);
    }, { passive: true });
  }());

  /* ========================================================================
     Detection demo
     The left of the frame is a synthetic twilight exposure with a crescent
     barely above the sky background. The right is the same pixels after a
     contrast-limited local stretch, which is what makes the crescent
     recoverable, followed by a Circular Hough Transform sketch that finds the
     lunar disc from its edge alone.
     ======================================================================== */
  (function lab() {
    var stage = document.querySelector('.lab-stage');
    if (!stage) { return; }
    var cvRaw = stage.querySelector('.lab-raw');
    var cvPro = stage.querySelector('.lab-proc');
    var line = stage.querySelector('.lab-line');
    var range = stage.querySelector('.lab-range');
    var runBtn = document.querySelector('[data-lab-run]');
    var readout = document.querySelector('[data-lab-readout]');
    if (!cvRaw || !cvPro || !range) { return; }

    var LD = 1;                  // the demo renders at 1x; the stretch is per-pixel work
    var geo, procData, edges = [], anim = null, detectT = -1;

    /* -- scene ----------------------------------------------------------- */
    function crescentPath(ctx, g) {
      var a = g.R * Math.cos(TAU * g.frac);
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.rotate(g.rot);
      ctx.beginPath();
      ctx.arc(0, 0, g.R, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(0, 0, Math.abs(a), g.R, 0, Math.PI / 2, -Math.PI / 2, a > 0);
      ctx.closePath();
      ctx.restore();
    }

    function drawRaw(ctx, w, h, g) {
      var sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#080E22');
      sky.addColorStop(0.55, '#141E3C');
      sky.addColorStop(1, '#2B3252');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // the sun went down towards the left: a wide, low afterglow
      var ag = ctx.createRadialGradient(w * 0.34, h * 1.02, 0, w * 0.34, h * 1.02, h * 1.15);
      ag.addColorStop(0, 'rgba(255,166,96,.36)');
      ag.addColorStop(0.4, 'rgba(214,124,92,.13)');
      ag.addColorStop(1, 'rgba(255,166,96,0)');
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, w, h);

      // a handful of stars, most of them lost in the twilight
      for (var i = 0; i < 26; i++) {
        var sx = Math.random() * w, sy = Math.random() * h * 0.75;
        ctx.globalAlpha = 0.05 + Math.random() * 0.14;
        ctx.fillStyle = '#DCE6FF';
        ctx.beginPath(); ctx.arc(sx, sy, 0.5 + Math.random() * 0.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // the crescent, only just above the sky it sits in
      ctx.save();
      ctx.filter = 'blur(' + (g.R * 0.055).toFixed(2) + 'px)';
      ctx.fillStyle = 'rgba(228,236,255,0.17)';
      crescentPath(ctx, g);
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();

      // horizon
      var hy = h * 0.87;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, hy + h * 0.03);
      ctx.bezierCurveTo(w * 0.28, hy - h * 0.035, w * 0.52, hy + h * 0.045, w, hy - h * 0.01);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = '#04070F';
      ctx.fill();

      // sensor grain
      var img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      var d = img.data;
      for (var p = 0; p < d.length; p += 4) {
        var n = (Math.random() - 0.5) * 11;
        d[p] = clamp(d[p] + n, 0, 255);
        d[p + 1] = clamp(d[p + 1] + n, 0, 255);
        d[p + 2] = clamp(d[p + 2] + n, 0, 255);
      }
      ctx.putImageData(img, 0, 0);
      return img;
    }

    /* -- contrast-limited local stretch ------------------------------------
       An 8 by 6 grid of tiles. Each tile gets its own black and white point
       from a luminance histogram, with a floor on the gap between them so a
       flat patch of sky is not stretched into pure noise. Pixel values are
       remapped against the four nearest tile centres, blended by distance,
       which is what keeps tile edges from showing.                          */
    function stretch(src, W, H) {
      var TX = 8, TY = 6, BINS = 64;
      var tw = W / TX, th = H / TY;
      var lo = new Float32Array(TX * TY), hi = new Float32Array(TX * TY);
      var d = src.data;
      var lum = new Float32Array(W * H);
      var i, x, y;

      for (i = 0, y = 0; y < H; y++) {
        for (x = 0; x < W; x++, i++) {
          var o = i * 4;
          lum[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
        }
      }

      for (var ty = 0; ty < TY; ty++) {
        for (var tx = 0; tx < TX; tx++) {
          var hist = new Uint32Array(BINS), count = 0;
          var x0 = Math.floor(tx * tw), x1 = Math.floor((tx + 1) * tw);
          var y0 = Math.floor(ty * th), y1 = Math.floor((ty + 1) * th);
          for (y = y0; y < y1; y++) {
            for (x = x0; x < x1; x++) {
              hist[Math.min(BINS - 1, (lum[y * W + x] * BINS / 256) | 0)]++;
              count++;
            }
          }
          var loT = count * 0.10, hiT = count * 0.995, acc = 0, l = 0, hgh = BINS - 1, gotLo = false;
          for (var b = 0; b < BINS; b++) {
            acc += hist[b];
            if (!gotLo && acc >= loT) { l = b; gotLo = true; }
            if (acc >= hiT) { hgh = b; break; }
          }
          var k = ty * TX + tx;
          lo[k] = l * 256 / BINS;
          // The clip limit. Without a floor on the gap, a tile holding nothing
          // but flat sky stretches its own sensor noise to full contrast.
          hi[k] = Math.max((hgh + 1) * 256 / BINS, lo[k] + 34);
        }
      }

      var out = new ImageData(W, H);
      var od = out.data;
      for (y = 0; y < H; y++) {
        var fy = clamp(y / th - 0.5, 0, TY - 1.001);
        var iy = fy | 0, wy = fy - iy;
        for (x = 0; x < W; x++) {
          var fx = clamp(x / tw - 0.5, 0, TX - 1.001);
          var ix = fx | 0, wx = fx - ix;
          var i00 = iy * TX + ix, i10 = i00 + 1, i01 = i00 + TX, i11 = i01 + 1;
          var L = lo[i00] * (1 - wx) * (1 - wy) + lo[i10] * wx * (1 - wy) +
                  lo[i01] * (1 - wx) * wy + lo[i11] * wx * wy;
          var Hh = hi[i00] * (1 - wx) * (1 - wy) + hi[i10] * wx * (1 - wy) +
                   hi[i01] * (1 - wx) * wy + hi[i11] * wx * wy;

          var k2 = y * W + x, o2 = k2 * 4;
          var v = lum[k2];
          var t = clamp((v - L) / Math.max(1, Hh - L), 0, 1);
          t = Math.pow(t, 0.88);
          var target = t * 255;
          var gain = v > 2 ? target / v : target / 2;
          gain = 0.22 + 0.78 * gain;                    // hold on to some of the original
          od[o2]     = clamp(d[o2] * gain, 0, 255);
          od[o2 + 1] = clamp(d[o2 + 1] * gain * 1.01, 0, 255);
          od[o2 + 2] = clamp(d[o2 + 2] * gain * 1.05, 0, 255);
          od[o2 + 3] = 255;
        }
      }
      return out;
    }

    /* -- detection overlay -------------------------------------------------- */
    function buildEdges(g) {
      var pts = [];
      for (var i = 0; i < 110; i++) {
        var a = (i / 110) * TAU;
        var jitter = (Math.random() - 0.5) * g.R * 0.1;
        // the bright limb is well defined; the terminator side is guesswork
        var lit = Math.cos(a - g.rot) > -0.15;
        if (!lit && Math.random() > 0.35) { continue; }
        pts.push({
          x: g.cx + Math.cos(a) * (g.R + jitter),
          y: g.cy + Math.sin(a) * (g.R + jitter),
          d: Math.random()
        });
      }
      return pts;
    }

    function overlay(ctx, g, t) {
      if (t < 0) { return; }
      var A = clamp(t / 700, 0, 1);                 // edge pixels appear
      var B = clamp((t - 600) / 700, 0, 1);         // the circle is voted in
      var C = clamp((t - 1250) / 550, 0, 1);        // the box is drawn

      ctx.save();
      for (var i = 0; i < edges.length; i++) {
        var p = edges[i];
        if (p.d > A) { continue; }
        ctx.globalAlpha = 0.85 * (1 - B * 0.55);
        ctx.fillStyle = '#7FE3B0';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (B > 0) {
        ctx.strokeStyle = 'rgba(138,164,255,' + (0.35 + 0.5 * B).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -t * 0.03;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, g.R * (0.55 + 0.45 * (1 - Math.pow(1 - B, 3))), 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (C > 0) {
        var pad = g.R * 0.4;
        var x = g.cx - g.R - pad, y = g.cy - g.R - pad;
        var s = (g.R + pad) * 2;
        ctx.globalAlpha = C;
        ctx.strokeStyle = '#7FE3B0';
        ctx.lineWidth = 2;
        var arm = s * 0.28;
        [[x, y, 1, 1], [x + s, y, -1, 1], [x, y + s, 1, -1], [x + s, y + s, -1, -1]].forEach(function (c) {
          ctx.beginPath();
          ctx.moveTo(c[0] + arm * c[2], c[1]);
          ctx.lineTo(c[0], c[1]);
          ctx.lineTo(c[0], c[1] + arm * c[3]);
          ctx.stroke();
        });
        ctx.globalAlpha = C * 0.35;
        ctx.strokeStyle = '#7FE3B0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, s, s);

        ctx.globalAlpha = C;
        var label = 'hilal  0.94';
        ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        var tw2 = ctx.measureText(label).width + 14;
        // Above the box where there is room, inside it where there is not, so
        // the tag in the corner of a narrow frame is never sitting on top of it
        var ly = y - 20 < 30 ? y + 2 : y - 20;
        ctx.fillStyle = 'rgba(18,32,28,.86)';
        ctx.fillRect(x, ly, tw2, 18);
        ctx.fillStyle = '#7FE3B0';
        ctx.fillText(label, x + 7, ly + 13);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    /* -- wiring ------------------------------------------------------------ */
    function paintProc() {
      var ctx = cvPro.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(procData, 0, 0);
      ctx.setTransform(LD, 0, 0, LD, 0, 0);
      overlay(ctx, geo, detectT);
    }

    function build() {
      var r = stage.getBoundingClientRect();
      var w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
      [cvRaw, cvPro].forEach(function (c) { c.width = w * LD; c.height = h * LD; });

      geo = { cx: w * 0.635, cy: h * 0.35, R: Math.max(16, h * 0.145), rot: -0.45, frac: 0.105 };
      edges = buildEdges(geo);

      var ctx = cvRaw.getContext('2d');
      ctx.setTransform(LD, 0, 0, LD, 0, 0);
      var raw = drawRaw(ctx, w, h, geo);
      procData = stretch(raw, cvRaw.width, cvRaw.height);
      paintProc();
    }

    function wipe(v) {
      cvPro.style.clipPath = 'inset(0 0 0 ' + v + '%)';
      line.style.left = v + '%';
      if (readout) {
        readout.textContent = v < 3 ? 'enhanced 100%'
          : v > 97 ? 'raw frame 100%'
          : 'raw ' + Math.round(v) + '% · enhanced ' + Math.round(100 - v) + '%';
      }
    }

    range.addEventListener('input', function () { wipe(+range.value); });
    wipe(+range.value);

    if (runBtn) {
      runBtn.addEventListener('click', function () {
        if (anim) { cancelAnimationFrame(anim); }
        if (+range.value > 60) { range.value = 38; wipe(38); }
        if (reduced) { detectT = 2000; paintProc(); return; }
        var t0 = null;
        (function step(t) {
          if (t0 === null) { t0 = t; }
          detectT = t - t0;
          paintProc();
          if (detectT < 1900) { anim = requestAnimationFrame(step); } else { anim = null; }
        })(performance.now());
      });
    }

    build();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(build, 220);
    }, { passive: true });
  }());
})();

/* ==========================================================================
   hotohhilal.com — pointer effects
   A droplet cursor over the sky sections, and a bio whose words move out of
   the pointer's way. Both need a real pointer and a visitor who has not asked
   for reduced motion; otherwise this whole block does nothing and the page
   keeps its native cursor and its static text.
   ========================================================================== */
(function () {
  'use strict';

  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || calm) { return; }

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ========================================================================
     Droplet cursor
     Zones are the sky sections. Anything clickable inside one keeps the
     ordinary arrow, because a bead of water is a poor affordance for a link.
     ======================================================================== */
  (function droplet() {
    var ZONES = '.hero, .skynow, .band';
    var KEEP_ARROW = 'a, button, input, textarea, select, label, .card, .lab, .tbl-wrap, .feature';
    if (!document.querySelector(ZONES)) { return; }

    var cv = document.createElement('canvas');
    cv.className = 'droplet';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size, { passive: true });

    var mx = -999, my = -999;          // where the pointer actually is
    var px = -999, py = -999;          // where the bead is, always a little behind
    var vx = 0, vy = 0;
    var active = false, running = false;
    var ripples = [], trail = [], travelled = 0;

    function zoneAt(el) {
      return !!(el && el.closest && el.closest(ZONES) && !el.closest(KEEP_ARROW));
    }

    function setActive(on) {
      if (on === active) { return; }
      active = on;
      if (on) { px = mx; py = my; start(); }   // no long swoop in from the last spot
    }

    document.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      setActive(zoneAt(e.target));
    }, { passive: true });

    document.addEventListener('pointerdown', function () {
      if (active) { ripples.push({ x: mx, y: my, t: 0, max: 150, w: 2.4 }); }
    }, { passive: true });

    document.addEventListener('pointerleave', function () { setActive(false); }, { passive: true });

    /* Scrolling moves the page under a pointer that has not itself moved, so
       no pointermove fires and the zone the bead thinks it is in goes stale.
       Re-test what is actually under the pointer instead. */
    window.addEventListener('scroll', function () {
      if (mx < 0) { return; }
      setActive(zoneAt(document.elementFromPoint(mx, my)));
    }, { passive: true });

    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

    function frame() {
      ctx.clearRect(0, 0, W, H);

      if (active) {
        // The bead chases the pointer. The gap between the two is what gives
        // it weight, and the velocity is what stretches it. It follows closely
        // now that the real cursor is on top: a long lag read as a lost cursor.
        var nx = px + (mx - px) * 0.3;
        var ny = py + (my - py) * 0.3;
        vx = nx - px; vy = ny - py;
        px = nx; py = ny;

        travelled += Math.hypot(vx, vy);
        if (travelled > 38) {                  // a ring every so often, not every frame
          travelled = 0;
          ripples.push({ x: px, y: py, t: 0, max: 78 + Math.random() * 46, w: 1.5 });
        }
        trail.push({ x: px, y: py });
        if (trail.length > 9) { trail.shift(); }
      } else if (trail.length) {
        trail.shift();
      }

      // Ripples first, so the bead always sits on top of its own wake
      for (var i = ripples.length - 1; i >= 0; i--) {
        var r = ripples[i];
        r.t += 0.022;
        if (r.t >= 1) { ripples.splice(i, 1); continue; }
        var k = 1 - Math.pow(1 - r.t, 3);      // fast out, slow settle
        ctx.beginPath();
        ctx.arc(r.x, r.y, k * r.max, 0, TAU);
        ctx.strokeStyle = 'rgba(175,194,255,' + (0.42 * (1 - r.t) * (1 - r.t)).toFixed(3) + ')';
        ctx.lineWidth = r.w * (1 - r.t);
        ctx.stroke();
      }

      // The tail the bead drags behind it
      for (var j = 0; j < trail.length; j++) {
        var a = (j + 1) / trail.length;
        var g0 = ctx.createRadialGradient(trail[j].x, trail[j].y, 0, trail[j].x, trail[j].y, 13 * a);
        g0.addColorStop(0, 'rgba(186,205,255,' + (0.13 * a * a).toFixed(3) + ')');
        g0.addColorStop(1, 'rgba(186,205,255,0)');
        ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(trail[j].x, trail[j].y, 13 * a, 0, TAU); ctx.fill();
      }

      if (active || trail.length) {
        var speed = Math.hypot(vx, vy);
        var s = clamp(speed / 26, 0, 1);
        var R = 14;

        ctx.save();
        ctx.translate(px, py);
        if (speed > 0.4) { ctx.rotate(Math.atan2(vy, vx)); }
        ctx.scale(1 + s * 0.6, 1 - s * 0.32);   // stretched along the direction of travel

        // A halo first, so the bead still reads where it crosses the bright
        // part of the sky scene or a headline
        var halo = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 2.4);
        halo.addColorStop(0, 'rgba(150,180,255,.20)');
        halo.addColorStop(1, 'rgba(150,180,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, TAU); ctx.fill();

        // Slightly softer than a solid bead, so the arrow sitting on top of it
        // stays the thing you read as the cursor.
        var body = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
        body.addColorStop(0, 'rgba(255,255,255,.58)');
        body.addColorStop(0.45, 'rgba(184,206,255,.30)');
        body.addColorStop(1, 'rgba(150,178,255,.09)');
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();

        ctx.strokeStyle = 'rgba(240,246,255,.70)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, R - 0.7, 0, TAU); ctx.stroke();

        // the glint that makes it read as a bead rather than a dot
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.34, -R * 0.38, R * 0.2, R * 0.13, -0.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      if (active || ripples.length || trail.length) { requestAnimationFrame(frame); }
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }
  }());

  /* ========================================================================
     Scattering words
     Every word of the bio is wrapped once, measured once, and then pushed
     away from the pointer in proportion to how close it is. Measurements are
     taken in document coordinates so scrolling does not invalidate them.
     ======================================================================== */
  (function scatter() {
    var host = document.querySelector('.focus-read');
    if (!host) { return; }

    var RADIUS = 185;      // how far the pointer's influence reaches
    var PUSH = 40;         // furthest a word is moved, in pixels
    var GROW = 0.45;       // extra scale at the centre of the effect
    var TILT = 7;          // degrees

    /* Wrap words. A glossary term is wrapped whole: splitting it would leave
       its dotted underline behind while the word walked away from it. */
    function wrap(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (n) {
        if (n.nodeType === 1) {
          if (n.classList.contains('gl')) { n.classList.add('w'); }
          else { wrap(n); }
          return;
        }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) { return; }
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (piece) {
          if (!piece) { return; }
          if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(piece)); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.textContent = piece;
          frag.appendChild(s);
        });
        node.replaceChild(frag, n);
      });
    }
    wrap(host);

    var words = Array.prototype.slice.call(host.querySelectorAll('.w'));
    if (!words.length) { return; }

    // Glossary terms are the one thing in the paragraph a reader has to aim
    // at, so they never move. Cached here rather than asking classList on
    // every word on every frame.
    var isTerm = words.map(function (w) { return w.classList.contains('gl'); });

    var boxes = [], measured = false, holding = false;

    /* Positions are taken with every word at rest, in page coordinates. */
    function measure() {
      words.forEach(function (w) { w.style.transform = ''; });
      boxes = words.map(function (w) {
        var r = w.getBoundingClientRect();
        return {
          x: r.left + window.scrollX + r.width / 2,
          y: r.top + window.scrollY + r.height / 2,
          tx: 0, ty: 0, lit: false
        };
      });
      measured = true;
    }

    var queued = false, cursor = null;

    function apply() {
      queued = false;
      if (!cursor || holding) { return; }
      host.classList.add('scattering');
      var cx = cursor.x, cy = cursor.y;

      for (var i = 0; i < words.length; i++) {
        var b = boxes[i];
        var dx = b.x - cx, dy = b.y - cy;
        var d = Math.hypot(dx, dy);
        var tx = 0, ty = 0, sc = 1, rot = 0, lit = false;

        if (d < RADIUS && !isTerm[i]) {
          var f = 1 - d / RADIUS;
          f *= f;                                  // concentrate the effect near the tip
          var k = d < 0.001 ? 0 : PUSH * f / d;
          tx = dx * k; ty = dy * k;
          sc = 1 + GROW * f;
          rot = (dx < 0 ? -1 : 1) * TILT * f;
          lit = f > 0.06;
        }

        // Only touch the DOM when the value has actually moved
        if (Math.abs(tx - b.tx) > 0.3 || Math.abs(ty - b.ty) > 0.3 || (lit !== b.lit)) {
          b.tx = tx; b.ty = ty;
          words[i].style.transform = tx || ty
            ? 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' +
              sc.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)'
            : '';
          if (lit !== b.lit) { b.lit = lit; words[i].classList.toggle('lit', lit); }
        }
      }
    }

    host.addEventListener('pointerenter', function () { if (!measured) { measure(); } });

    host.addEventListener('pointermove', function (e) {
      if (!measured) { measure(); }
      cursor = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });

    function rest() {
      host.classList.remove('scattering');
      words.forEach(function (w, i) {
        w.style.transform = '';
        w.classList.remove('lit');
        if (boxes[i]) { boxes[i].tx = 0; boxes[i].ty = 0; boxes[i].lit = false; }
      });
    }

    host.addEventListener('pointerleave', function () {
      cursor = null;
      rest();
    }, { passive: true });

    /* Reading a definition and scattering the paragraph are two different
       jobs. The moment a glossary term is hovered or focused, every word
       settles back into place so the panel opens over clean text. */
    Array.prototype.forEach.call(host.querySelectorAll('.gl'), function (term) {
      function hold() { holding = true; rest(); }
      function release() { holding = false; }
      term.addEventListener('pointerenter', hold);
      term.addEventListener('pointerleave', release);
      term.addEventListener('focus', hold);
      term.addEventListener('blur', release);
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (measured) { measure(); } }, 200);
    }, { passive: true });

    // Web fonts land after first paint and shift every word along their line
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (measured) { measure(); } });
    }
  }());
})();
