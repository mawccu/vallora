/* VALLORA */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── split text ──────────────────────────────────────────
     Wraps each visual line (or character) in an overflow-hidden
     mask so it can slide up from nothing. Runs before the
     observer so the hidden state is in place from the start. */

  function splitLines(el) {
    // <br> is the author's explicit line break, so split on it
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p) {
      return '<span class="line"><span class="line__inner">' + p + '</span></span>';
    }).join('');
  }

  function splitChars(el, step) {
    var text = el.textContent;
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === ' ') { out += ' '; continue; }
      out += '<span class="char" style="--d:' + (i * step) + '">' + c + '</span>';
    }
    el.innerHTML = out;
  }

  if (!reduced) {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var base = parseInt(el.getAttribute('data-delay') || '0', 10);
      if (el.getAttribute('data-split') === 'chars') {
        splitChars(el, 34);
        // shift the whole run by the element's own delay
        el.querySelectorAll('.char').forEach(function (c) {
          c.style.setProperty('--d', parseInt(c.style.getPropertyValue('--d'), 10) + base);
        });
      } else {
        splitLines(el);
        el.querySelectorAll('.line__inner').forEach(function (l, i) {
          l.style.setProperty('--d', base + i * 110);
        });
      }
    });
  }

  /* ── reveal on scroll ────────────────────────────────── */

  document.querySelectorAll('.reveal, .unmask').forEach(function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  var watched = [].slice.call(document.querySelectorAll('.reveal, .unmask, [data-split]'));

  // Anything not yet revealed. The scroll loop sweeps this by plain geometry,
  // which is immune to whatever the observer does or does not report.
  var pending = watched.slice();

  function reveal(el) {
    el.classList.add('is-in');
    var i = pending.indexOf(el);
    if (i > -1) pending.splice(i, 1);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    watched.forEach(function (el) { io.observe(el); });
  } else {
    watched.forEach(reveal);
  }

  // Safety sweep. getBoundingClientRect ignores clip-path and filters, so this
  // still fires for anything the observer misses. Never let a decorative
  // hidden state be the reason content cannot be seen.
  function sweep() {
    if (!pending.length) return;
    var edge = window.innerHeight * 0.92;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < edge) reveal(pending[i]);
    }
  }

  /* ── intro ───────────────────────────────────────────────
     Once per tab. Anything that fails here must not be able to
     leave the curtain up, hence the belt-and-braces timeout. */

  var intro = document.querySelector('.intro');

  function runIntro() {
    if (reduced || !intro || sessionStorage.getItem('vallora.seen')) return;

    sessionStorage.setItem('vallora.seen', '1');
    intro.classList.add('is-armed');
    document.body.style.overflow = 'hidden';

    var done = function () {
      intro.classList.add('is-out');
      document.body.style.overflow = '';
      setTimeout(function () { intro.classList.remove('is-armed'); }, 1100);
    };

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { intro.classList.add('is-in'); });
    });
    setTimeout(done, 1650);
  }

  try { runIntro(); } catch (e) {
    if (intro) intro.classList.remove('is-armed');
    document.body.style.overflow = '';
  }

  /* ── scroll driven: nav, progress, parallax ──────────── */

  var nav = document.getElementById('nav');
  var bar = document.querySelector('.progress span');
  var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var marqueeTrack = document.querySelector('.marquee__track');

  var lastY = window.scrollY;
  var marqueeX = 0;
  var velocity = 0;
  var ticking = false;

  function limit() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function frame() {
    ticking = false;
    var y = window.scrollY;

    nav.classList.toggle('is-stuck', y > 40);
    // hide going down, reveal going up, but never over the hero
    nav.classList.toggle('is-hidden', y > 400 && y > lastY);

    if (bar) bar.style.transform = 'scaleX(' + (y / limit()).toFixed(4) + ')';

    sweep();

    if (!reduced) {
      for (var i = 0; i < parallax.length; i++) {
        var el = parallax[i];
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        // distance of this element's centre from the viewport centre
        var offset = (rect.top + rect.height / 2) - window.innerHeight / 2;
        el.style.transform = 'translate3d(0,' + (-offset * speed).toFixed(2) + 'px,0)';
      }
    }

    velocity = y - lastY;
    lastY = y;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();

  /* marquee: constant drift, pushed along by scroll velocity */
  if (marqueeTrack && !reduced) {
    marqueeTrack.style.animation = 'none';   // taking over from the CSS drift
    var half = 0;
    var measure = function () { half = marqueeTrack.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure, { passive: true });

    (function loop() {
      marqueeX -= 0.45 + Math.min(Math.abs(velocity) * 0.09, 5) * Math.sign(velocity || 1);
      velocity *= 0.9;
      if (half > 0) {
        // keep x in (-half, 0] so the duplicated run hides the seam
        marqueeX = marqueeX % half;
        if (marqueeX > 0) marqueeX -= half;
      }
      marqueeTrack.style.transform = 'translate3d(' + marqueeX.toFixed(2) + 'px,0,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ── custom cursor ───────────────────────────────────── */

  if (fine && !reduced) {
    var cur = document.querySelector('.cursor');
    var dot = cur.querySelector('.cursor__dot');
    var ring = cur.querySelector('.cursor__ring');
    var label = cur.querySelector('.cursor__label');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    window.addEventListener('mousemove', function (e) {
      if (!cur.classList.contains('is-live')) {
        // jump the ring to the pointer so it does not fly in from centre
        rx = e.clientX; ry = e.clientY;
        cur.classList.add('is-live');
      }
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    }, { passive: true });

    (function ringLoop() {
      // ring lags the dot, which is what sells it as a physical object
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px) translate(-50%,-50%)';
      requestAnimationFrame(ringLoop);
    })();

    document.querySelectorAll('a, button, [data-cursor]').forEach(function (el) {
      var mode = el.getAttribute('data-cursor');
      el.addEventListener('mouseenter', function () {
        if (mode === 'view') { cur.classList.add('is-view'); label.textContent = 'View'; }
        else cur.classList.add('is-hover');
      });
      el.addEventListener('mouseleave', function () {
        cur.classList.remove('is-hover', 'is-view');
      });
    });
  }

  /* ── magnetic buttons ────────────────────────────────── */

  if (fine && !reduced) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.3 + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  }

  /* ── nav link roll ───────────────────────────────────── */

  document.querySelectorAll('.nav__links a span').forEach(function (s) {
    s.setAttribute('data-label', s.textContent);
    s.style.position = 'relative';
  });

  /* ── mobile menu ─────────────────────────────────────── */

  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      menu.hidden = false;
      // let the element paint before transitioning opacity
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
    } else {
      menu.classList.remove('is-open');
      var done = function () { menu.hidden = true; };
      menu.addEventListener('transitionend', done, { once: true });
      // fallback in case the transition never fires (reduced motion, hidden tab)
      setTimeout(done, 450);
    }
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  // a resize past the breakpoint leaves the overlay orphaned otherwise
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
    }
  });

  /* ── misc ────────────────────────────────────────────── */

  document.getElementById('year').textContent = new Date().getFullYear();

  // tells the head watchdog that enhancement succeeded, so it leaves `js` on
  window.__valloraReady = true;
})();
