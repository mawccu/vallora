/* VALLORA */
(function () {
  'use strict';

  /* ── scroll reveal ───────────────────────────────────── */

  var reveals = document.querySelectorAll('.reveal');

  // the data-delay attribute drives a CSS custom property so the stagger
  // stays declarative in the markup
  reveals.forEach(function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ── sticky nav ──────────────────────────────────────── */

  var nav = document.getElementById('nav');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      nav.classList.toggle('is-stuck', window.scrollY > 40);
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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
})();
