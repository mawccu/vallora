/* VALLORA
   ------------------------------------------------------------------
   One script for every page. Each block guards on the elements it
   needs, so the landing, the shop, a product page and the lookbook all
   load the same file and only run what applies.

   Everything here is an enhancement. The page is readable, navigable
   and orderable with this file blocked: the head watchdog strips the
   `js` class, which turns every hidden-until-revealed state back off,
   shows the native <details> under each product card and hides the
   loader. Nothing below may become the only way to reach content. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return [].slice.call((ctx || doc).querySelectorAll(sel)); };

  var CFG = window.VALLORA_CONFIG || {};
  var SB = CFG.supabase || {};
  var sbReady = !!(SB.url && SB.anonKey);

  /* ── the order number ─────────────────────────────────────
     config.js is the single place the real number is written.
     The wa.me/000000000000 in the markup is the no-script
     fallback, and it is what gets rewritten here. */

  function waNumber() {
    return (CFG.whatsapp || '').replace(/[^\d]/g, '');
  }

  function applyWhatsApp() {
    var num = waNumber();
    if (!num) return;
    $$('a[href*="wa.me/"]').forEach(function (a) {
      a.href = a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + num);
    });
  }

  applyWhatsApp();

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
    $$('[data-split]').forEach(function (el) {
      var base = parseInt(el.getAttribute('data-delay') || '0', 10);
      if (el.getAttribute('data-split') === 'chars') {
        splitChars(el, 34);
        // shift the whole run by the element's own delay
        $$('.char', el).forEach(function (c) {
          c.style.setProperty('--d', parseInt(c.style.getPropertyValue('--d'), 10) + base);
        });
      } else {
        splitLines(el);
        $$('.line__inner', el).forEach(function (l, i) {
          l.style.setProperty('--d', base + i * 110);
        });
      }
    });
  }

  /* ── manifesto: one word per span ─────────────────────────
     Built here rather than in the markup so the copy stays
     editable as a plain sentence, and so a dead script leaves
     ordinary paragraph text behind. */

  var words = [];
  var manifesto = $('[data-words]');

  if (manifesto && !reduced) {
    var src = manifesto.textContent.trim().split(/\s+/);
    manifesto.innerHTML = src.map(function (w) {
      return '<span class="w">' + w + '</span>';
    }).join(' ');
    words = $$('.w', manifesto);
  }

  /* ── reveal on scroll ────────────────────────────────── */

  $$('.reveal, .unmask').forEach(function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  var watched = $$('.reveal, .unmask, [data-split]');

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

  /* ── loader (landing only) ────────────────────────────────
     The percentage is real: it counts campaign frames that have
     actually decoded. Two independent timeouts lift the curtain
     no matter what the counter says, because a curtain that can
     stick is a blank site. */

  var loader = $('#loader');
  var loaderPct = $('#loaderPct');
  var loaderBar = $('#loaderBar');
  var heroMask = $('.hero__mask');
  var lifted = false;

  function openHero() {
    if (heroMask) heroMask.classList.add('is-open');
  }

  function lift() {
    if (lifted) return;
    lifted = true;
    doc.body.style.overflow = '';

    if (!loader) { openHero(); return; }

    loader.classList.add('is-out');
    openHero();
    setTimeout(function () { loader.classList.add('is-done'); }, 1200);
  }

  if (reduced || !loader) {
    openHero();
  } else {
    doc.body.style.overflow = 'hidden';

    var imgs = $$('img').filter(function (im) { return im.loading !== 'lazy'; });
    if (!imgs.length) imgs = $$('img');

    var total = Math.max(1, imgs.length);
    var done = 0;
    var shown = 0;

    var tick = function () {
      done++;
      if (done >= total) setTimeout(lift, 420);
    };

    imgs.forEach(function (im) {
      if (im.complete) { tick(); return; }
      im.addEventListener('load', tick, { once: true });
      im.addEventListener('error', tick, { once: true });
    });

    // the readout eases toward the real figure instead of stepping, so a fast
    // cache hit still reads as a count rather than a flash
    (function count() {
      var target = (done / total) * 100;
      shown += (target - shown) * 0.12;
      if (target - shown < 0.6) shown = target;

      var n = Math.min(100, Math.round(shown));
      if (loaderPct) loaderPct.textContent = n < 10 ? '00' + n : n < 100 ? '0' + n : '100';
      if (loaderBar) loaderBar.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')';

      if (!lifted) requestAnimationFrame(count);
    })();

    // belt, and braces
    setTimeout(lift, 4200);
    setTimeout(function () {
      if (loader) loader.classList.add('is-out', 'is-done');
      doc.body.style.overflow = '';
      openHero();
    }, 7000);
  }

  /* ── hero slideshow ──────────────────────────────────────
     Slow crossfade between campaign frames. No transform, no
     filter: the frames are left exactly as shot. */

  var slides = $$('.hero__slide');
  if (slides.length > 1 && !reduced) {
    var si = 0;
    setInterval(function () {
      if (doc.hidden) return;
      slides[si].classList.remove('is-on');
      si = (si + 1) % slides.length;
      slides[si].classList.add('is-on');
    }, 6200);
  }

  /* ── scroll driven: top bar, progress, parallax, rail ──── */

  var top = $('#top-bar');
  var bar = $('.progress span');
  var parallax = $$('[data-parallax]');
  var marqueeTrack = $('.marquee__track');

  var rail = $('#rail');
  var railTrack = $('#railTrack');
  var railBar = $('#railBar');
  var railIdx = $('#railIdx');
  var railCount = railTrack ? $$('.gal', railTrack).length : 0;
  var railRange = 0;

  // How far the track has to travel: its full width minus one viewport.
  // Remeasured on resize and after images load, since both change the width.
  function measureRail() {
    if (!railTrack || window.innerWidth <= 900) { railRange = 0; return; }
    railRange = Math.max(0, railTrack.scrollWidth - window.innerWidth);
  }

  var lastY = window.scrollY;
  var marqueeX = 0;
  var velocity = 0;
  var ticking = false;

  function limit() {
    return Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
  }

  function lightWords() {
    if (!words.length || !manifesto) return;
    var r = manifesto.getBoundingClientRect();
    var vh = window.innerHeight;
    // 0 when the block's top sits at 78% of the viewport, 1 once its bottom
    // has climbed past 45%
    var span = Math.max(1, r.height + vh * 0.33);
    var p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / span));

    var lit = Math.round(p * words.length);
    for (var i = 0; i < words.length; i++) {
      words[i].classList.toggle('is-lit', i < lit);
    }
  }

  function frame() {
    ticking = false;
    var y = window.scrollY;

    if (top) {
      top.classList.toggle('is-stuck', y > 40);
      // get out of the way going down, come back going up
      top.classList.toggle('is-hidden', y > 400 && y > lastY);
    }

    if (bar) bar.style.transform = 'scaleX(' + (y / limit()).toFixed(4) + ')';

    sweep();
    lightWords();

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

    if (railRange > 0) {
      var rr = rail.getBoundingClientRect();
      // progress through the tall outer element while the inner one is pinned
      var travel = Math.max(1, rr.height - window.innerHeight);
      var p = Math.min(1, Math.max(0, -rr.top / travel));
      railTrack.style.transform = 'translate3d(' + (-p * railRange).toFixed(1) + 'px,0,0)';
      if (railBar) railBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';

      if (railIdx) {
        // which tile is currently nearest the left edge of the pinned viewport
        var n = Math.min(railCount, Math.floor(p * railCount) + 1);
        var label = n < 10 ? '0' + n : String(n);
        if (railIdx.textContent !== label) railIdx.textContent = label;
      }
    } else if (railTrack) {
      railTrack.style.transform = '';
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
  window.addEventListener('resize', function () { measureRail(); onScroll(); }, { passive: true });
  window.addEventListener('load', function () { measureRail(); onScroll(); });

  // lazy images settle after the observer fires, which changes the track width
  if (railTrack) {
    $$('img', railTrack).forEach(function (im) {
      im.addEventListener('load', function () { measureRail(); onScroll(); }, { once: true });
    });
  }

  measureRail();
  frame();

  /* ── rail: drag to explore ───────────────────────────────
     The track's position is derived from scroll, so a horizontal
     drag is translated back into a vertical scroll rather than
     fighting it. One source of truth for where the rail is. */

  if (rail && fine) {
    var dragging = false;
    var startX = 0;

    rail.addEventListener('pointerdown', function (e) {
      if (railRange <= 0 || e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      rail.classList.add('is-dragging');
      rail.setPointerCapture(e.pointerId);
    });

    rail.addEventListener('pointermove', function (e) {
      if (!dragging || railRange <= 0) return;
      var dx = e.clientX - startX;
      startX = e.clientX;
      var travel = Math.max(1, rail.getBoundingClientRect().height - window.innerHeight);
      window.scrollBy(0, -dx * (travel / railRange));
    });

    var endDrag = function (e) {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('is-dragging');
      try { rail.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    };
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);

    // a drag that ends on an image would otherwise fire the browser's own
    // drag-and-drop, which cancels the pointer stream mid-gesture
    $$('img', rail).forEach(function (im) { im.draggable = false; });
  }

  /* ── ticker: constant drift, pushed by scroll velocity ─── */

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

  /* ══════════════════════════════════════════════════════════
     PRODUCT PAGE
     Size selection writes the order message, so the customer
     never has to type what they want.
     ══════════════════════════════════════════════════════════ */

  var pdp = $('[data-product]');

  function orderText(size) {
    if (!pdp) return '';
    var name = pdp.getAttribute('data-name') || 'a piece';
    var colour = pdp.getAttribute('data-colour');
    return 'Hi VALLORA, I would like the ' + name +
           (colour ? ' in ' + colour : '') +
           (size ? ', size ' + size : '') + '. Is it available?';
  }

  function syncOrder() {
    if (!pdp) return;
    var on = $('.chip.is-on', pdp);
    var size = on ? on.getAttribute('data-size') : '';

    var wa = $('[data-order-wa]', pdp);
    if (wa) {
      var m = (wa.getAttribute('href') || '').match(/wa\.me\/(\d+)/);
      var num = waNumber() || (m ? m[1] : '');
      if (num) wa.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(orderText(size));
    }

    // the review form asks which size they bought, so preselect it
    var sizeField = $('.rform select[name="size"]');
    if (sizeField && size) sizeField.value = size;
  }

  if (pdp) {
    $$('.chip', pdp).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var group = chip.parentNode;
        $$('.chip', group).forEach(function (c) {
          c.classList.toggle('is-on', c === chip);
          c.setAttribute('aria-pressed', String(c === chip));
        });
        syncOrder();
      });
    });
    syncOrder();
  }

  /* ══════════════════════════════════════════════════════════
     REVIEWS
     Talks to Supabase over PostgREST directly, no SDK. Until
     config.js has a url and an anon key, the list stays hidden
     and the offline block (send it over DM) is what shows, so
     there is always a way to leave one.

     Everything a customer wrote is inserted with textContent.
     Never innerHTML: this is the one place on the site where a
     stranger supplies the string.
     ══════════════════════════════════════════════════════════ */

  var reviewBox = $('[data-reviews]');

  function sbFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      apikey: SB.anonKey,
      Authorization: 'Bearer ' + SB.anonKey,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    return fetch(SB.url.replace(/\/+$/, '') + '/rest/v1/' + path, opts);
  }

  function stars(n) {
    var el = doc.createElement('span');
    el.className = 'review__stars';
    el.setAttribute('aria-label', n + ' out of 5');
    for (var i = 1; i <= 5; i++) {
      var s = doc.createElement('span');
      s.textContent = '◆';
      if (i <= n) s.style.opacity = '1';
      el.appendChild(s);
    }
    return el;
  }

  function renderReviews(list) {
    var grid = $('[data-review-list]');
    var empty = $('[data-review-empty]');
    var count = $('[data-review-count]');
    if (!grid) return;

    grid.textContent = '';

    if (!list.length) {
      if (empty) empty.hidden = false;
      if (count) count.textContent = '';
      return;
    }
    if (empty) empty.hidden = true;
    if (count) count.textContent = list.length === 1 ? '1 review' : list.length + ' reviews';

    list.forEach(function (r) {
      var fig = doc.createElement('figure');
      fig.className = 'review';

      if (r.rating) fig.appendChild(stars(r.rating));

      var q = doc.createElement('blockquote');
      q.textContent = r.body;
      fig.appendChild(q);

      var cap = doc.createElement('figcaption');
      cap.textContent = [r.name, r.city, r.size ? 'size ' + r.size : '']
        .filter(Boolean).join(' . ');
      fig.appendChild(cap);

      grid.appendChild(fig);
    });
  }

  function loadReviews(slug) {
    if (!sbReady) return;
    sbFetch('reviews?select=name,city,size,rating,body&product=eq.' +
            encodeURIComponent(slug) + '&approved=eq.true&order=created_at.desc&limit=60')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(renderReviews)
      .catch(function () { /* the offline block is already on screen */ });
  }

  if (reviewBox) {
    var slug = reviewBox.getAttribute('data-reviews');
    var form = $('[data-review-form]');
    var offline = $('[data-review-offline]');

    var listWrap = $('[data-review-listwrap]');

    // The markup's default state is the offline one: form and list hidden,
    // the DM route showing. That way a visitor with scripting off, or with
    // config.js not yet filled in, still sees a way to leave a review rather
    // than an empty box that never fills.
    if (sbReady) {
      if (form) form.hidden = false;
      if (offline) offline.hidden = true;
      if (listWrap) listWrap.hidden = false;
      loadReviews(slug);
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!sbReady) return;

        var msg = $('[data-review-msg]', form);
        var btn = $('button[type="submit"]', form);
        var say = function (text) {
          if (!msg) return;
          msg.textContent = text;
          msg.hidden = false;
        };

        // honeypot: a real person never fills a field they cannot see
        if (form.elements.website && form.elements.website.value) {
          say('Thanks, that has been sent.');
          form.reset();
          return;
        }

        var payload = {
          product: slug,
          name: (form.elements.name.value || '').trim(),
          city: (form.elements.city.value || '').trim() || null,
          size: form.elements.size.value || null,
          rating: parseInt(form.elements.rating.value, 10),
          body: (form.elements.body.value || '').trim()
        };

        if (payload.name.length < 2 || payload.body.length < 10) {
          say('A name and at least a sentence, please.');
          return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Sending'; }

        sbFetch('reviews', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(payload)
        }).then(function (r) {
          if (btn) { btn.disabled = false; btn.textContent = 'Send review'; }
          if (r.ok) {
            form.reset();
            say('Thank you. Your review goes up once we have read it.');
          } else {
            say('That did not send. Try again, or send it to us on Instagram.');
          }
        }).catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send review'; }
          say('That did not send. Try again, or send it to us on Instagram.');
        });
      });
    }
  }

  /* ── custom cursor ───────────────────────────────────── */

  if (fine && !reduced) {
    var cur = $('.cursor');
    if (cur) {
      var dot = $('.cursor__dot', cur);
      var ring = $('.cursor__ring', cur);
      var label = $('.cursor__label', cur);

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

      var LABELS = { view: 'Drag', open: 'Open', look: 'Look' };

      $$('a, button, [data-cursor]').forEach(function (el) {
        var mode = el.getAttribute('data-cursor');
        el.addEventListener('mouseenter', function () {
          if (mode && LABELS[mode]) { cur.classList.add('is-view'); label.textContent = LABELS[mode]; }
          else cur.classList.add('is-hover');
        });
        el.addEventListener('mouseleave', function () {
          cur.classList.remove('is-hover', 'is-view');
        });
      });
    }
  }

  /* ── magnetic buttons ────────────────────────────────── */

  if (fine && !reduced) {
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + x * 0.2 + 'px,' + y * 0.28 + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  }

  /* ── nav link roll ───────────────────────────────────── */

  $$('.nav__links a span').forEach(function (s) {
    s.setAttribute('data-label', s.textContent);
    s.style.position = 'relative';
  });

  /* ── mobile menu ─────────────────────────────────────── */

  var burger = $('#burger');
  var menu = $('#mobileMenu');

  if (burger && menu) {
    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      doc.body.classList.toggle('is-locked', open);

      if (open) {
        menu.hidden = false;
        // let the element paint before transitioning opacity
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
      } else {
        menu.classList.remove('is-open');
        var settled = false;
        var done2 = function () { if (settled) return; settled = true; menu.hidden = true; };
        menu.addEventListener('transitionend', done2, { once: true });
        // fallback in case the transition never fires (reduced motion, hidden tab)
        setTimeout(done2, 450);
      }
    };

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setMenu(false);
    });

    doc.addEventListener('keydown', function (e) {
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
  }

  /* ── misc ────────────────────────────────────────────── */

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* The footer wordmark has to run edge to edge on any viewport, and no vw
     value does that across font loads and breakpoints. Measure the glyphs at a
     known size, then scale to the line. Re-run once the webfont lands, since
     the fallback metrics are not the real ones. */
  var mark = $('.footer__mark');
  var markText = mark ? $('span', mark) : null;

  function fitMark() {
    if (!mark || !markText) return;
    var cs = getComputedStyle(mark);
    var box = mark.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (box <= 0) return;
    markText.style.fontSize = '100px';
    var w = markText.getBoundingClientRect().width;
    if (w > 0) markText.style.fontSize = (100 * box / w).toFixed(2) + 'px';
  }

  fitMark();
  window.addEventListener('resize', fitMark, { passive: true });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitMark).catch(function () { /* fallback size stands */ });

  // studio time, so the footer says there is someone at the other end
  var clock = $('#clock');
  function tickClock() {
    if (!clock) return;
    try {
      clock.textContent = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit'
      }).format(new Date());
    } catch (e) {
      clock.textContent = new Date().toTimeString().slice(0, 5);
    }
  }
  tickClock();
  setInterval(tickClock, 30000);

  // tells the head watchdog that enhancement succeeded, so it leaves `js` on
  window.__valloraReady = true;
})();
